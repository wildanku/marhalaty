<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramCheckWebhook extends Command
{
    protected $signature = 'telegram:check-webhook';
    protected $description = 'Check current Telegram webhook status';

    public function handle()
    {
        $botToken = config('services.telegram.bot_token');

        if (empty($botToken)) {
            $this->error('❌ TELEGRAM_BOT_TOKEN is not set in .env');
            return 1;
        }

        $this->info("🔍 Checking Telegram webhook status...\n");

        try {
            $baseUrl = "https://api.telegram.org/bot{$botToken}";

            // Get webhook info
            $response = Http::timeout(10)->get("{$baseUrl}/getWebhookInfo");

            if ($response->successful()) {
                $data = $response->json('result', []);

                if (empty($data)) {
                    $this->warn("⚠️  No webhook info available");
                    return 0;
                }

                $this->info("📊 Webhook Information:");
                $this->line("  URL: " . ($data['url'] ?? 'Not set'));
                $this->line("  IP Address: " . ($data['ip_address'] ?? 'N/A'));
                $this->line("  Pending Updates: " . ($data['pending_update_count'] ?? 0));
                $this->line("  Last Error Date: " . (!empty($data['last_error_date']) ? date('Y-m-d H:i:s', $data['last_error_date']) : 'None'));

                if (!empty($data['last_error_message'])) {
                    $this->warn("  Last Error: " . $data['last_error_message']);
                }

                if (!empty($data['allowed_updates'])) {
                    $this->line("  Allowed Updates: " . implode(', ', $data['allowed_updates']));
                }

                // Get bot info
                $botResponse = Http::timeout(10)->get("{$baseUrl}/getMe");
                if ($botResponse->successful()) {
                    $botData = $botResponse->json('result', []);
                    $this->line("\n🤖 Bot Information:");
                    $this->line("  Username: @" . ($botData['username'] ?? 'N/A'));
                    $this->line("  First Name: " . ($botData['first_name'] ?? 'N/A'));
                    $this->line("  Is Bot: " . ($botData['is_bot'] ? 'Yes' : 'No'));
                }

                return 0;
            } else {
                $this->error("❌ Failed to get webhook info:");
                $this->error("Status: " . $response->status());
                $this->error("Response: " . $response->body());
                return 1;
            }
        } catch (\Exception $e) {
            $this->error("❌ Exception: " . $e->getMessage());
            return 1;
        }
    }
}
