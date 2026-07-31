<?php

namespace App\Providers;

use App\Contracts\PaymentProviderInterface;
use App\Contracts\ShippingProviderInterface;
use App\Domains\Donation\Models\Campaign;
use App\Domains\Donation\Models\CampaignUpdate;
use App\Domains\Donation\Models\Donation;
use App\Domains\Donation\Models\Fund;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\EventAddonVariant;
use App\Domains\Event\Models\EventPackage;
use App\Domains\Event\Models\PaymentProof;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Event\Observers\RsvpObserver;
use App\Domains\Shared\Services\IPaymuService;
use App\Domains\Shared\Services\RajaOngkirService;
use App\Domains\Store\Models\DigitalDelivery;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductReservation;
use App\Domains\Store\Models\ProductVariant;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreAddress;
use App\Domains\Store\Models\StoreBadge;
use App\Domains\Store\Models\StoreBadgeAssignment;
use App\Domains\Store\Models\StoreMember;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Models\StoreOrderItem;
use App\Domains\Store\Models\StoreShippingMethod;
use App\Domains\Store\Policies\StorePolicy;
use App\Models\Admin;
use App\Models\Consulate;
use App\Models\ConsulateCity;
use App\Models\Option;
use App\Models\PaymentGateway;
use App\Models\PaymentManualAccount;
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

        // Pre-existing gap found while wiring Fase 7 (docs/plan/mvp2/7-payment-settings.md): this
        // was never bound anywhere, so `app(PaymentProviderInterface::class)` — used by the live
        // `/payments/ipaymu/webhook` handler — threw BindingResolutionException on every call.
        $this->app->bind(PaymentProviderInterface::class, IPaymuService::class);
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
        EventAddonVariant::observe(DeletedItemObserver::class);
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
        StoreBadge::observe(DeletedItemObserver::class);
        StoreBadgeAssignment::observe(DeletedItemObserver::class);
        ProductReservation::observe(DeletedItemObserver::class);

        PaymentGateway::observe(DeletedItemObserver::class);
        PaymentManualAccount::observe(DeletedItemObserver::class);

        // Pre-existing gap found while wiring fase 8 (docs/plan/mvp2/8-event-product-integration.md
        // §1 finding #6): every other Event model (Event, EventPackage, EventAddon, Transaction) was
        // registered here except Rsvp, so deleting an RSVP left zero audit trail. Fixed in the same
        // release that starts depending on RSVP deletion to trigger stock release (RsvpObserver).
        Rsvp::observe(DeletedItemObserver::class);

        Gate::policy(Store::class, StorePolicy::class);
    }
}
