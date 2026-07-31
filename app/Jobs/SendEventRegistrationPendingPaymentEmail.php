<?php

namespace App\Jobs;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\BrevoApiService;
use App\Domains\Shared\Services\PaymentSettingsService;
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
    ) {}

    /**
     * Execute the queued job.
     */
    public function handle(BrevoApiService $brevoApi, PaymentSettingsService $paymentSettings): void
    {
        try {
            $this->rsvp->load(['event', 'user', 'package']);

            if (! $this->rsvp->user || ! $this->rsvp->event) {
                Log::warning('SendEventRegistrationPendingPaymentEmail: Missing user or event', [
                    'rsvp_id' => $this->rsvp->id,
                    'transaction_id' => $this->transaction->id,
                ]);

                return;
            }

            $recipient = $this->rsvp->user;
            $event = $this->rsvp->event;
            $bankAccounts = $paymentSettings->manualAccounts();

            // Render Blade template
            $htmlContent = view('emails.event-registration-payment', [
                'rsvp' => $this->rsvp,
                'transaction' => $this->transaction,
                'bankAccounts' => $bankAccounts,
            ])->render();

            // Send via Brevo API
            $result = $brevoApi->send(
                toEmail: $recipient->email,
                toName: $recipient->name,
                subject: "💳 Selesaikan Pembayaran – {$event->title}",
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
}
