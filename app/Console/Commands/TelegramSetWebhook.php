<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramSetWebhook extends Command
{
    protected $signature = 'telegram:set-webhook';
    protected $description = 'Register webhook URL with Telegram bot API';

    public function handle()
    {
        $botToken     = config('services.telegram.bot_token');
        $appUrl       = config('app.url');
        $webhookUrl   = "{$appUrl}/telegram/webhook";

        if (empty($botToken)) {
            $this->error('❌ TELEGRAM_BOT_TOKEN is not set in .env');
            return 1;
        }

        if (empty($appUrl)) {
            $this->error('❌ APP_URL is not set in .env');
            return 1;
        }

        $this->info("🔗 Setting Telegram webhook...");
        $this->info("  Bot Token: " . substr($botToken, 0, 20) . '...');
        $this->info("  Webhook URL: {$webhookUrl}");

        try {
            $baseUrl = "https://api.telegram.org/bot{$botToken}";

            // First, check current webhook info
            $this->info("\n📋 Current webhook info:");
            $infoResponse = Http::timeout(10)->get("{$baseUrl}/getWebhookInfo");
            if ($infoResponse->successful()) {
                $info = $infoResponse->json('result', []);
                $this->line("  URL: " . ($info['url'] ?? 'None'));
                $this->line("  Pending updates: " . ($info['pending_update_count'] ?? 0));
            }

            // Set new webhook
            $this->info("\n⚙️  Registering new webhook...");
            $response = Http::timeout(10)->post("{$baseUrl}/setWebhook", [
                'url'                  => $webhookUrl,
                'allowed_updates'      => ['message', 'channel_post'],
                'drop_pending_updates' => false,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if ($data['ok'] ?? false) {
                    $this->info("\n✅ Webhook registered successfully!");
                    $this->info("  Webhook URL: {$webhookUrl}");
                    $this->line("\n📝 Bot is ready to receive commands:");
                    $this->line("  • Type 'approve <transaction_id>' to approve payment");
                    $this->line("  • Type 'reject <transaction_id> <reason>' to reject payment");
                    Log::info('Telegram webhook registered', ['url' => $webhookUrl]);
                    return 0;
                } else {
                    $this->error("❌ Telegram API returned error:");
                    $this->error(json_encode($data, JSON_PRETTY_PRINT));
                    Log::error('Telegram webhook registration failed', ['response' => $data]);
                    return 1;
                }
            } else {
                $this->error("❌ HTTP request failed:");
                $this->error("Status: " . $response->status());
                $this->error("Response: " . $response->body());
                return 1;
            }
        } catch (\Exception $e) {
            $this->error("❌ Exception: " . $e->getMessage());
            Log::error('Telegram webhook registration exception', ['error' => $e->getMessage()]);
            return 1;
        }
    }
}
