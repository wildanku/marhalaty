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

    public function __construct(private Rsvp $rsvp)
    {
        // Make queued job serializable
    }

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
            $event = $this->rsvp->event;
            $eventDate = $event->event_date 
                ? \Carbon\Carbon::parse($event->event_date)->format('d M Y H:i') 
                : 'TBD';

            // Build HTML email
            $htmlContent = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; border-radius: 5px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; margin-top: 20px; }
        .event-details { background: white; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Pendaftaran Dikonfirmasi</h1>
        </div>
        <div class="content">
            <p>Halo <strong>{$this->escapeHtml($recipient->name)}</strong>,</p>
            <p>Selamat! Pendaftaran Anda untuk acara berikut telah <strong>dikonfirmasi</strong>:</p>
            
            <div class="event-details">
                <h3>{$this->escapeHtml($event->title)}</h3>
                <p><strong>📅 Tanggal:</strong> {$eventDate}</p>
                <p><strong>📍 Lokasi:</strong> {$this->escapeHtml($event->location ?? 'TBD')}</p>
                <p><strong>👤 Peserta:</strong> {$this->escapeHtml($recipient->name)}</p>
                <p><strong>✔️ Status:</strong> <span style="color: #28a745;">Terkonfirmasi</span></p>
            </div>

            <p>Calendar invite (.ics file) telah terlampir. Anda dapat langsung menambahkannya ke kalender Anda.</p>
            
            <p><strong>📞 Pertanyaan?</strong></p>
            <p>Jika Anda memiliki pertanyaan atau memerlukan bantuan, jangan ragu untuk menghubungi kami.</p>
            
            <center>
                <a href="{url('/events/' . $event->slug)}" class="button">Lihat Detail Acara</a>
            </center>

            <div class="footer">
                <p>Email ini dikirim ke {$this->escapeHtml($recipient->email)}</p>
                <p>© {date('Y')} Marhalaty. Semua hak cipta dilindungi.</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;

            // Send via Brevo API
            $result = $brevoApi->send(
                toEmail: $recipient->email,
                toName: $recipient->name,
                subject: "✅ Pendaftaran Dikonfirmasi - {$event->title}",
                htmlContent: $htmlContent,
            );

            if ($result['success']) {
                Log::info('SendEventRegistrationConfirmedEmail: Email sent successfully', [
                    'rsvp_id' => $this->rsvp->id,
                    'email' => $recipient->email,
                    'message_id' => $result['message_id'] ?? null,
                ]);
            } else {
                Log::error('SendEventRegistrationConfirmedEmail: Brevo API error', [
                    'rsvp_id' => $this->rsvp->id,
                    'error' => $result['error'] ?? 'Unknown error',
                ]);
                // Rethrow to mark job as failed
                throw new \Exception($result['error'] ?? 'Brevo API error');
            }
        } catch (\Exception $e) {
            Log::error('SendEventRegistrationConfirmedEmail: Exception', [
                'rsvp_id' => $this->rsvp->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
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
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Escape HTML entities for safe email display.
     */
    private function escapeHtml(string $text): string
    {
        return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    }
}
