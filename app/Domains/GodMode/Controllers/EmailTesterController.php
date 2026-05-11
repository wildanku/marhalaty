<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\BrevoApiService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * GodMode Email Tester — allows admins to preview and send test emails
 * using Brevo API instead of SMTP (to bypass firewall/port restrictions).
 */
class EmailTesterController extends Controller
{
    public function __construct(private BrevoApiService $brevoApi)
    {
    }

    /**
     * Render the email tester admin panel.
     */
    public function index(): \Inertia\Response
    {
        $mailConfig = [
            'method' => 'Brevo API v3',
            'from' => config('mail.from.address'),
            'api_key' => env('BREVO_API_KEY') ? '✅ Configured' : '❌ Missing',
            'queue_driver' => config('queue.default'),
        ];

        return Inertia::render('GodMode/EmailTester/Index', [
            'admin' => auth('admin')->user(),
            'mailConfig' => $mailConfig,
            'templates' => [
                [
                    'key' => 'test',
                    'label' => '🧪 Test Email (Brevo API)',
                    'desc' => 'Email sederhana untuk memverifikasi koneksi Brevo API.',
                ],
                [
                    'key' => 'pending_payment',
                    'label' => '💳 Pending Payment (Dummy)',
                    'desc' => 'Simulasi email pembayaran pending dari RSVP event berbayar terakhir.',
                ],
                [
                    'key' => 'confirmed',
                    'label' => '✅ Konfirmasi Keikutsertaan (Dummy)',
                    'desc' => 'Simulasi email konfirmasi + calendar invite dari RSVP terakhir.',
                ],
            ],
        ]);
    }

    /**
     * Send a test email via Brevo API.
     * POST /god-mode/email-tester/send
     * 
     * @param Request $request {email: string, template: string, note?: string}
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'template' => 'required|in:test,pending_payment,confirmed',
            'note' => 'nullable|string|max:500',
        ]);

        $email = $validated['email'];
        $template = $validated['template'];
        $note = $validated['note'] ?? '';

        Log::info("📧 Email Tester: Sending [{$template}] to [{$email}] via Brevo API", [
            'api_key_configured' => !empty(env('BREVO_API_KEY')),
        ]);

        try {
            // Dispatch appropriate template
            $result = match ($template) {
                'test' => $this->sendTestEmail($email, $note),
                'pending_payment' => $this->sendDummyPendingPayment($email),
                'confirmed' => $this->sendDummyConfirmed($email),
            };

            if (!isset($result['success'])) {
                throw new \Exception('Invalid response from Brevo API service');
            }

            if ($result['success']) {
                Log::info("✅ Email Tester: Successfully sent [{$template}] to [{$email}]", [
                    'message_id' => $result['message_id'] ?? null,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => "✅ Email template [{$template}] berhasil dikirim ke {$email}.",
                    'debug' => [
                        'method' => 'Brevo API v3',
                        'message_id' => $result['message_id'] ?? null,
                        'from' => config('mail.from.address'),
                        'queue_driver' => config('queue.default'),
                    ],
                ], 200);
            } else {
                throw new \Exception($result['error'] ?? 'Unknown Brevo API error');
            }
        } catch (\Exception $e) {
            Log::error("❌ Email Tester: Failed to send [{$template}] to [{$email}]", [
                'error' => $e->getMessage(),
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => '❌ Gagal mengirim email: ' . $e->getMessage(),
                'debug' => [
                    'method' => 'Brevo API v3',
                    'from' => config('mail.from.address'),
                    'error_class' => get_class($e),
                ],
            ], 400);
        }
    }

    /**
     * Send a simple test email to verify Brevo API connectivity.
     */
    private function sendTestEmail(string $toEmail, string $note): array
    {
        $htmlContent = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 5px; }
        .content { padding: 20px; background: #f9f9f9; margin-top: 20px; }
        .note { background: #fff3cd; padding: 10px; margin-top: 10px; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Email dari Marhalaty</h1>
        </div>
        <div class="content">
            <p>Halo,</p>
            <p>Ini adalah email test untuk memverifikasi integrasi <strong>Brevo API</strong>.</p>
            <p>Jika Anda menerima email ini, sistem email Marhalaty berfungsi dengan baik!</p>
            <hr>
            <p><strong>Informasi Teknis:</strong></p>
            <ul>
                <li>Email Service: Brevo API v3</li>
                <li>Sent at: {now()->format('Y-m-d H:i:s')} UTC</li>
                <li>From: {config('mail.from.address')}</li>
            </ul>
HTML;

        if ($note) {
            $escapedNote = e($note);
            $htmlContent .= <<<HTML
            <div class="note">
                <strong>📝 Note:</strong> {$escapedNote}
            </div>
HTML;
        }

        $htmlContent .= <<<HTML
        </div>
    </div>
</body>
</html>
HTML;

        return $this->brevoApi->send(
            toEmail: $toEmail,
            toName: 'Admin Tester',
            subject: '🧪 Test Email dari Marhalaty',
            htmlContent: $htmlContent,
        );
    }

    /**
     * Send a dummy "pending payment" email using the latest transaction as template.
     * If no transactions exist, sends a test email with a notice.
     */
    private function sendDummyPendingPayment(string $toEmail): array
    {
        $transaction = Transaction::with(['rsvp.event', 'rsvp.user', 'rsvp.package'])
            ->where('payment_provider', 'manual')
            ->latest()
            ->first();

        // Fallback to test email if no data
        if (!$transaction || !$transaction->rsvp || !$transaction->rsvp->event) {
            return $this->sendTestEmail($toEmail, '[DUMMY] Tidak ada transaksi manual. Mengirim test email.');
        }

        $rsvp         = $transaction->rsvp;
        $event        = $rsvp->event;
        $bankAccounts = \App\Models\Setting::get('bank_account_manual_transfer', []);

        $htmlContent = view('emails.event-registration-payment', [
            'rsvp'         => $rsvp,
            'transaction'  => $transaction,
            'bankAccounts' => $bankAccounts,
        ])->render();

        return $this->brevoApi->send(
            toEmail: $toEmail,
            toName: $rsvp->user->name ?? 'Admin Tester',
            subject: "💳 [TEST] Selesaikan Pembayaran – {$event->title}",
            htmlContent: $htmlContent,
        );
    }

    /**
     * Send a dummy "confirmed registration" email using the latest RSVP as template.
     * If no RSVPs exist, sends a test email with a notice.
     */
    private function sendDummyConfirmed(string $toEmail): array
    {
        $rsvp = Rsvp::with(['event', 'user', 'package'])
            ->latest()
            ->first();

        // Fallback to test email if no data
        if (!$rsvp || !$rsvp->event || !$rsvp->user) {
            return $this->sendTestEmail($toEmail, '[DUMMY] Tidak ada RSVP. Mengirim test email.');
        }

        $htmlContent = view('emails.event-registration-confirmed', [
            'rsvp'  => $rsvp,
            'event' => $rsvp->event,
            'user'  => $rsvp->user,
        ])->render();

        return $this->brevoApi->send(
            toEmail: $toEmail,
            toName: $rsvp->user->name,
            subject: "✅ [TEST] Pendaftaran Dikonfirmasi – {$rsvp->event->title}",
            htmlContent: $htmlContent,
        );
    }
}
