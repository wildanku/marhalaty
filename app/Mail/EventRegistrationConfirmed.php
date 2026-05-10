<?php

namespace App\Mail;

use App\Domains\Event\Models\Rsvp;
use App\Services\CalendarService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when:
 *  (a) A free event RSVP is created (immediately), OR
 *  (b) A paid event's manual payment is approved by admin.
 *
 * Includes a .ics calendar invitation attachment.
 */
class EventRegistrationConfirmed extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Rsvp $rsvp,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ Pendaftaran Dikonfirmasi – ' . $this->rsvp->event->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.event-registration-confirmed',
            with: [
                'rsvp'  => $this->rsvp->load(['event', 'user', 'package']),
                'event' => $this->rsvp->event,
                'user'  => $this->rsvp->user,
            ],
        );
    }

    /** @return array<Attachment> */
    public function attachments(): array
    {
        $calendar = app(CalendarService::class);
        $ics      = $calendar->generateIcs($this->rsvp->event, $this->rsvp);

        return [
            Attachment::fromData(fn () => $ics, 'undangan-' . $this->rsvp->event->slug . '.ics')
                ->withMime('text/calendar'),
        ];
    }
}
