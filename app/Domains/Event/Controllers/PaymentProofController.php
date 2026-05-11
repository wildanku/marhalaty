<?php

namespace App\Domains\Event\Controllers;

use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\TelegramService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaymentProofController extends Controller
{
    public function __construct(private readonly TelegramService $telegram) {}

    /**
     * Upload a manual payment proof for a pending transaction.
     */
    public function store(Request $request, int $transactionId)
    {
        $transaction = Transaction::with('proof')
            ->where('user_id', $request->user()->id)
            ->where('payment_provider', 'manual')
            ->where('status', 'pending')
            ->findOrFail($transactionId);

        $request->validate([
            'proof' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'max:5120', // 5 MB
            ],
            'notes' => 'nullable|string|max:500',
        ]);

        // Remove old proof if it exists (re-upload scenario)
        if ($transaction->proof) {
            Storage::disk('local')->delete($transaction->proof->file_path);
            $transaction->proof->delete();
        }

        $file         = $request->file('proof');
        $originalName = $file->getClientOriginalName();
        $path         = $file->store("payment-proofs/{$transaction->id}", 'local');

        $transaction->proof()->create([
            'file_path'     => $path,
            'original_name' => $originalName,
            'notes'         => $request->input('notes'),
        ]);

        // Notify admin Telegram channel with proof image
        $transaction->refresh()->load(['rsvp.event', 'user', 'proof']);
        $this->telegram->notifyPaymentProof($transaction);

        return back()->with('success', 'Bukti pembayaran berhasil diunggah. Admin akan segera memverifikasi.');
    }
}
