<?php

namespace App\Domains\Shared\Services;

use App\Domains\Event\Models\Transaction;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Telegram Bot API service.
 *
 * Handles:
 *   - Sending notifications to a configured group/channel chat
 *   - Sending payment proof images (binary upload, not link)
 *   - Processing incoming commands from whitelisted admins
 */
class TelegramService
{
    private string $botToken;
    private string $notifyChatId;
    private string $baseUrl;

    public function __construct()
    {
        $this->botToken     = config('services.telegram.bot_token', '');
        $this->notifyChatId = config('services.telegram.notify_chat_id', '');
        $this->baseUrl      = "https://api.telegram.org/bot{$this->botToken}";
    }

    /**
     * Send a text message to a specific chat.
     */
    public function sendMessage(string|int $chatId, string $text, string $parseMode = 'HTML'): bool
    {
        try {
            $response = Http::timeout(15)->post("{$this->baseUrl}/sendMessage", [
                'chat_id'                  => $chatId,
                'text'                     => $text,
                'parse_mode'               => $parseMode,
                'disable_web_page_preview' => true,
            ]);

            if (! $response->successful() || ! ($response->json('ok') ?? false)) {
                Log::warning('Telegram sendMessage failed', [
                    'chat_id'  => $chatId,
                    'response' => $response->json(),
                ]);
                return false;
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Telegram sendMessage exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Send a photo (binary) with caption to a specific chat.
     * Reads the file from public storage and uploads it as binary to Telegram.
     */
    public function sendPhoto(string|int $chatId, string $storagePath, string $caption, string $parseMode = 'HTML'): bool
    {
        try {
            if (! Storage::disk('public')->exists($storagePath)) {
                Log::warning('Telegram sendPhoto: file not found', ['path' => $storagePath]);
                return $this->sendMessage($chatId, $caption . "\n\n⚠️ <i>Gambar bukti tidak ditemukan di server.</i>", $parseMode);
            }

            $fileContents = Storage::disk('public')->get($storagePath);
            $fileName     = basename($storagePath);

            $response = Http::timeout(30)->attach(
                'photo',
                $fileContents,
                $fileName
            )->post("{$this->baseUrl}/sendPhoto", [
                'chat_id'    => $chatId,
                'caption'    => $caption,
                'parse_mode' => $parseMode,
            ]);

            if (! $response->successful() || ! ($response->json('ok') ?? false)) {
                Log::warning('Telegram sendPhoto failed', [
                    'chat_id'  => $chatId,
                    'response' => $response->json(),
                ]);
                // Fallback: send as text without image
                return $this->sendMessage($chatId, $caption . "\n\n⚠️ <i>Gagal mengirim gambar bukti transfer.</i>", $parseMode);
            }

            return true;
        } catch (\Exception $e) {
            Log::error('Telegram sendPhoto exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Notify admin channel about a newly uploaded payment proof.
     * Sends the proof image as binary (not link) with full transaction details including package and addons.
     */
    public function notifyPaymentProof(Transaction $transaction): void
    {
        if (empty($this->notifyChatId) || empty($this->botToken)) {
            Log::warning('Telegram notifyPaymentProof skipped: bot_token or notify_chat_id not configured.');
            return;
        }

        $transaction->loadMissing(['rsvp.event', 'rsvp.package', 'user', 'proof']);

        $user        = $transaction->user;
        $rsvp        = $transaction->rsvp;
        $event       = $rsvp?->event;
        $package     = $rsvp?->package;
        $proof       = $transaction->proof;
        $amount      = number_format((float) $transaction->amount, 0, ',', '.');
        $notes       = $proof?->notes ? "\n📝 <b>Catatan:</b> {$proof->notes}" : '';

        // Format package info
        $packageInfo = '';
        if ($package) {
            $packagePrice = number_format((float) $package->price, 0, ',', '.');
            $packageInfo = "\n\n🎁 <b>Paket:</b> " . e($package->name) . " (Rp " . $packagePrice . ")";
        }

        // Format add-ons info
        $addonsInfo = '';
        if ($rsvp?->add_ons_snapshot) {
            $addons = is_array($rsvp->add_ons_snapshot) ? $rsvp->add_ons_snapshot : json_decode($rsvp->add_ons_snapshot, true);
            if (! empty($addons) && is_array($addons)) {
                $addonLines = ["🛍️ <b>Tambahan:</b>"];
                foreach ($addons as $addon) {
                    if (is_array($addon) && isset($addon['name'])) {
                        $addonName  = e($addon['name'] ?? 'N/A');
                        $quantity   = $addon['quantity'] ?? 0;
                        $price      = isset($addon['price']) ? number_format((float) $addon['price'], 0, ',', '.') : '0';
                        $totalPrice = isset($addon['price']) ? number_format((float) $addon['price'] * $quantity, 0, ',', '.') : '0';
                        $addonLines[] = "  • {$addonName} x{$quantity} = Rp {$totalPrice}";
                    }
                }
                $addonsInfo = "\n" . implode("\n", $addonLines);
            }
        }

        $caption = implode("\n", [
            "💳 <b>Bukti Pembayaran Masuk</b>",
            "",
            "👤 <b>Pendaftar:</b> " . e($user?->name ?? 'N/A'),
            "📧 <b>Email:</b> " . e($user?->email ?? 'N/A'),
            "🎟 <b>Acara:</b> " . e($event?->title ?? 'N/A'),
            $packageInfo,
            $addonsInfo,
            "",
            "💰 <b>Nominal:</b> Rp " . $amount,
            "🔖 <b>ID Transaksi:</b> <code>{$transaction->id}</code>",
            "⏰ <b>Waktu Upload:</b> " . now()->setTimezone('Asia/Jakarta')->format('d M Y, H:i') . " WIB",
            $notes,
            "",
            "✅ Ketik <code>approve {$transaction->id}</code> untuk menyetujui.",
            "❌ Ketik <code>reject {$transaction->id} &lt;alasan&gt;</code> untuk menolak.",
        ]);

        if ($proof && $proof->file_path) {
            $this->sendPhoto($this->notifyChatId, $proof->file_path, $caption);
        } else {
            $caption .= "\n\n⚠️ <i>Tidak ada file bukti pembayaran.</i>";
            $this->sendMessage($this->notifyChatId, $caption);
        }

        Log::info('Telegram payment proof notification sent', [
            'transaction_id' => $transaction->id,
            'notify_chat_id' => $this->notifyChatId,
        ]);
    }

    /**
     * Reply to a specific message in a chat.
     */
    public function replyMessage(string|int $chatId, int $replyToMessageId, string $text, string $parseMode = 'HTML'): bool
    {
        try {
            $response = Http::timeout(15)->post("{$this->baseUrl}/sendMessage", [
                'chat_id'                  => $chatId,
                'text'                     => $text,
                'parse_mode'               => $parseMode,
                'reply_to_message_id'      => $replyToMessageId,
                'disable_web_page_preview' => true,
            ]);

            if (! $response->successful() || ! ($response->json('ok') ?? false)) {
                Log::warning('Telegram replyMessage failed', [
                    'chat_id'  => $chatId,
                    'response' => $response->json(),
                ]);
                return false;
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Telegram replyMessage exception', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
