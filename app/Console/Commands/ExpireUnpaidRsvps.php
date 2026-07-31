<?php

namespace App\Console\Commands;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Store\Services\ProductStockService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpireUnpaidRsvps extends Command
{
    protected $signature = 'events:expire-unpaid-rsvps';

    protected $description = 'Expire pending RSVPs past their payment window and release any product reservations they hold';

    public function handle(ProductStockService $productStock): int
    {
        $count = 0;
        $cutoff = now()->subMinutes((int) config('events.rsvp_expiry_minutes', 1440));

        Rsvp::where('status', 'pending')
            ->where(function ($query) use ($cutoff) {
                // A transaction that actually got a provider-side expiry window (Satutera/iPaymu)
                // is authoritative; otherwise fall back to plain RSVP age (covers manual transfer,
                // which never gets an expires_at from a provider).
                $query->whereHas('transactions', function ($t) {
                    $t->where('status', 'pending')->whereNotNull('expired_at')->where('expired_at', '<', now());
                })->orWhere('created_at', '<', $cutoff);
            })
            // A buyer who already transferred and uploaded proof must not lose the RSVP just
            // because admin review is running behind — same exception as `store:expire-orders`
            // (docs/plan/mvp2/7-payment-settings.md §6a, docs/plan/mvp2/8-event-product-integration.md
            // §4). A *reviewed* manual transaction never blocks this: approval already moved the
            // RSVP to `paid`, so it's no longer `pending` and this whole query skips it anyway.
            ->whereDoesntHave('transactions', function ($query) {
                $query->where('payment_provider', 'manual')
                    ->where('status', 'pending')
                    ->whereHas('proof', fn ($proof) => $proof->whereNull('reviewed_at'));
            })
            ->chunkById(100, function ($rsvps) use (&$count) {
                foreach ($rsvps as $rsvp) {
                    DB::transaction(function () use ($rsvp) {
                        $locked = Rsvp::where('id', $rsvp->id)->lockForUpdate()->first();

                        // Another process (a late webhook, a concurrent run) may have already
                        // moved this RSVP past pending — skip it rather than clobber it.
                        if (! $locked || $locked->status !== 'pending') {
                            return;
                        }

                        // RsvpObserver::updating() reacts to the expired transition by releasing
                        // any product reservations this RSVP holds — nothing to do here beyond the
                        // status change itself. It's independently idempotent (only touches rows
                        // still `reserved`), so a concurrent run of this same command can't
                        // double-credit stock.
                        $locked->update(['status' => 'expired']);
                        $locked->transactions()->where('status', 'pending')->update(['status' => 'expired']);
                    });

                    $count++;
                }
            });

        $this->info("Expired {$count} unpaid RSVP(s).");

        return self::SUCCESS;
    }
}
