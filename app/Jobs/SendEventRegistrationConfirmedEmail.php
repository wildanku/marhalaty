<?php

namespace App\Jobs;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Shared\Services\BrevoApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queue Job: Send event registration confirmed email via Brevo API
 *
 * Dispatched when:
 * - Free event registration is completed
 * - Payment is verified for paid event
 */
class SendEventRegistrationConfirmedEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private Rsvp $rsvp) {}

    /**
     * Execute the queued job.
     */
    public function handle(BrevoApiService $brevoApi): void
    {
        try {
            $this->rsvp->load(['event', 'user', 'package']);

            if (!$this->rsvp->user || !$this->rsvp->event) {
                Log::warning('SendEventRegistrationConfirmedEmail: Missing user or event', [
                    'rsvp_id' => $this->rsvp->id,
                ]);
                return;
            }

            $recipient = $this->rsvp->user;
            $event     = $this->rsvp->event;

            // Render Blade template
            $htmlContent = view('emails.event-registration-confirmed', [
                'rsvp'  => $this->rsvp,
                'event' => $event,
                'user'  => $recipient,
            ])->render();

            // Send via Brevo API
            $result = $brevoApi->send(
                toEmail: $recipient->email,
                toName: $recipient->name,
                subject: "✅ Pendaftaran Dikonfirmasi – {$event->title}",
                htmlContent: $htmlContent,
            );

            if ($result['success']) {
                Log::info('SendEventRegistrationConfirmedEmail: Email sent successfully', [
                    'rsvp_id'    => $this->rsvp->id,
                    'email'      => $recipient->email,
                    'message_id' => $result['message_id'] ?? null,
                ]);
            } else {
                Log::error('SendEventRegistrationConfirmedEmail: Brevo API error', [
                    'rsvp_id' => $this->rsvp->id,
                    'error'   => $result['error'] ?? 'Unknown error',
                ]);
                throw new \Exception($result['error'] ?? 'Brevo API error');
            }
        } catch (\Exception $e) {
            Log::error('SendEventRegistrationConfirmedEmail: Exception', [
                'rsvp_id' => $this->rsvp->id,
                'error'   => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendEventRegistrationConfirmedEmail: Job failed', [
            'rsvp_id' => $this->rsvp->id,
            'error'   => $exception->getMessage(),
        ]);
    }
}
