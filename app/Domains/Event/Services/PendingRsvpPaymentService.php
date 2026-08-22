<?php

namespace App\Domains\Event\Services;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\PaymentSettingsService;
use App\Domains\Shared\Services\RsvpPaymentService;
use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Jobs\SendEventRegistrationPendingPaymentEmail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reissues the payment instructions for an existing, unpaid RSVP without touching its event,
 * package, addon snapshot, or stock reservations. Only the latest payment transaction changes.
 */
class PendingRsvpPaymentService
{
    public function __construct(
        private readonly PaymentSettingsService $paymentSettings,
        private readonly SatuteraPaymentService $satutera,
        private readonly RsvpPaymentService $rsvpPayment,
    ) {}

    /**
     * @param  array{payment_provider: 'manual'|'satutera', channel_provider?: string|null, payment_method?: string|null, payment_channel?: string|null}  $data
     */
    public function replace(Rsvp $rsvp, User $user, array $data): Transaction
    {
        $provider = $data['payment_provider'];
        $this->assertProviderIsEnabled($provider);

        $channel = $provider === 'satutera' ? $this->resolveChannel($data) : null;

        if ($provider === 'satutera'
            && (float) $rsvp->total_amount > 0
            && (float) $rsvp->total_amount < (float) config('payments.qris_only_below_amount')
            && $channel['method'] !== 'qris') {
            throw ValidationException::withMessages([
                'payment_channel' => 'Untuk nominal ini, hanya QRIS yang tersedia.',
            ]);
        }

        $transaction = DB::transaction(function () use ($rsvp, $user, $data, $provider, $channel): Transaction {
            $lockedRsvp = Rsvp::query()
                ->with(['event', 'package', 'user'])
                ->whereKey($rsvp->getKey())
                ->where('user_id', $user->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRsvp->status !== 'pending') {
                throw ValidationException::withMessages([
                    'payment_provider' => 'Hanya pendaftaran yang belum dibayar yang dapat diubah metode pembayarannya.',
                ]);
            }

            $pendingTransactions = $lockedRsvp->transactions()
                ->with('proof')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->get();

            if ($pendingTransactions->contains(fn (Transaction $transaction): bool => $transaction->proof !== null)) {
                throw ValidationException::withMessages([
                    'payment_provider' => 'Bukti transfer sudah diunggah dan sedang menunggu verifikasi. Hubungi admin untuk bantuan.',
                ]);
            }

            $latest = $pendingTransactions->sortByDesc('created_at')->first();

            if ($latest && $this->isReusable($latest, $data)) {
                return $latest;
            }

            $paymentFee = $channel === null
                ? 0
                : $this->satutera->resolveFee($channel, (int) round((float) $lockedRsvp->total_amount));

            $transaction = Transaction::create([
                'rsvp_id' => $lockedRsvp->getKey(),
                'user_id' => $user->getKey(),
                'amount' => (float) $lockedRsvp->total_amount + $paymentFee,
                'payment_fee' => $paymentFee,
                'payment_provider' => $provider,
                'payment_channel' => $provider === 'satutera' ? $data['payment_channel'] : null,
                'status' => 'pending',
                ...($provider === 'satutera' ? [
                    'payable_type' => Rsvp::class,
                    'payable_id' => (string) $lockedRsvp->getKey(),
                    'metadata' => [
                        'payment_request' => [
                            'channel_provider' => $data['channel_provider'],
                            'payment_method' => $data['payment_method'],
                            'payment_channel' => $data['payment_channel'],
                            'items' => $this->paymentItems($lockedRsvp),
                        ],
                    ],
                ] : []),
            ]);

            foreach ($pendingTransactions as $pendingTransaction) {
                $pendingTransaction->update([
                    'status' => 'cancelled',
                    'metadata' => array_merge($pendingTransaction->metadata ?? [], [
                        'superseded_by_transaction_id' => $transaction->getKey(),
                        'superseded_at' => now()->toIso8601String(),
                    ]),
                ]);
            }

            return $transaction;
        });

        $transaction->loadMissing(['rsvp.event', 'rsvp.package', 'rsvp.user']);
        $transactionRsvp = $transaction->rsvp;

        if ($transactionRsvp === null) {
            throw new \LogicException('Transaksi RSVP tidak memiliki pendaftaran yang terkait.');
        }

        if ($transaction->payment_provider === 'satutera') {
            $this->rsvpPayment->retryPaymentInitiation($transactionRsvp, $transaction);
            $transaction->refresh();
        }

        SendEventRegistrationPendingPaymentEmail::dispatch($transactionRsvp, $transaction);

        return $transaction;
    }

