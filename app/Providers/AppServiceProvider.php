<?php

namespace App\Providers;

use App\Contracts\ShippingProviderInterface;
use App\Domains\Donation\Models\Campaign;
use App\Domains\Donation\Models\CampaignUpdate;
use App\Domains\Donation\Models\Donation;
use App\Domains\Donation\Models\Fund;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\EventPackage;
use App\Domains\Event\Models\PaymentProof;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Event\Observers\RsvpObserver;
use App\Domains\Shared\Services\RajaOngkirService;
use App\Domains\Store\Models\DigitalDelivery;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductVariant;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreAddress;
use App\Domains\Store\Models\StoreMember;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Models\StoreOrderItem;
use App\Domains\Store\Models\StoreShippingMethod;
use App\Domains\Store\Policies\StorePolicy;
use App\Models\Admin;
use App\Models\Consulate;
use App\Models\ConsulateCity;
use App\Models\Option;
use App\Models\Setting;
use App\Models\TelegramWhitelist;
use App\Models\User;
use App\Models\UserAddress;
use App\Observers\DeletedItemObserver;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(ShippingProviderInterface::class, fn () => match (config('services.shipping.default')) {
            'rajaongkir' => new RajaOngkirService,
            default => new RajaOngkirService,
        });
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

        Store::observe(DeletedItemObserver::class);
        StoreMember::observe(DeletedItemObserver::class);
        StoreAddress::observe(DeletedItemObserver::class);
        Product::observe(DeletedItemObserver::class);
        ProductVariant::observe(DeletedItemObserver::class);
        UserAddress::observe(DeletedItemObserver::class);
        StoreOrder::observe(DeletedItemObserver::class);
        StoreOrderItem::observe(DeletedItemObserver::class);
        DigitalDelivery::observe(DeletedItemObserver::class);
        StoreShippingMethod::observe(DeletedItemObserver::class);

        Gate::policy(Store::class, StorePolicy::class);
    }
}
