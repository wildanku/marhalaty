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
        return Inertia::render('GodMode/EmailTester/Index', [
            'admin'     => auth('admin')->user(),
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

        try {
            match ($template) {
                'test' => Mail::to($email)->send(new TestEmail(note: $validated['note'] ?? '')),

                'pending_payment' => $this->sendDummyPendingPayment($email),

                'confirmed' => $this->sendDummyConfirmed($email),
            };
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal mengirim email: ' . $e->getMessage());
        }

        return back()->with('success', "Email template [{$template}] berhasil dikirim ke {$email}.");
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Build a dummy Rsvp + Transaction and send pending payment email.
     * Uses the latest existing paid transaction as data source (if any),
     * otherwise sends a plain test email with a notice.
     */
    private function sendDummyPendingPayment(string $email): void
    {
        $transaction = Transaction::with(['rsvp.event', 'rsvp.user', 'rsvp.package'])
            ->where('payment_provider', 'manual')
            ->latest()
            ->first();

        if (!$transaction || !$transaction->rsvp) {
            Mail::to($email)->send(new TestEmail(note: '[DUMMY] Tidak ada transaksi manual di database. Kirim test email biasa.'));
            return;
        }

        $bankAccounts = Setting::get('bank_account_manual_transfer', []);

        Mail::to($email)->send(new EventRegistrationPendingPayment($transaction->rsvp, $transaction));
    }

    /**
     * Build a dummy confirmed RSVP email.
     * Uses the latest existing approved RSVP (if any).
     */
    private function sendDummyConfirmed(string $email): void
    {
        $rsvp = Rsvp::with(['event', 'user', 'package'])->latest()->first();

        if (!$rsvp || !$rsvp->event) {
            Mail::to($email)->send(new TestEmail(note: '[DUMMY] Tidak ada RSVP di database. Kirim test email biasa.'));
            return;
        }

        Mail::to($email)->send(new EventRegistrationConfirmed($rsvp));
    }
}
