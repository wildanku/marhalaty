<?php

namespace App\Console\Commands;

use App\Models\TelegramWhitelist;
use Illuminate\Console\Command;

class TelegramWhitelistCommand extends Command
{
    protected $signature = 'telegram:whitelist {action} {--chat-id=} {--name=}';
    protected $description = 'Manage Telegram bot admin whitelist';

    public function handle()
    {
        $action = $this->argument('action');

        match ($action) {
            'list'   => $this->listWhitelist(),
            'add'    => $this->addToWhitelist(),
            'remove' => $this->removeFromWhitelist(),
            'toggle' => $this->toggleWhitelist(),
            default  => $this->showUsage(),
        };

        return 0;
    }

    private function listWhitelist()
    {
        $admins = TelegramWhitelist::all();

        if ($admins->isEmpty()) {
            $this->warn('⚠️ No admins in whitelist');
            return;
        }

        $this->info("\n👥 Telegram Admin Whitelist:\n");

        $headers = ['Chat ID', 'Name', 'Status', 'Added'];
        $rows    = $admins->map(fn ($admin) => [
            $admin->chat_id,
            $admin->name,
            $admin->is_active ? '✅ Active' : '⛔ Inactive',
            $admin->created_at->format('Y-m-d H:i'),
        ])->toArray();

        $this->table($headers, $rows);
    }

    private function addToWhitelist()
    {
        $chatId = $this->option('chat-id') ?: $this->ask('Enter Telegram Chat ID');
        $name   = $this->option('name') ?: $this->ask('Enter Admin Name');

        if (empty($chatId) || empty($name)) {
            $this->error('Chat ID and Name are required');
            return;
        }

        if (!is_numeric($chatId)) {
            $this->error('Chat ID must be a number');
            return;
        }

        $existing = TelegramWhitelist::where('chat_id', $chatId)->first();

        if ($existing) {
            if ($this->confirm("Admin {$existing->name} already exists. Update?")) {
                $existing->update([
                    'name'      => $name,
                    'is_active' => true,
                ]);
                $this->info("✅ Updated: {$name} ({$chatId})");
            }
            return;
        }

        TelegramWhitelist::create([
            'chat_id'   => $chatId,
            'name'      => $name,
            'is_active' => true,
        ]);

        $this->info("✅ Added to whitelist: {$name} ({$chatId})");
        $this->line("\nNow this admin can use:");
        $this->line("  • approve <transaction_id>");
        $this->line("  • reject <transaction_id> <reason>");
    }

    private function removeFromWhitelist()
    {
        $chatId = $this->option('chat-id') ?: $this->ask('Enter Telegram Chat ID to remove');

        $admin = TelegramWhitelist::where('chat_id', $chatId)->first();

        if (!$admin) {
            $this->error("Admin with Chat ID {$chatId} not found");
            return;
        }

        if ($this->confirm("Remove {$admin->name} from whitelist?")) {
            $admin->delete();
            $this->info("✅ Removed: {$admin->name} ({$chatId})");
        }
    }

    private function toggleWhitelist()
    {
        $chatId = $this->option('chat-id') ?: $this->ask('Enter Telegram Chat ID');

        $admin = TelegramWhitelist::where('chat_id', $chatId)->first();

        if (!$admin) {
            $this->error("Admin with Chat ID {$chatId} not found");
            return;
        }

        $admin->update(['is_active' => !$admin->is_active]);

        $status = $admin->is_active ? 'enabled' : 'disabled';
        $this->info("✅ {$admin->name} is now {$status}");
    }

    private function showUsage()
    {
        $this->info("\n📋 <b>Telegram Whitelist Management</b>\n");
        $this->line("Usage:");
        $this->line("  <command>list</command>                                 - List all admins");
        $this->line("  <command>add</command> --chat-id=123 --name=\"John\"      - Add new admin");
        $this->line("  <command>remove</command> --chat-id=123                  - Remove admin");
        $this->line("  <command>toggle</command> --chat-id=123                  - Enable/disable admin");
        $this->line("\nExamples:");
        $this->line("  php artisan telegram:whitelist list");
        $this->line("  php artisan telegram:whitelist add --chat-id=123456789 --name='Admin Wildan'");
        $this->line("  php artisan telegram:whitelist remove --chat-id=123456789");
        $this->line("  php artisan telegram:whitelist toggle --chat-id=123456789");
    }
}
