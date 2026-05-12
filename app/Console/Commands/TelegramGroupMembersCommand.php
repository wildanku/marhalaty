<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TelegramGroupMembersCommand extends Command
{
    protected $signature = 'telegram:group-members';
    protected $description = 'List all administrators in the Telegram group';

    public function handle()
    {
        $token = config('services.telegram.bot_token');
        $chatId = config('services.telegram.notify_chat_id');

        if (!$token || !$chatId) {
            $this->error('❌ TELEGRAM_BOT_TOKEN atau TELEGRAM_NOTIFY_CHAT_ID tidak dikonfigurasi');
            return 1;
        }

        try {
            $this->info('🔍 Mengambil informasi group Telegram...');

            // Get chat info
            $chatResponse = Http::get("https://api.telegram.org/bot{$token}/getChat", [
                'chat_id' => $chatId,
            ]);

            if (!$chatResponse->successful()) {
                $this->error('❌ Gagal mengakses group Telegram');
                return 1;
            }

            $chatData = $chatResponse->json();
            if (!$chatData['ok']) {
                $this->error('❌ ' . ($chatData['description'] ?? 'Unknown error'));
                return 1;
            }

            $chat = $chatData['result'];

            // Display chat info
            $this->newLine();
            $this->line('📊 <info>Group Information:</info>');
            $this->line('   Title: ' . ($chat['title'] ?? 'N/A'));
            $this->line('   Type: ' . ($chat['type'] ?? 'N/A'));
            $this->line('   Chat ID: ' . $chat['id']);
            $this->line('   Members: ' . ($chat['members_count'] ?? 'N/A'));
            $this->newLine();

            // Get administrators
            $adminsResponse = Http::get("https://api.telegram.org/bot{$token}/getChatAdministrators", [
                'chat_id' => $chatId,
            ]);

            if ($adminsResponse->successful()) {
                $adminsData = $adminsResponse->json();
                if ($adminsData['ok'] && !empty($adminsData['result'])) {
                    $this->line('👥 <info>Group Administrators:</info>');
                    $this->newLine();

                    $headers = ['ID', 'Name', 'Username', 'Role'];
                    $rows = [];

                    foreach ($adminsData['result'] as $admin) {
                        $user = $admin['user'] ?? [];
                        $status = $admin['status'] ?? 'member';
                        
                        $role = match($status) {
                            'creator' => 'Creator',
                            'administrator' => 'Administrator',
                            default => 'Member',
                        };

                        $rows[] = [
                            'id' => $user['id'] ?? 'N/A',
                            'name' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
                            'username' => isset($user['username']) ? '@' . $user['username'] : 'N/A',
                            'role' => $role,
                        ];
                    }

                    $this->table($headers, $rows);

                    // Copy command for whitelist
                    $this->newLine();
                    $this->info('💡 Untuk menambahkan ke whitelist, gunakan:');
                    foreach ($adminsData['result'] as $admin) {
                        $user = $admin['user'] ?? [];
                        $name = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
                        $this->line('   php artisan telegram:whitelist add --chat-id=' . ($user['id'] ?? 'ID') . ' --name="' . $name . '"');
                    }
                } else {
                    $this->info('ℹ️  Tidak ada administrator dalam group');
                }
            }

            $this->newLine();
            $this->info('✅ Done!');
            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            return 1;
        }
    }
}
