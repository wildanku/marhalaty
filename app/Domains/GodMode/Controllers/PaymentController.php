<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Event\Models\Transaction;
use App\Http\Controllers\Controller;
use App\Mail\EventRegistrationConfirmed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PaymentController extends Controller
{
    /**
     * List all manual transactions pending admin review.
     */
    public function index(Request $request)
    {
        $transactions = Transaction::with(['user', 'rsvp.event', 'proof'])
            ->where('payment_provider', 'manual')
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 ELSE 1 END")
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return Inertia::render('GodMode/Payments/Index', [
            'admin'        => auth('admin')->user(),
            'transactions' => $transactions,
        ]);
    }

    /**
     * Approve a manual payment: mark transaction & RSVP as paid.
     */
    public function approve(Request $request, int $id)
    {
        $request->validate([
            'review_note' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $id) {
            $transaction = Transaction::with(['rsvp', 'proof'])
                ->where('payment_provider', 'manual')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->findOrFail($id);

            $transaction->update([
                'status'  => 'paid',
                'paid_at' => now(),
            ]);

            if ($transaction->proof) {
                $transaction->proof->update([
                    'reviewed_at'  => now(),
                    'reviewed_by'  => auth('admin')->id(),
                    'review_note'  => $request->input('review_note', 'Bukti pembayaran terverifikasi.'),
                ]);
            }

            if ($transaction->rsvp) {
                $transaction->rsvp->update(['status' => 'paid']);

                // Send confirmation email with .ics calendar attachment
                $rsvp = $transaction->rsvp->load(['event', 'user', 'package']);
                if ($rsvp->user && $rsvp->user->email) {
                    Mail::to($rsvp->user->email)->queue(new EventRegistrationConfirmed($rsvp));
                }
            }
        });

        return back()->with('success', 'Pembayaran berhasil disetujui.');
    }

    /**
     * Reject a manual payment: mark transaction as failed.
     */
    public function reject(Request $request, int $id)
    {
        $request->validate([
            'review_note' => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($request, $id) {
            $transaction = Transaction::with(['rsvp', 'proof'])
                ->where('payment_provider', 'manual')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->findOrFail($id);

            $transaction->update(['status' => 'failed']);

            if ($transaction->proof) {
                $transaction->proof->update([
                    'reviewed_at' => now(),
                    'reviewed_by' => auth('admin')->id(),
                    'review_note' => $request->input('review_note'),
                ]);
            }

            if ($transaction->rsvp) {
                $transaction->rsvp->update(['status' => 'failed']);
            }
        });

        return back()->with('success', 'Pembayaran berhasil ditolak.');
    }

    /**
     * Stream the payment proof file for admin viewing.
     */
    public function downloadProof(int $id)
    {
        $transaction = Transaction::with('proof')
            ->where('payment_provider', 'manual')
            ->findOrFail($id);

        if (!$transaction->proof) {
            abort(404, 'Bukti pembayaran tidak ditemukan.');
        }

        $path = $transaction->proof->file_path;

        if (!Storage::disk('local')->exists($path)) {
            abort(404, 'File tidak ditemukan.');
        }

        return Storage::disk('local')->download($path, $transaction->proof->original_name);
    }
}
