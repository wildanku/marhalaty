<?php

namespace App\Console\Commands;

use App\Models\TelegramWhitelist;
use Illuminate\Console\Command;

class TelegramDebugCommand extends Command
{
    protected $signature = 'telegram:debug';
    protected $description = 'Debug Telegram bot setup and whitelist status';

    public function handle()
    {
        $this->info("🔍 <b>Telegram Bot Debug Information</b>\n");

        $botToken = config('services.telegram.bot_token');
        $chatId   = config('services.telegram.notify_chat_id');
        $appUrl   = config('app.url');

        // ── Configuration Check ────────────────────────────────────────────
        $this->line("📋 <b>Configuration:</b>");
        $this->line("  Bot Token: " . (empty($botToken) ? "❌ NOT SET" : "✅ " . substr($botToken, 0, 20) . "..."));
        $this->line("  Notify Chat ID: " . (empty($chatId) ? "❌ NOT SET" : "✅ {$chatId}"));
        $this->line("  App URL: " . (empty($appUrl) ? "❌ NOT SET" : "✅ {$appUrl}"));

        // ── Whitelist Status ───────────────────────────────────────────────
        $this->line("\n👥 <b>Whitelist Status:</b>");
        $whitelisted = TelegramWhitelist::where('is_active', true)->get();

        if ($whitelisted->isEmpty()) {
            $this->warn("  ⚠️ No active admins in whitelist!");
            $this->line("\n  📝 <b>Add your Telegram ID:</b>\n");
            $this->line("  <code>php artisan tinker</code>");
            $this->line("  <code>App\\Models\\TelegramWhitelist::create(['chat_id' => YOUR_ID, 'name' => 'Your Name', 'is_active' => true]);</code>");
            $this->line("\n  To find your Telegram ID, chat with <code>@userinfobot</code>");
        } else {
            $this->line("  Total active admins: {$whitelisted->count()}");
            foreach ($whitelisted as $admin) {
                $status = $admin->is_active ? '✅' : '⛔';
                $this->line("  {$status} ID: {$admin->chat_id} | Name: {$admin->name}");
            }
        }

        // ── How to Find Your Chat ID ───────────────────────────────────────
        $this->line("\n\n🆔 <b>How to Find Your Telegram ID:</b>");
        $this->line("  1. Open Telegram and search for: <code>@userinfobot</code>");
        $this->line("  2. Click /start");
        $this->line("  3. Bot will show your <code>Your user ID: 123456789</code>");
        $this->line("  4. Copy that number and add to whitelist");

        // ── Test Instructions ──────────────────────────────────────────────
        $this->line("\n\n✅ <b>Next Steps:</b>");
        if (!empty($botToken) && !empty($chatId) && !empty($appUrl)) {
            $this->line("  1. ✅ All config ready!");
            $this->line("  2. Add your chat_id to whitelist (if not already)");
            $this->line("  3. Test approve command: Type 'approve 9' in Telegram group");
            $this->line("  4. Check logs: tail -f storage/logs/laravel.log");
        } else {
            $this->warn("  ⚠️ Fix configuration first:");
            if (empty($botToken)) $this->line("     - Set TELEGRAM_BOT_TOKEN in .env");
            if (empty($chatId)) $this->line("     - Set TELEGRAM_NOTIFY_CHAT_ID in .env");
            if (empty($appUrl)) $this->line("     - Set APP_URL in .env");
        }

        return 0;
    }
}
