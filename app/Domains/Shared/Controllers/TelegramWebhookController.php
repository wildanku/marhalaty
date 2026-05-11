<?php

namespace App\Domains\Shared\Controllers;

use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\TelegramService;
use App\Http\Controllers\Controller;
use App\Jobs\SendEventRegistrationConfirmedEmail;
use App\Models\TelegramWhitelist;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Handles incoming Telegram bot webhook updates.
 *
 * Supported commands (only from whitelisted chat IDs):
 *   approve <transaction_id>
 *   reject <transaction_id> <reason>
 */
class TelegramWebhookController extends Controller
{
    public function __construct(private readonly TelegramService $telegram) {}

    public function handle(Request $request): Response
    {
        $update = $request->all();

        Log::info('Telegram webhook received', ['update_id' => $update['update_id'] ?? null]);

        // Only handle text messages
        $message = $update['message'] ?? $update['channel_post'] ?? null;
        if (! $message || ! isset($message['text'])) {
            return response('ok', 200);
        }

        $chatId    = $message['chat']['id'];
        $messageId = $message['message_id'];
        $text      = trim($message['text']);
        $fromId    = $message['from']['id'] ?? $chatId;

        // Strip bot username from command (e.g. /approve@dynamic87_bot → approve)
        $text = preg_replace('/@\w+/', '', $text);
        $text = ltrim($text, '/');

        // ── Whitelist check ───────────────────────────────────────────────
        if (! TelegramWhitelist::isAllowed($fromId)) {
            Log::warning('Telegram webhook: unauthorized sender', [
                'from_id' => $fromId,
                'chat_id' => $chatId,
                'text'    => $text,
            ]);
            // Silently ignore – don't expose system info to unauthorized users
            return response('ok', 200);
        }

        // ── Command dispatch ──────────────────────────────────────────────
        if (preg_match('/^approve\s+(\d+)$/i', $text, $matches)) {
            $this->handleApprove((int) $matches[1], $chatId, $messageId);
        } elseif (preg_match('/^reject\s+(\d+)\s+(.+)$/i', $text, $matches)) {
            $this->handleReject((int) $matches[1], trim($matches[2]), $chatId, $messageId);
        } elseif (preg_match('/^(approve|reject)/i', $text)) {
            $this->telegram->replyMessage($chatId, $messageId,
                "⚠️ Format salah.\n\nGunakan:\n• <code>approve &lt;ID&gt;</code>\n• <code>reject &lt;ID&gt; &lt;alasan&gt;</code>"
            );
        }

        return response('ok', 200);
    }

    // ─── Private Handlers ─────────────────────────────────────────────────────

    private function handleApprove(int $transactionId, int|string $chatId, int $messageId): void
    {
        try {
            DB::transaction(function () use ($transactionId, $chatId, $messageId) {
                $transaction = Transaction::with(['rsvp', 'proof'])
                    ->where('payment_provider', 'manual')
                    ->where('status', 'pending')
                    ->lockForUpdate()
                    ->find($transactionId);

                if (! $transaction) {
                    $this->telegram->replyMessage($chatId, $messageId,
                        "❌ Transaksi <code>#{$transactionId}</code> tidak ditemukan atau sudah diproses."
                    );
                    return;
                }

                $transaction->update([
                    'status'  => 'paid',
                    'paid_at' => now(),
                ]);

                if ($transaction->proof) {
                    $transaction->proof->update([
                        'reviewed_at' => now(),
                        'review_note' => 'Disetujui via Telegram bot.',
                    ]);
                }

                if ($transaction->rsvp) {
                    $transaction->rsvp->update(['status' => 'paid']);

                    $rsvp = $transaction->rsvp->load(['event', 'user', 'package']);
                    if ($rsvp->user && $rsvp->user->email) {
                        SendEventRegistrationConfirmedEmail::dispatch($rsvp);
                    }
                }

                $user   = $transaction->user ?? $transaction->rsvp?->user;
                $amount = 'Rp ' . number_format((float) $transaction->amount, 0, ',', '.');

                $this->telegram->replyMessage($chatId, $messageId,
                    "✅ <b>Transaksi #{$transactionId} berhasil disetujui!</b>\n\n" .
                    "👤 <b>Pendaftar:</b> " . e($user?->name ?? 'N/A') . "\n" .
                    "💰 <b>Nominal:</b> {$amount}\n\n" .
                    "<i>Email konfirmasi telah dikirim ke peserta.</i>"
                );

                Log::info('Transaction approved via Telegram bot', [
                    'transaction_id' => $transactionId,
                    'approved_by'    => $chatId,
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Telegram approve command failed', [
                'transaction_id' => $transactionId,
                'error'          => $e->getMessage(),
            ]);
            $this->telegram->replyMessage($chatId, $messageId,
                "❌ Terjadi error saat approve: " . e($e->getMessage())
            );
        }
    }

    private function handleReject(int $transactionId, string $reason, int|string $chatId, int $messageId): void
    {
        try {
            DB::transaction(function () use ($transactionId, $reason, $chatId, $messageId) {
                $transaction = Transaction::with(['rsvp', 'proof'])
                    ->where('payment_provider', 'manual')
                    ->where('status', 'pending')
                    ->lockForUpdate()
                    ->find($transactionId);

                if (! $transaction) {
                    $this->telegram->replyMessage($chatId, $messageId,
                        "❌ Transaksi <code>#{$transactionId}</code> tidak ditemukan atau sudah diproses."
                    );
                    return;
                }

                $transaction->update(['status' => 'failed']);

                if ($transaction->proof) {
                    $transaction->proof->update([
                        'reviewed_at' => now(),
                        'review_note' => $reason,
                    ]);
                }

                if ($transaction->rsvp) {
                    $transaction->rsvp->update(['status' => 'failed']);
                }

                $user = $transaction->user ?? $transaction->rsvp?->user;

                $this->telegram->replyMessage($chatId, $messageId,
                    "🚫 <b>Transaksi #{$transactionId} ditolak.</b>\n\n" .
                    "👤 <b>Pendaftar:</b> " . e($user?->name ?? 'N/A') . "\n" .
                    "📝 <b>Alasan:</b> " . e($reason)
                );

                Log::info('Transaction rejected via Telegram bot', [
                    'transaction_id' => $transactionId,
                    'rejected_by'    => $chatId,
                    'reason'         => $reason,
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Telegram reject command failed', [
                'transaction_id' => $transactionId,
                'error'          => $e->getMessage(),
            ]);
            $this->telegram->replyMessage($chatId, $messageId,
                "❌ Terjadi error saat reject: " . e($e->getMessage())
            );
        }
    }
}
