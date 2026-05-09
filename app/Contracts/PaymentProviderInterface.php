<?php

namespace App\Contracts;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use Illuminate\Http\Request;

interface PaymentProviderInterface
{
    /**
     * Initiate a payment and return provider-specific data.
     *
     * @param  Transaction  $transaction
     * @param  Rsvp         $rsvp
     * @return array{payment_url: string|null, external_reference: string|null, va_number: string|null}
     *
     * @throws \Exception on provider error
     */
    public function initiatePayment(Transaction $transaction, Rsvp $rsvp): array;

    /**
     * Parse an incoming provider webhook request into a normalised array.
     *
     * @param  Request $request
     * @return array{external_reference: string, status: string, reference_id: string}
     */
    public function parseWebhook(Request $request): array;

    /**
     * Verify the authenticity / integrity of an incoming webhook request.
     */
    public function verifyWebhook(Request $request): bool;
}
