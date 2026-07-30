<?php

namespace App\Console\Commands;

use App\Domains\Store\Models\StoreOrder;
use Illuminate\Console\Command;

class CompleteShippedOrders extends Command
{
    protected $signature = 'store:complete-shipped';

    protected $description = 'Auto-complete store orders that have been shipped for more than 7 days';

    public function handle(): int
    {
        $count = StoreOrder::where('status', 'shipped')
            ->where('shipped_at', '<', now()->subDays(7))
            ->update(['status' => 'completed', 'completed_at' => now()]);

        $this->info("Completed {$count} shipped store order(s).");

        return self::SUCCESS;
    }
}
