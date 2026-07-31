<?php

namespace App\Domains\Shared\Services;

use App\Domains\Event\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Builds and sends the Satutera create-payment request for any payable (`StoreOrder` today,
 * `Rsvp` from fase 9c) and writes the response back onto the transaction.
 *
 * Extracted from `App\Domains\Store\Services\CheckoutService::initiateSatuteraPayment()`
 * (docs/plan/mvp2/9-event-payment-satutera.md D35) so the event registration flow can reuse the
 * exact same, already-hardened logic instead of reimplementing it. The caller builds the
 * descriptor (order items, customer, redirect URLs, `idempotency_key`) — this class only knows
 * how to talk to Satutera and write a `Transaction`, never `StoreOrder`/`Rsvp` specifics.
 */
class SatuteraPaymentInitiator
{
    public function __construct(private SatuteraPaymentService $satutera) {}

    /**
     * Never throws — a provider failure must not fail the caller's checkout/registration
     * transaction. The order/RSVP is left `pending_payment`/`pending` with no `checkout_token`,
     * and the payment page retries creation on next visit (see `retryPaymentInitiation()` callers).
     *
     * @param array{
     *   client_transaction_id: string,
     *   idempotency_key: string,
     *   provider: string,
     *   payment_method: string,
     *   payment_channel: string,
     *   customer: array{name: string, email: ?string, phone: ?string},
     *   items: array<int, array{name: string, price: int, quantity: int}>,
     *   client_redirect: array{success_url: string, failed_url: string, expired_url: string},
     *   metadata?: array<string, mixed>,
     * } $descriptor
     */
    public function initiate(Transaction $transaction, array $descriptor): void
    {
        try {
            $payload = [
                'client_id' => config('services.satutera.client_id'),
                'client_transaction_id' => $descriptor['client_transaction_id'],
                // Satutera adds the channel's own fee on top of `amount` to compute the VA/QRIS
                // total (payment-guidance.md §3: request amount excludes fee, response
                // payment_detail.total = amount + fee). transaction->amount already has our
                // payment_fee folded in for local display/bookkeeping, so it must be subtracted
                // back out here — sending it as-is double-charges the fee.
                'amount' => (int) round((float) $transaction->amount - (float) $transaction->payment_fee),
                'currency' => 'IDR',
                'provider' => $descriptor['provider'],
                'payment_method' => $descriptor['payment_method'],
                'payment_channel' => $descriptor['payment_channel'],
                'response_mode' => 'raw_detail',
                'customer' => $descriptor['customer'],
                'items' => $descriptor['items'],
                'client_redirect' => $descriptor['client_redirect'],
                'metadata' => $descriptor['metadata'] ?? [],
            ];

            $response = $this->satutera->createPayment($payload, $descriptor['idempotency_key']);

            // Isolated in its own savepoint so that if this write itself fails (e.g. an
            // unexpectedly long provider field), only this nested transaction rolls back.
            // Postgres aborts the *entire* enclosing transaction on any failed statement, even one
            // caught in PHP — without this savepoint boundary, a caught exception here would
            // otherwise silently poison every later query in the caller's own DB::transaction()
            // (order/RSVP fetches, `fresh()` calls) with "current transaction is aborted".
            DB::transaction(function () use ($transaction, $response) {
                $transaction->update([
                    'external_reference' => $response['payment_id'] ?? null,
                    'checkout_token' => $response['checkout_token'] ?? null,
                    'payment_detail' => $response['payment_detail'] ?? null,
                    'va_number' => $response['payment_detail']['payment_no'] ?? null,
                    'expired_at' => isset($response['expires_at']) ? Carbon::parse($response['expires_at']) : null,
                ]);
            });
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
