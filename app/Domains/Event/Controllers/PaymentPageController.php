<?php

namespace App\Domains\Event\Controllers;

use App\Domains\Event\Models\Transaction;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * Hash-based public payment pages.
 * Accessible without auth — the hash acts as the access token.
 */
class PaymentPageController extends Controller
{
    /**
     * GET /payment/{hash}
     * Show payment details: VA / QRIS info for iPaymu, or bank info for manual.
     */
    public function show(string $hash)
    {
        $transaction = Transaction::with(['rsvp.event', 'rsvp.package', 'rsvp.user', 'proof'])
            ->where('payment_hash', $hash)
            ->firstOrFail();

        $bankAccounts = Setting::get('bank_account_manual_transfer', []);

        return Inertia::render('Payment/PaymentPage', [
            'transaction'  => $transaction,
            'rsvp'         => $transaction->rsvp,
            'event'        => $transaction->rsvp->event,
            'bankAccounts' => $bankAccounts,
            'hash'         => $hash,
        ]);
    }

    /**
     * GET /payment-confirmation/{hash}
     * Show proof upload page (manual transfer only).
     */
    public function confirmationShow(string $hash)
    {
        $transaction = Transaction::with(['rsvp.event', 'rsvp.user', 'proof'])
            ->where('payment_hash', $hash)
            ->firstOrFail();

        return Inertia::render('Payment/ConfirmationPage', [
            'transaction' => $transaction,
            'rsvp'        => $transaction->rsvp,
            'event'       => $transaction->rsvp->event,
            'hash'        => $hash,
        ]);
    }

    /**
     * POST /payment-confirmation/{hash}
     * Accept proof file upload.
     */
    public function confirmationStore(Request $request, string $hash)
    {
        $transaction = Transaction::with(['rsvp', 'proof'])
            ->where('payment_hash', $hash)
            ->firstOrFail();

        if ($transaction->payment_provider !== 'manual') {
            abort(422, 'Bukti hanya diperlukan untuk transfer manual.');
        }

        if ($transaction->status === 'paid') {
            return back()->with('info', 'Pembayaran sudah terkonfirmasi.');
        }

        $request->validate([
            'proof' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'notes' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $transaction) {
            // Delete previous proof if exists
            if ($transaction->proof) {
                $transaction->proof->delete();
            }

            $file = $request->file('proof');
            $path = $file->store('payment-proofs', 'local');

            \App\Domains\Event\Models\PaymentProof::create([
                'transaction_id' => $transaction->id,
                'file_path'      => $path,
                'original_name'  => $file->getClientOriginalName(),
                'notes'          => $request->input('notes'),
            ]);

            Log::info('Payment proof uploaded via hash URL', [
                'transaction_id' => $transaction->id,
                'hash'           => $transaction->payment_hash,
            ]);
        });

        return redirect('/payment/' . $hash)->with('success', 'Bukti pembayaran berhasil diunggah. Admin akan memverifikasi segera.');
    }
}
