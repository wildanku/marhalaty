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
        try {
            $update = $request->all();

            Log::info('🔔 Telegram webhook received', ['update_id' => $update['update_id'] ?? null, 'keys' => array_keys($update)]);

            // Only handle text messages
            $message = $update['message'] ?? $update['channel_post'] ?? null;
            if (! $message || ! isset($message['text'])) {
                Log::debug('Telegram webhook: ignoring non-text message', ['update_keys' => array_keys($update)]);
                return response('ok', 200);
            }

            $chatId    = $message['chat']['id'] ?? null;
            $messageId = $message['message_id'] ?? null;
            $text      = trim($message['text'] ?? '');
            $fromId    = $message['from']['id'] ?? $chatId;

            Log::info('📨 Telegram message received', [
                'chat_id'    => $chatId,
                'from_id'    => $fromId,
                'message_id' => $messageId,
                'text'       => $text,
                'chat_type'  => $message['chat']['type'] ?? 'unknown',
            ]);

            if (empty($chatId) || empty($messageId) || empty($text)) {
                Log::error('❌ Missing required message fields', [
                    'has_chat_id'    => !empty($chatId),
                    'has_message_id' => !empty($messageId),
                    'has_text'       => !empty($text),
                    'message_keys'   => array_keys($message),
                ]);
                return response('ok', 200);
            }

            // Strip bot username from command (e.g. /approve@dynamic87_bot → approve)
            $text = preg_replace('/@\w+/', '', $text);
            $text = ltrim($text, '/');
            $text = trim($text);

            Log::info('📝 Processed text', ['original' => $message['text'], 'processed' => $text]);

            // ── Whitelist check ───────────────────────────────────────────────
            $isAllowed = TelegramWhitelist::isAllowed($fromId);
            Log::info('🔑 Whitelist check', ['from_id' => $fromId, 'is_allowed' => $isAllowed]);

            if (! $isAllowed) {
                Log::warning('🔒 Unauthorized sender attempting command', [
                    'from_id' => $fromId,
                    'chat_id' => $chatId,
                    'text'    => $text,
                ]);
                // Send feedback to unauthorized user
                $this->telegram->sendMessage($chatId,
                    "🔒 Anda tidak memiliki otorisasi untuk menjalankan command ini.\n\n" .
                    "Hubungi admin untuk akses."
                );
                return response('ok', 200);
            }

            Log::info('✅ Authorized sender', ['from_id' => $fromId]);

            // ── Command dispatch ──────────────────────────────────────────────
            Log::info('🔍 Checking command patterns', ['text' => $text, 'text_length' => strlen($text)]);

            if (preg_match('/^approve\s+(\d+)$/i', $text, $matches)) {
                Log::info('✅ Approve command matched', ['transaction_id' => $matches[1]]);
                $this->handleApprove((int) $matches[1], $chatId, $messageId, $fromId);
            } elseif (preg_match('/^reject\s+(\d+)\s+(.+)$/i', $text, $matches)) {
                Log::info('✅ Reject command matched', ['transaction_id' => $matches[1], 'reason' => $matches[2]]);
                $this->handleReject((int) $matches[1], trim($matches[2]), $chatId, $messageId, $fromId);
            } elseif (preg_match('/^(approve|reject)/i', $text)) {
                Log::info('⚠️ Command detected but format invalid', ['text' => $text]);
                $this->telegram->replyMessage($chatId, $messageId,
                    "⚠️ <b>Format salah.</b>\n\nGunakan:\n" .
                    "• <code>approve &lt;ID&gt;</code> - Setujui pembayaran\n" .
                    "• <code>reject &lt;ID&gt; &lt;alasan&gt;</code> - Tolak pembayaran\n\n" .
                    "<i>Contoh:</i>\n" .
                    "<code>approve 9</code>\n" .
                    "<code>reject 9 Bukti kurang jelas</code>"
                );
            } else {
                Log::debug('Non-command message received', ['text' => $text]);
            }
        } catch (\Exception $e) {
            Log::error('💥 Telegram webhook handler exception', [
                'error'   => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
        }

        return response('ok', 200);
    }

    // ─── Private Handlers ─────────────────────────────────────────────────────

    private function handleApprove(int $transactionId, int|string $chatId, int $messageId, int|string $fromId): void
    {
        try {
            Log::info('Processing approve request', [
                'transaction_id' => $transactionId,
                'from_id'        => $fromId,
                'chat_id'        => $chatId,
            ]);

            DB::transaction(function () use ($transactionId, $chatId, $messageId, $fromId) {
                $transaction = Transaction::with(['rsvp', 'proof'])
                    ->where('payment_provider', 'manual')
                    ->where('status', 'pending')
                    ->lockForUpdate()
                    ->find($transactionId);

                if (! $transaction) {
                    Log::warning('Transaction not found for approval', [
                        'transaction_id' => $transactionId,
                        'from_id'        => $fromId,
                    ]);
                    $this->telegram->replyMessage($chatId, $messageId,
                        "❌ <b>Transaksi tidak ditemukan</b>\n\n" .
                        "Transaksi <code>#{$transactionId}</code> tidak ada atau sudah diproses sebelumnya."
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

                $replyText = "✅ <b>Transaksi #{$transactionId} berhasil disetujui!</b>\n\n" .
                    "👤 <b>Pendaftar:</b> " . e($user?->name ?? 'N/A') . "\n" .
                    "💰 <b>Nominal:</b> {$amount}\n" .
                    "📧 <b>Email:</b> " . e($user?->email ?? 'N/A') . "\n\n" .
                    "✉️ <i>Email konfirmasi telah dikirim ke peserta.</i>";

                $this->telegram->replyMessage($chatId, $messageId, $replyText);

                Log::info('Transaction approved via Telegram bot', [
                    'transaction_id' => $transactionId,
                    'approved_by'    => $fromId,
                    'user_name'      => $user?->name,
                    'amount'         => $transaction->amount,
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Telegram approve command failed', [
                'transaction_id' => $transactionId,
                'from_id'        => $fromId,
                'error'          => $e->getMessage(),
                'trace'          => $e->getTraceAsString(),
            ]);
            $this->telegram->replyMessage($chatId, $messageId,
                "❌ <b>Error saat approve pembayaran</b>\n\n" .
                "<code>" . e($e->getMessage()) . "</code>\n\n" .
                "Admin sudah dinotifikasi. Silakan coba lagi atau hubungi developer."
            );
        }
    }

    private function handleReject(int $transactionId, string $reason, int|string $chatId, int $messageId, int|string $fromId): void
    {
        try {
            Log::info('Processing reject request', [
                'transaction_id' => $transactionId,
                'from_id'        => $fromId,
                'reason'         => $reason,
            ]);

            DB::transaction(function () use ($transactionId, $reason, $chatId, $messageId, $fromId) {
                $transaction = Transaction::with(['rsvp', 'proof'])
                    ->where('payment_provider', 'manual')
                    ->where('status', 'pending')
                    ->lockForUpdate()
                    ->find($transactionId);

                if (! $transaction) {
                    Log::warning('Transaction not found for rejection', [
                        'transaction_id' => $transactionId,
                        'from_id'        => $fromId,
                    ]);
                    $this->telegram->replyMessage($chatId, $messageId,
                        "❌ <b>Transaksi tidak ditemukan</b>\n\n" .
                        "Transaksi <code>#{$transactionId}</code> tidak ada atau sudah diproses sebelumnya."
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

                $replyText = "🚫 <b>Transaksi #{$transactionId} ditolak</b>\n\n" .
                    "👤 <b>Pendaftar:</b> " . e($user?->name ?? 'N/A') . "\n" .
                    "📧 <b>Email:</b> " . e($user?->email ?? 'N/A') . "\n" .
                    "📝 <b>Alasan Penolakan:</b>\n" .
                    "<i>" . e($reason) . "</i>";

                $this->telegram->replyMessage($chatId, $messageId, $replyText);

                Log::info('Transaction rejected via Telegram bot', [
                    'transaction_id' => $transactionId,
                    'rejected_by'    => $fromId,
                    'reason'         => $reason,
                    'user_name'      => $user?->name,
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Telegram reject command failed', [
                'transaction_id' => $transactionId,
                'from_id'        => $fromId,
                'error'          => $e->getMessage(),
                'trace'          => $e->getTraceAsString(),
            ]);
            $this->telegram->replyMessage($chatId, $messageId,
                "❌ <b>Error saat reject pembayaran</b>\n\n" .
                "<code>" . e($e->getMessage()) . "</code>\n\n" .
                "Admin sudah dinotifikasi. Silakan coba lagi atau hubungi developer."
            );
        }
    }
}
