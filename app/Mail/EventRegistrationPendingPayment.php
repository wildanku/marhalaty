<?php

namespace App\Mail;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\PaymentSettingsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent after a user registers for a PAID event.
 * Contains payment instructions (bank accounts / iPaymu link).
 */
class EventRegistrationPendingPayment extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Rsvp $rsvp,
        public readonly Transaction $transaction,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Segera Selesaikan Pembayaran – '.$this->rsvp->event->title,
        );
    }

    public function content(): Content
    {
        $bankAccounts = app(PaymentSettingsService::class)->manualAccounts();

        return new Content(
            view: 'emails.event-registration-payment',
            with: [
                'rsvp' => $this->rsvp->load(['event', 'user', 'package']),
                'transaction' => $this->transaction,
                'bankAccounts' => $bankAccounts,
            ],
        );
    }
}
