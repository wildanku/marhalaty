<?php

namespace App\Domains\Shared\Controllers;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\RsvpPaymentService;
use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Services\OrderFulfillmentService;
use App\Http\Controllers\Controller;
use App\Models\PaymentWebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Moved from `App\Domains\Store\Controllers` (fase 9, D34) — this now serves both store orders and
 * event RSVPs, so it lives in Shared. URL and route name are unchanged on purpose
 * (`POST /webhooks/satutera/payment`, `webhooks.satutera.payment`) so Satutera's own callback
 * configuration never needs touching.
 */
class SatuteraWebhookController extends Controller
{
    public function __construct(
        private SatuteraPaymentService $satutera,
        private OrderFulfillmentService $fulfillment,
        private RsvpPaymentService $rsvpPayments,
    ) {}

    /**
     * POST /webhooks/satutera/payment — CSRF-exempt, verified by HMAC signature instead.
     * This is the fulfillment source of truth (never the socket event or a browser redirect).
     *
     * D39: this handler never checks whether the `satutera` gateway is currently `is_enabled` in
     * god-mode — a toggle only filters which gateway a buyer can *pick* at registration/checkout
     * time. A payment already in flight (VA issued, QRIS shown) must still be completable and its
     * callback processed even if an admin switches Satutera off in the meantime.
     */
    public function handle(Request $request)
    {
        $raw = $request->getContent();

        if (! $this->satutera->verifyCallbackSignature(
            $raw,
            $request->header('X-Satutera-Timestamp'),
            $request->header('X-Satutera-Signature'),
        )) {
            Log::warning('Satutera callback signature invalid', ['ip' => $request->ip()]);

            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $payload = json_decode($raw, true);

        if (! is_array($payload) || empty($payload['payment_id']) || empty($payload['event'])) {
            Log::warning('Satutera callback malformed payload', ['ip' => $request->ip()]);

            return response()->json(['message' => 'Malformed payload'], 400);
        }

        DB::transaction(function () use ($payload, $raw) {
            $event = PaymentWebhookEvent::firstOrCreate(
                ['provider' => 'satutera', 'payment_id' => $payload['payment_id'], 'event_type' => $payload['event']],
                ['body_hash' => hash('sha256', $raw), 'payload' => $payload],
            );

            if ($event->processed_at !== null) {
                return;
            }

            $transaction = Transaction::where('external_reference', $payload['payment_id'])
                ->where('payment_provider', 'satutera')
                ->lockForUpdate()
                ->first();

            if (! $transaction) {
                Log::warning('Satutera callback: transaction not found', ['payment_id' => $payload['payment_id']]);

                return;
            }

            // Not just `=== 'paid'`: a manual status override (fase 11, D50 — e.g. an admin
            // cancelling an order and voiding its transaction) can also move a transaction off
            // `pending` before this callback arrives. Whatever it moved to, this late callback
            // must not re-process it — otherwise a callback for an order the seller already
            // cancelled could resurrect it as paid.
            if ($transaction->status !== 'pending') {
                $event->update(['processed_at' => now()]);

                return;
            }

            // Never trust the payload's amount blindly — a mismatch (e.g. order edited after
            // payment creation) must block fulfillment for manual review rather than mark an
            // order paid with the wrong amount collected. Compare against amount-excluding-fee:
            // that's what we actually sent as `amount` when creating the payment (Satutera echoes
            // it back verbatim in the callback and adds its own channel fee on top — see
            // Shared\Services\SatuteraPaymentInitiator::initiate()).
            $expectedAmount = (int) round((float) $transaction->amount - (float) $transaction->payment_fee);

            if ((int) ($payload['amount'] ?? 0) !== $expectedAmount) {
                Log::error('Satutera callback amount mismatch', [
                    'payment_id' => $payload['payment_id'],
                    'transaction_id' => $transaction->id,
                    'payload_amount' => $payload['amount'] ?? null,
                    'expected_amount' => $expectedAmount,
                    'transaction_amount' => $transaction->amount,
                    'payment_fee' => $transaction->payment_fee,
                ]);

                return;
            }

            $status = $payload['status'] ?? 'pending';

            $transaction->update([
                'status' => $status,
                'paid_at' => $status === 'paid' ? now() : null,
                'metadata' => array_merge($transaction->metadata ?? [], ['callback' => $payload]),
            ]);

            // D34: verification/idempotency/amount-check stay in one place; only the fulfillment
            // *effect* branches on what this transaction actually pays for.
            $payable = $transaction->payable;

            match (true) {
                $payable instanceof StoreOrder => $this->handleStoreOrder($payable, $status),
                $payable instanceof Rsvp => $this->rsvpPayments->handle($payable, $status),
                default => Log::warning('Satutera callback: transaction has no resolvable payable', [
                    'transaction_id' => $transaction->id,
                    'payable_type' => $transaction->payable_type,
                    'payable_id' => $transaction->payable_id,
                ]),
            };

            $event->update(['processed_at' => now()]);
        });

        return response()->json(['message' => 'OK']);
    }

    private function handleStoreOrder(StoreOrder $order, string $status): void
    {
        if ($status === 'paid') {
            $order->update(['status' => 'paid', 'paid_at' => now()]);
            $this->fulfillment->onPaid($order);
        } elseif (in_array($status, ['expired', 'failed', 'cancelled'], true)) {
            $order->update(['status' => $status === 'expired' ? 'expired' : 'cancelled', 'cancelled_at' => now()]);
            $this->fulfillment->releaseStock($order);
        }
    }
}
