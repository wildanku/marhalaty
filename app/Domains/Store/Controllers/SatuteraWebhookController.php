<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Domains\Store\Services\OrderFulfillmentService;
use App\Http\Controllers\Controller;
use App\Models\PaymentWebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SatuteraWebhookController extends Controller
{
    public function __construct(
        private SatuteraPaymentService $satutera,
        private OrderFulfillmentService $fulfillment,
    ) {}

    /**
     * POST /webhooks/satutera/payment — CSRF-exempt, verified by HMAC signature instead.
     * This is the fulfillment source of truth (never the socket event or a browser redirect).
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

            if ($transaction->status === 'paid') {
                $event->update(['processed_at' => now()]);

                return;
            }

            // Never trust the payload's amount blindly — a mismatch (e.g. order edited after
            // payment creation) must block fulfillment for manual review rather than mark an
            // order paid with the wrong amount collected.
            if ((int) ($payload['amount'] ?? 0) !== (int) round((float) $transaction->amount)) {
                Log::error('Satutera callback amount mismatch', [
                    'payment_id' => $payload['payment_id'],
                    'transaction_id' => $transaction->id,
                    'payload_amount' => $payload['amount'] ?? null,
                    'transaction_amount' => $transaction->amount,
                ]);

                return;
            }

            $status = $payload['status'] ?? 'pending';

            $transaction->update([
                'status' => $status,
                'paid_at' => $status === 'paid' ? now() : null,
                'metadata' => array_merge($transaction->metadata ?? [], ['callback' => $payload]),
            ]);

            $order = $transaction->payable;

            if ($order) {
                if ($status === 'paid') {
                    $order->update(['status' => 'paid', 'paid_at' => now()]);
                    $this->fulfillment->onPaid($order);
                } elseif (in_array($status, ['expired', 'failed', 'cancelled'], true)) {
                    $order->update(['status' => $status === 'expired' ? 'expired' : 'cancelled', 'cancelled_at' => now()]);
                    $this->fulfillment->releaseStock($order);
                }
            }

            $event->update(['processed_at' => now()]);
        });

        return response()->json(['message' => 'OK']);
    }
}
