<?php

namespace App\Providers;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventPackage;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\Transaction;
use App\Domains\Event\Models\PaymentProof;
use App\Domains\Donation\Models\Campaign;
use App\Domains\Donation\Models\CampaignUpdate;
use App\Domains\Donation\Models\Donation;
use App\Domains\Donation\Models\Fund;
use App\Models\User;
use App\Models\Admin;
use App\Models\Consulate;
use App\Models\ConsulateCity;
use App\Models\Option;
use App\Models\Setting;
use App\Models\TelegramWhitelist;
use App\Domains\Event\Observers\RsvpObserver;
use App\Observers\DeletedItemObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register quota management observer
        Rsvp::observe(RsvpObserver::class);

        // ── Register delete tracking observer for all models ────────────────
        Event::observe(DeletedItemObserver::class);
        EventPackage::observe(DeletedItemObserver::class);
        EventAddon::observe(DeletedItemObserver::class);
        Transaction::observe(DeletedItemObserver::class);
        PaymentProof::observe(DeletedItemObserver::class);

        Campaign::observe(DeletedItemObserver::class);
        CampaignUpdate::observe(DeletedItemObserver::class);
        Donation::observe(DeletedItemObserver::class);
        Fund::observe(DeletedItemObserver::class);

        User::observe(DeletedItemObserver::class);
        Admin::observe(DeletedItemObserver::class);

        Consulate::observe(DeletedItemObserver::class);
        ConsulateCity::observe(DeletedItemObserver::class);
        Option::observe(DeletedItemObserver::class);
        Setting::observe(DeletedItemObserver::class);
        TelegramWhitelist::observe(DeletedItemObserver::class);
    }
}
