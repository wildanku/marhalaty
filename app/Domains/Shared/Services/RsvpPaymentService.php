<?php

namespace App\Domains\Shared\Services;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Jobs\SendEventRegistrationConfirmedEmail;

/**
 * The `Rsvp` side of the Satutera webhook router (fase 9, D34). Deliberately thin compared to
 * `App\Domains\Store\Services\OrderFulfillmentService` — an RSVP only needs its status mirrored and
 * a confirmation email; `event_packages.booked_count` is already handled by the existing
 * `RsvpObserver` (fires on any `Rsvp::update(['status' => ...])`, including this one).
 */
class RsvpPaymentService
{
    public function __construct(private SatuteraPaymentInitiator $satuteraInitiator) {}

    /**
     * `rsvps.status` is a DB enum of `pending`/`paid`/`expired`/`failed` — it has no `cancelled`
     * value, so a Satutera `cancelled` status (meaningful for store orders) maps to `failed` here,
     * the closest existing terminal state.
     */
    private const STATUS_MAP = [
        'paid' => 'paid',
        'failed' => 'failed',
        'expired' => 'expired',
        'cancelled' => 'failed',
    ];

    public function handle(Rsvp $rsvp, string $status): void
    {
        $mapped = self::STATUS_MAP[$status] ?? null;

        if ($mapped === null) {
            // e.g. Satutera's own internal 'pending' — nothing to mirror.
            return;
        }

        // Idempotent: the caller (SatuteraWebhookController) already skips already-paid
        // transactions before reaching here, but this guards against any other path that might
        // call in with a stale/duplicate event.
        if ($rsvp->status === 'paid') {
            return;
        }

        $rsvp->update(['status' => $mapped]);

        if ($mapped === 'paid') {
            $rsvp->load(['event', 'user', 'package']);

            if ($rsvp->user && $rsvp->user->email) {
                SendEventRegistrationConfirmedEmail::dispatch($rsvp);
            }
        }

        // Fase 8 note: releasing any linked product_reservations for a failed/expired/cancelled
        // RSVP is NOT this service's job — RsvpObserver::updating() already calls
        // ProductStockService::releaseFor($rsvp) for any status transition into 'expired'/'failed'
        // (fires on the $rsvp->update() above too, since it's a normal Eloquent update). Do not
        // duplicate that call here.
    }

    /**
     * Called from the payment page when a previous registration left the transaction without a
     * `checkout_token` (e.g. Satutera was unreachable/erroring at registration time). Reuses the
     * same deterministic Idempotency-Key as the original attempt, so if that attempt actually
     * succeeded on Satutera's side despite us losing the response, this safely fetches the
     * existing payment instead of creating a duplicate. Mirrors
     * `App\Domains\Store\Services\CheckoutService::retryPaymentInitiation()`.
     */
    public function retryPaymentInitiation(Rsvp $rsvp, Transaction $transaction): void
    {
        if ($transaction->checkout_token !== null || $transaction->status !== 'pending') {
            return;
        }

        $request = $transaction->metadata['payment_request'] ?? null;

        if (! $request) {
            return;
        }

        $rsvp->loadMissing('user');
        $user = $rsvp->user;

        $this->satuteraInitiator->initiate($transaction, [
            'client_transaction_id' => "rsvp-{$rsvp->id}",
            'idempotency_key' => "rsvp-{$rsvp->id}-{$transaction->id}",
            'provider' => $request['channel_provider'],
            'payment_method' => $request['payment_method'],
            'payment_channel' => $request['payment_channel'],
            'customer' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone_number,
            ],
            'items' => $request['items'],
            'client_redirect' => [
                'success_url' => route('payment.show', $transaction->payment_hash),
                'failed_url' => route('payment.show', $transaction->payment_hash),
                'expired_url' => route('payment.show', $transaction->payment_hash),
            ],
            'metadata' => ['rsvp_id' => $rsvp->id, 'event_id' => $rsvp->event_id],
        ]);
    }
}
