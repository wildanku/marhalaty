<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Dummy test email used by GodMode EmailTester panel.
 */
class TestEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $template = 'test',
        public readonly string $note = '',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[TEST] Email dari Marhalaty GodMode',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.test',
            with: [
                'note' => $this->note,
            ],
        );
    }
}
