<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Event\Models\PaymentProof;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\TelegramService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Hash-based public proof upload for a manual-transfer store order — mirrors
 * `Event\PaymentPageController::confirmationStore()`. `PaymentProof` is a shared table
 * (`payment_proofs`, FK'd to `transactions`), not RSVP-specific, so no new model/migration.
 */
class StorePaymentProofController extends Controller
{
    public function __construct(private readonly TelegramService $telegram) {}

    public function store(Request $request, string $hash)
    {
        $transaction = Transaction::with(['payable', 'proof'])
            ->where('payment_hash', $hash)
            ->where('payment_provider', 'manual')
            ->firstOrFail();

        if ($transaction->status === 'paid') {
            return back()->with('info', 'Pembayaran sudah terkonfirmasi.');
        }

        $request->validate([
            'proof' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048',
            'notes' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $transaction) {
            if ($transaction->proof) {
                Storage::disk('public')->delete($transaction->proof->file_path);
                $transaction->proof->delete();
            }

            $file = $request->file('proof');
            $path = $file->store("payment-proofs/{$transaction->id}", 'public');

            PaymentProof::create([
                'transaction_id' => $transaction->id,
                'file_path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'notes' => $request->input('notes'),
            ]);

            Log::info('Store order payment proof uploaded via hash URL', [
                'transaction_id' => $transaction->id,
                'hash' => $transaction->payment_hash,
            ]);

            $transaction->refresh()->load(['payable.store', 'user', 'proof']);
            $this->telegram->notifyPaymentProof($transaction);
        });

        return redirect('/store/payment/'.$hash)->with('success', 'Bukti pembayaran berhasil diunggah. Admin akan memverifikasi segera.');
    }
}
