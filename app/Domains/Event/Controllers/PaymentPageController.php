<?php

namespace App\Domains\Event\Controllers;

use App\Domains\Event\Models\PaymentProof;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\PaymentSettingsService;
use App\Domains\Shared\Services\RsvpPaymentService;
use App\Domains\Shared\Services\TelegramService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * Hash-based public payment pages.
 * Accessible without auth — the hash acts as the access token.
 */
class PaymentPageController extends Controller
{
    public function __construct(
        private readonly TelegramService $telegram,
        private readonly PaymentSettingsService $paymentSettings,
        private readonly RsvpPaymentService $rsvpPayment,
    ) {}

    /**
     * GET /payment/{hash}
     * Show payment details: VA / QRIS info for Satutera/iPaymu, or bank info for manual. This page
     * deliberately serves all three providers (fase 9, D34/§3 table) — never add a provider filter
     * here the way the store payment page does.
     */
    public function show(string $hash)
    {
        $transaction = Transaction::with(['rsvp.event', 'rsvp.package', 'rsvp.user', 'proof'])
            ->where('payment_hash', $hash)
            ->firstOrFail();

        // Payment creation can fail at registration time (Satutera unreachable, timeout, ...),
        // leaving the transaction without a checkout_token. Retry it here so opening/refreshing
        // the payment page is enough to recover, instead of stranding the registrant with no way
        // forward — mirrors `Store\StorePaymentPageController::show()`. No-ops for manual/ipaymu
        // transactions (no `payment_request` in metadata to retry).
        if ($transaction->payment_provider === 'satutera' && $transaction->rsvp) {
            $this->rsvpPayment->retryPaymentInitiation($transaction->rsvp, $transaction);
            $transaction->refresh()->load('proof');
        }

        $bankAccounts = $this->paymentSettings->manualAccounts();

        return Inertia::render('Payment/PaymentPage', [
            'transaction' => $transaction,
            'rsvp' => $transaction->rsvp,
            'event' => $transaction->rsvp->event,
            'bankAccounts' => $bankAccounts,
            // Harmless/null for manual and ipaymu transactions — only meaningful when
            // payment_provider === 'satutera'. See Components/Payment/SatuteraPanel.tsx.
            'checkoutToken' => $transaction->checkout_token,
            'expiresAt' => $transaction->expired_at,
            'satuteraWsUrl' => config('services.satutera.base_url'),
            'hash' => $hash,
        ]);
    }

    /**
     * GET /payment/{hash}/status — JSON polling fallback, same response shape as
     * `Store\StorePaymentPageController::status()` since both feed the same shared panel.
     */
    public function status(string $hash)
    {
        $transaction = Transaction::where('payment_hash', $hash)->firstOrFail();

        return response()->json([
            'status' => $transaction->status,
            'paid_at' => $transaction->paid_at,
            'expires_at' => $transaction->expired_at,
        ]);
    }

    /**
     * Serve a proof through the payment hash, which is the public payment page's access token.
     */
    public function proof(string $hash)
    {
        $transaction = Transaction::with('proof')
            ->where('payment_hash', $hash)
            ->firstOrFail();

        $proof = $transaction->proof;

        abort_unless($proof && Storage::disk('public')->exists($proof->file_path), 404);

        return Storage::disk('public')->response(
            $proof->file_path,
            $proof->original_name,
            [],
            'inline',
        );
    }

    /**
     * GET /payment-confirmation/{hash}
     * Show proof upload page (manual transfer only).
     */
    public function confirmationShow(string $hash)
    {
        $transaction = Transaction::with(['rsvp.event', 'rsvp.user', 'proof'])
            ->where('payment_hash', $hash)
            ->firstOrFail();

        return Inertia::render('Payment/ConfirmationPage', [
            'transaction' => $transaction,
            'rsvp' => $transaction->rsvp,
            'event' => $transaction->rsvp->event,
            'hash' => $hash,
        ]);
    }

    /**
     * POST /payment-confirmation/{hash}
     * Accept proof file upload.
     */
    public function confirmationStore(Request $request, string $hash)
    {
        $transaction = Transaction::with(['rsvp', 'proof'])
            ->where('payment_hash', $hash)
            ->firstOrFail();

        if ($transaction->payment_provider !== 'manual') {
            abort(422, 'Bukti hanya diperlukan untuk transfer manual.');
        }

        if ($transaction->status === 'paid') {
            return back()->with('info', 'Pembayaran sudah terkonfirmasi.');
        }

        $request->validate([
            'proof' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048',
            'notes' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $transaction) {
            // Delete previous proof if exists
            if ($transaction->proof) {
                Storage::disk('public')->delete($transaction->proof->file_path);
                $transaction->proof->delete();
            }

            $file = $request->file('proof');
            $path = $file->store("payment-proofs/{$transaction->id}", 'public');

            PaymentProof::create([
                'transaction_id' => $transaction->id,
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'notes' => $request->input('notes'),
            ]);

            Log::info('Payment proof uploaded via hash URL', [
                'transaction_id' => $transaction->id,
                'hash' => $transaction->payment_hash,
            ]);

            // Notify admin Telegram channel with proof image
            $transaction->refresh()->load(['rsvp.event', 'user', 'proof']);
            $this->telegram->notifyPaymentProof($transaction);
        });

        return redirect('/payment/'.$hash)->with('success', 'Bukti pembayaran berhasil diunggah. Admin akan memverifikasi segera.');
    }
}
