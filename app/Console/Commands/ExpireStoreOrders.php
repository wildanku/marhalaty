<?php

namespace App\Console\Commands;

use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Services\OrderFulfillmentService;
use App\Jobs\SendOrderExpiredEmail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpireStoreOrders extends Command
{
    protected $signature = 'store:expire-orders';

    protected $description = 'Cancel pending_payment store orders past their expires_at and release their stock';

    public function handle(OrderFulfillmentService $fulfillment): int
    {
        $count = 0;

        StoreOrder::where('status', 'pending_payment')
            ->where('expires_at', '<', now())
            // A buyer who already transferred and uploaded proof must not lose the order just
            // because admin review is running behind — only orders with no proof waiting on
            // review are fair game here (docs/plan/mvp2/7-payment-settings.md §6a). A *reviewed*
            // (approved/rejected) manual transaction never blocks this: approval already moved the
            // order out of pending_payment, and rejection already pushed expires_at into the future.
            ->whereDoesntHave('transactions', function ($query) {
                $query->where('payment_provider', 'manual')
                    ->where('status', 'pending')
                    ->whereHas('proof', fn ($proof) => $proof->whereNull('reviewed_at'));
            })
            ->chunkById(100, function ($orders) use ($fulfillment, &$count) {
                foreach ($orders as $order) {
                    DB::transaction(function () use ($order, $fulfillment) {
                        $locked = StoreOrder::where('id', $order->id)->lockForUpdate()->first();

                        // Another process (a late webhook, a concurrent run) may have already
                        // moved this order past pending_payment — skip it rather than clobber it.
                        if (! $locked || $locked->status !== 'pending_payment') {
                            return;
                        }

                        $locked->update(['status' => 'expired', 'cancelled_at' => now()]);
                        $locked->transactions()->where('status', 'pending')->update(['status' => 'expired']);

                        // releaseStock() is independently idempotent via stock_released_at, so a
                        // concurrent run of this same command cannot double-credit stock either.
                        $fulfillment->releaseStock($locked);
                    });

                    SendOrderExpiredEmail::dispatch($order->fresh());
                    $count++;
                }
            });

        $this->info("Expired {$count} store order(s).");

        return self::SUCCESS;
    }
}