    /**
     * @param  array{payment_provider: 'manual'|'satutera', channel_provider?: string|null, payment_method?: string|null, payment_channel?: string|null}  $data
     */
    private function isReusable(Transaction $transaction, array $data): bool
    {
        if ($transaction->payment_provider !== $data['payment_provider']) {
            return false;
        }

        if ($transaction->expired_at !== null && $transaction->expired_at->isPast()) {
            return false;
        }

        if ($data['payment_provider'] === 'manual') {
            return true;
        }

        $metadata = is_array($transaction->metadata) ? $transaction->metadata : [];
        $request = is_array($metadata['payment_request'] ?? null) ? $metadata['payment_request'] : [];

        return ($request['channel_provider'] ?? null) === $data['channel_provider']
            && ($request['payment_method'] ?? null) === $data['payment_method']
            && ($request['payment_channel'] ?? null) === $data['payment_channel'];
    }

    /**
     * @param  array{payment_provider: 'manual'|'satutera', channel_provider?: string|null, payment_method?: string|null, payment_channel?: string|null}  $data
     * @return array{provider: string, method: string, code: string, fee?: float|int|string, fee_type?: string}
     */
    private function resolveChannel(array $data): array
    {
        $channel = $this->satutera->findChannel(
            (string) $data['channel_provider'],
            (string) $data['payment_method'],
            (string) $data['payment_channel'],
        );

        if ($channel === null) {
            throw ValidationException::withMessages([
                'payment_channel' => 'Metode pembayaran otomatis tidak tersedia. Pilih metode lain.',
            ]);
        }

        return $channel;
    }

    private function assertProviderIsEnabled(string $provider): void
    {
        if (! $this->paymentSettings->isEnabled($provider, 'event')) {
            throw ValidationException::withMessages([
                'payment_provider' => 'Metode pembayaran ini sedang tidak tersedia.',
            ]);
        }
    }

    /**
     * Rebuild the immutable line items from the RSVP snapshot. A replacement payment must never
     * recalculate prices from the live event catalog, because event/package/addon prices may have
     * changed since the user registered.
     *
     * @return array<int, array{name: string, price: int, quantity: int}>
     */
    private function paymentItems(Rsvp $rsvp): array
    {
        $items = [];

        if ((float) $rsvp->package_amount > 0 && $rsvp->package !== null) {
            $items[] = [
                'name' => $rsvp->package->name,
                'price' => (int) round((float) $rsvp->package_amount),
                'quantity' => 1,
            ];
        }

        if ((float) $rsvp->infak_amount > 0) {
            $items[] = [
                'name' => 'Infak',
                'price' => (int) round((float) $rsvp->infak_amount),
                'quantity' => 1,
            ];
        }

        foreach ($rsvp->add_ons_snapshot ?? [] as $addon) {
            if ((float) ($addon['total'] ?? 0) <= 0) {
                continue;
            }

            $items[] = [
                'name' => (string) ($addon['name'] ?? 'Tambahan pendaftaran'),
                'price' => (int) round((float) $addon['total']),
                'quantity' => 1,
            ];
        }

        if ($items === []) {
            $items[] = [
                'name' => "Pendaftaran {$rsvp->event->title}",
                'price' => (int) round((float) $rsvp->total_amount),
                'quantity' => 1,
            ];
        }

        return $items;
    }
}
