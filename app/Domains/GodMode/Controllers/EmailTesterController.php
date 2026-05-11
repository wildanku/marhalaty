<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Http\Controllers\Controller;
use App\Mail\EventRegistrationConfirmed;
use App\Mail\EventRegistrationPendingPayment;
use App\Mail\TestEmail;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * GodMode Email Tester — allows admins to preview and send test emails
 * without triggering real business events.
 */
class EmailTesterController extends Controller
{
    /** Render the email tester panel. */
    public function index(): \Inertia\Response
    {
        $mailConfig = [
            'mailer' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host'),
            'port' => config('mail.mailers.smtp.port'),
            'from' => config('mail.from.address'),
            'scheme' => config('mail.mailers.smtp.scheme'),
        ];

        return Inertia::render('GodMode/EmailTester/Index', [
            'admin'     => auth('admin')->user(),
            'mailConfig' => $mailConfig,
            'templates' => [
                [
                    'key'   => 'test',
                    'label' => '🧪 Test Email (SMTP Check)',
                    'desc'  => 'Email kosong untuk memverifikasi koneksi SMTP.',
                ],
                [
                    'key'   => 'pending_payment',
                    'label' => '💳 Pending Payment (Dummy)',
                    'desc'  => 'Simulasi email pembayaran pending setelah RSVP event berbayar.',
                ],
                [
                    'key'   => 'confirmed',
                    'label' => '✅ Konfirmasi Keikutsertaan (Dummy)',
                    'desc'  => 'Simulasi email konfirmasi + calendar .ics invite.',
                ],
            ],
        ]);
    }

    /** Send a test email to the specified address. */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email|max:255',
            'template' => 'required|in:test,pending_payment,confirmed',
            'note'     => 'nullable|string|max:500',
        ]);

        $email    = $validated['email'];
        $template = $validated['template'];

        $queueConfig = [
            'queue_driver' => config('queue.default'),
            'has_queue_worker' => $this->checkQueueWorkerStatus(),
        ];

        Log::info("Email Tester: Attempting to send {$template} email to {$email}", [
            'mailer' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host'),
            'port' => config('mail.mailers.smtp.port'),
            'queue_driver' => config('queue.default'),
        ]);

        try {
            // Use sync connection to send immediately (bypass queue)
            match ($template) {
                'test' => Mail::mailer('sync')->to($email)->send(new TestEmail(note: $validated['note'] ?? '')),

                'pending_payment' => $this->sendDummyPendingPayment($email, true),

                'confirmed' => $this->sendDummyConfirmed($email, true),
            };

            Log::info("Email Tester: Successfully sent {$template} email to {$email}");

            return response()->json([
                'success' => true,
                'message' => "Email template [{$template}] berhasil dikirim ke {$email}.",
                'debug' => [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'queue_driver' => config('queue.default'),
                    'force_sync' => true,
                ]
            ], 200);
        } catch (\Exception $e) {
            Log::error("Email Tester: Failed to send {$template} email to {$email}: " . $e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'mailer' => config('mail.default'),
                'queue_driver' => config('queue.default'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim email: ' . $e->getMessage(),
                'debug' => [
                    'exception' => get_class($e),
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'queue_driver' => config('queue.default'),
                    'force_sync' => true,
                ]
            ], 400);
        }
    }

    /**
     * Check if queue:work is running by checking recent entries in jobs table
     */
    private function checkQueueWorkerStatus(): bool
    {
        if (config('queue.default') !== 'database') {
            return true; // Can't check non-database queues easily
        }

        try {
            $jobsTable = config('queue.connections.database.table', 'jobs');
            $recentJobs = DB::table($jobsTable)
                ->where('created_at', '>=', now()->subHours(1))
                ->count();

            // If there are old jobs and they're not being processed, queue:work is likely down
            $oldJobs = DB::table($jobsTable)
                ->where('created_at', '<', now()->subHours(1))
                ->count();

            return $oldJobs === 0; // No old jobs = queue is being processed
        } catch (\Exception $e) {
            return true; // Can't determine, assume it's working
        }
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Build a dummy Rsvp + Transaction and send pending payment email.
     * Uses the latest existing paid transaction as data source (if any),
     * otherwise sends a plain test email with a notice.
     */
    private function sendDummyPendingPayment(string $email, bool $useSync = false): void
    {
        $transaction = Transaction::with(['rsvp.event', 'rsvp.user', 'rsvp.package'])
            ->where('payment_provider', 'manual')
            ->latest()
            ->first();

        if (!$transaction || !$transaction->rsvp) {
            if ($useSync) {
                Mail::mailer('sync')->to($email)->send(new TestEmail(note: '[DUMMY] Tidak ada transaksi manual di database. Kirim test email biasa.'));
            } else {
                Mail::to($email)->send(new TestEmail(note: '[DUMMY] Tidak ada transaksi manual di database. Kirim test email biasa.'));
            }
            return;
        }

        $bankAccounts = Setting::get('bank_account_manual_transfer', []);

        if ($useSync) {
            Mail::mailer('sync')->to($email)->send(new EventRegistrationPendingPayment($transaction->rsvp, $transaction));
        } else {
            Mail::to($email)->send(new EventRegistrationPendingPayment($transaction->rsvp, $transaction));
        }
    }

    /**
     * Build a dummy confirmed RSVP email.
     * Uses the latest existing approved RSVP (if any).
     */
    private function sendDummyConfirmed(string $email, bool $useSync = false): void
    {
        $rsvp = Rsvp::with(['event', 'user', 'package'])->latest()->first();

        if (!$rsvp || !$rsvp->event) {
            if ($useSync) {
                Mail::mailer('sync')->to($email)->send(new TestEmail(note: '[DUMMY] Tidak ada RSVP di database. Kirim test email biasa.'));
            } else {
                Mail::to($email)->send(new TestEmail(note: '[DUMMY] Tidak ada RSVP di database. Kirim test email biasa.'));
            }
            return;
        }

        if ($useSync) {
            Mail::mailer('sync')->to($email)->send(new EventRegistrationConfirmed($rsvp));
        } else {
            Mail::to($email)->send(new EventRegistrationConfirmed($rsvp));
        }
    }
}
