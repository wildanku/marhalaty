<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Event\Models\Transaction;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Services\OrderFulfillmentService;
use App\Http\Controllers\Controller;
use App\Jobs\SendEventRegistrationConfirmedEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PaymentController extends Controller
{
    public function __construct(private readonly OrderFulfillmentService $fulfillment) {}

    /**
     * List all manual transactions pending admin review — both RSVP (event) and store-order
     * manual transfers (Fase 7c, docs/plan/mvp2/7-payment-settings.md D22). The `whereNotNull
     * ('rsvp_id')` guard this view carried since fase 5 has been removed on purpose: it was a
     * stopgap for a time when stores couldn't take manual transfer at all, and now that they can,
     * keeping it would silently hide real pending store-order transactions from admins forever.
     */
    public function index(Request $request)
    {
        $transactions = Transaction::with(['user', 'rsvp.event', 'payable.store', 'proof'])
            ->where('payment_provider', 'manual')
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 ELSE 1 END")
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return Inertia::render('GodMode/Payments/Index', [
            'admin' => auth('admin')->user(),
            'transactions' => $transactions,
        ]);
    }

    /**
     * Approve a manual payment: mark transaction paid, then run whichever fulfillment the
     * transaction actually belongs to — RSVP (unchanged legacy path) or a store order, through the
     * exact same `OrderFulfillmentService::onPaid()` door the Satutera webhook and the Telegram
     * bot's `approve` command use, so there is only ever one fulfillment path per order.
     */
    public function approve(Request $request, int $id)
    {
        $request->validate([
            'review_note' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $id) {
            $transaction = Transaction::with(['rsvp', 'payable', 'proof'])
                ->where('payment_provider', 'manual')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->findOrFail($id);

            $transaction->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            if ($transaction->proof) {
                $transaction->proof->update([
                    'reviewed_at' => now(),
                    'reviewed_by' => auth('admin')->id(),
                    'review_note' => $request->input('review_note', 'Bukti pembayaran terverifikasi.'),
                ]);
            }

            if ($transaction->rsvp) {
                $transaction->rsvp->update(['status' => 'paid']);

                // Send confirmation email via Brevo API queue job
                $rsvp = $transaction->rsvp->load(['event', 'user', 'package']);
                if ($rsvp->user && $rsvp->user->email) {
                    SendEventRegistrationConfirmedEmail::dispatch($rsvp);
                }
            } elseif ($transaction->payable instanceof StoreOrder) {
                $order = $transaction->payable;
                $order->update(['status' => 'paid', 'paid_at' => now()]);
                $this->fulfillment->onPaid($order);
            }
        });

        return back()->with('success', 'Pembayaran berhasil disetujui.');
    }

    /**
     * Reject a manual payment. RSVP behavior is unchanged (transaction + RSVP both marked
     * failed). A store order instead goes back to `pending_payment` with a fresh `expires_at` —
     * the buyer gets a chance to re-upload rather than losing the order outright for what's
     * usually just a blurry photo or a wrong amount (docs/plan/mvp2/7-payment-settings.md §6b).
     */
    public function reject(Request $request, int $id)
    {
        $request->validate([
            'review_note' => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($request, $id) {
            $transaction = Transaction::with(['rsvp', 'payable', 'proof'])
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
            } elseif ($transaction->payable instanceof StoreOrder) {
                $transaction->update(['status' => 'pending']);
                $transaction->payable->update([
                    'expires_at' => now()->addMinutes((int) config('store.order_expiry_minutes')),
                ]);
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

        if (! $transaction->proof) {
            abort(404, 'Bukti pembayaran tidak ditemukan.');
        }

        $path = $transaction->proof->file_path;

        // Uploads always land on the 'public' disk (Event\PaymentProofController,
        // Event\PaymentPageController::confirmationStore, Store\StorePaymentProofController) —
        // this was reading 'local' instead, a pre-existing mismatch that made every "Lihat Bukti"
        // click 404 in practice. Fixed alongside the polymorphic rework above.
        if (! Storage::disk('public')->exists($path)) {
            abort(404, 'File tidak ditemukan.');
        }

        return Storage::disk('public')->download($path, $transaction->proof->original_name);
    }
}
