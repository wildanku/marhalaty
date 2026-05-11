<?php

namespace App\Jobs;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\BrevoApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queue Job: Send event registration pending payment email via Brevo API
 * 
 * Dispatched when:
 * - User registers for a paid event
 * - Payment instructions need to be sent
 */
class SendEventRegistrationPendingPaymentEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private Rsvp $rsvp,
        private Transaction $transaction
    ) {
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
                Log::warning('SendEventRegistrationPendingPaymentEmail: Missing user or event', [
                    'rsvp_id' => $this->rsvp->id,
                    'transaction_id' => $this->transaction->id,
                ]);
                return;
            }

            $recipient = $this->rsvp->user;
            $event = $this->rsvp->event;
            $amount = $this->transaction->total_amount ?? 0;

            // Build HTML email
            $htmlContent = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff9800; color: white; padding: 20px; border-radius: 5px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; margin-top: 20px; }
        .amount-box { background: white; padding: 15px; border: 2px dashed #ff9800; border-radius: 5px; text-align: center; margin: 20px 0; }
        .amount-label { color: #666; font-size: 14px; }
        .amount-value { font-size: 28px; font-weight: bold; color: #ff9800; }
        .button { display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .highlight { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💳 Konfirmasi Pembayaran Diperlukan</h1>
        </div>
        <div class="content">
            <p>Halo <strong>{$this->escapeHtml($recipient->name)}</strong>,</p>
            <p>Terima kasih telah mendaftar untuk acara <strong>{$this->escapeHtml($event->title)}</strong>.</p>
            <p>Untuk menyelesaikan pendaftaran Anda, kami memerlukan konfirmasi pembayaran sebesar:</p>
            
            <div class="amount-box">
                <div class="amount-label">Jumlah Pembayaran</div>
                <div class="amount-value">Rp {$this->formatCurrency($amount)}</div>
            </div>

            <p><strong>📋 Instruksi Pembayaran:</strong></p>
            <div class="highlight">
                <p>1. Silahkan transfer ke rekening yang telah kami sediakan</p>
                <p>2. Kirimkan bukti pembayaran (screenshot/foto) melalui platform kami</p>
                <p>3. Tim kami akan memverifikasi pembayaran Anda dalam waktu 24 jam</p>
            </div>

            <p><strong>📌 Referensi Pembayaran:</strong> {$this->transaction->id}</p>

            <center>
                <a href="{url('/events/' . $event->slug . '/payment')}" class="button">Lanjutkan Pembayaran</a>
            </center>

            <p style="font-size: 12px; color: #666; margin-top: 20px;">
                Link pembayaran ini akan aktif selama 7 hari. Jika sudah melewati batas waktu, silakan hubungi kami.
            </p>

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
                subject: "💳 Konfirmasi Pembayaran - {$event->title}",
                htmlContent: $htmlContent,
            );

            if ($result['success']) {
                Log::info('SendEventRegistrationPendingPaymentEmail: Email sent successfully', [
                    'rsvp_id' => $this->rsvp->id,
                    'transaction_id' => $this->transaction->id,
                    'email' => $recipient->email,
                    'message_id' => $result['message_id'] ?? null,
                ]);
            } else {
                Log::error('SendEventRegistrationPendingPaymentEmail: Brevo API error', [
                    'rsvp_id' => $this->rsvp->id,
                    'transaction_id' => $this->transaction->id,
                    'error' => $result['error'] ?? 'Unknown error',
                ]);
                // Rethrow to mark job as failed
                throw new \Exception($result['error'] ?? 'Brevo API error');
            }
        } catch (\Exception $e) {
            Log::error('SendEventRegistrationPendingPaymentEmail: Exception', [
                'rsvp_id' => $this->rsvp->id,
                'transaction_id' => $this->transaction->id,
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
        Log::error('SendEventRegistrationPendingPaymentEmail: Job failed', [
            'rsvp_id' => $this->rsvp->id,
            'transaction_id' => $this->transaction->id,
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

    /**
     * Format currency amount for display (Rupiah).
     */
    private function formatCurrency(int|float $amount): string
    {
        return number_format((int)$amount, 0, ',', '.');
    }
}
