<?php

use App\Domains\Alumni\Controllers\DirectoryController;
use App\Domains\Donation\Controllers\CampaignController;
use App\Domains\Donation\Controllers\DonationController;
use App\Domains\Event\Controllers\EventController;
use App\Domains\Event\Controllers\PaymentController;
use App\Domains\Event\Controllers\PaymentPageController;
use App\Domains\Event\Controllers\PaymentProofController;
use App\Domains\Event\Controllers\RsvpController;
use App\Domains\GodMode\Controllers\AdminActivityLogController;
use App\Domains\GodMode\Controllers\AdminManagementController;
use App\Domains\GodMode\Controllers\AuthController;
use App\Domains\GodMode\Controllers\ConsulateController;
use App\Domains\GodMode\Controllers\EmailTesterController;
use App\Domains\GodMode\Controllers\EventAddonController;
use App\Domains\GodMode\Controllers\EventPackageController;
use App\Domains\GodMode\Controllers\HomepageHighlightController;
use App\Domains\GodMode\Controllers\PageController as GodModePageController;
use App\Domains\GodMode\Controllers\PaymentSettingController;
use App\Domains\GodMode\Controllers\ProductSearchController;
use App\Domains\GodMode\Controllers\StoreBadgeController;
use App\Domains\GodMode\Controllers\UserController;
use App\Domains\Page\Controllers\PageController as PublicPageController;
use App\Domains\Shared\Controllers\PaymentChannelController;
use App\Domains\Shared\Controllers\SatuteraWebhookController;
use App\Domains\Shared\Controllers\TelegramWebhookController;
use App\Domains\Store\Controllers\CartController;
use App\Domains\Store\Controllers\CheckoutController;
use App\Domains\Store\Controllers\ProductController;
use App\Domains\Store\Controllers\ShippingController;
use App\Domains\Store\Controllers\StoreApplicationController;
use App\Domains\Store\Controllers\StoreController;
use App\Domains\Store\Controllers\StoreDirectoryController;
use App\Domains\Store\Controllers\StoreDownloadController;
use App\Domains\Store\Controllers\StoreEventReservationController;
use App\Domains\Store\Controllers\StoreMemberController;
use App\Domains\Store\Controllers\StoreOrderController;
use App\Domains\Store\Controllers\StoreOrderManagementController;
use App\Domains\Store\Controllers\StorePaymentPageController;
use App\Domains\Store\Controllers\StorePaymentProofController;
use App\Domains\Store\Controllers\StoreShippingMethodController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\OnboardingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserAddressController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [WelcomeController::class, 'index'])->name('welcome');

Route::get('/login', function () {
    return Inertia::render('Auth/Login');
})->name('login');

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
Route::post('/logout', LogoutController::class)->name('logout');
Route::post('/language', [LanguageController::class, 'switch'])->name('language.switch');

Route::middleware('web')->group(function () {
    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');

    Route::get('/api/locations/cities', [LocationController::class, 'cities'])->name('api.locations.cities');
    Route::get('/api/locations/foreign-cities', [LocationController::class, 'foreignCities'])->name('api.locations.foreign-cities');
    Route::get('/api/locations/provinces', [LocationController::class, 'provinces'])->name('api.locations.provinces');
    Route::get('/api/locations/districts', [LocationController::class, 'districts'])->name('api.locations.districts');
    Route::get('/api/locations/villages', [LocationController::class, 'villages'])->name('api.locations.villages');
});

// Placeholder for protected dashboard
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Profile updates
    Route::get('/profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::get('/directory', [DirectoryController::class, 'index'])->name('directory.index');
    Route::get('/p/{slug}', [DirectoryController::class, 'show'])->name('directory.show');

    // Events routes
    Route::get('/events', [EventController::class, 'index'])->name('events.index');
    Route::post('/events/{slug}/rsvp', [RsvpController::class, 'store'])->name('events.rsvp');
    Route::get('/rsvps/{id}/edit', [RsvpController::class, 'edit'])->name('rsvps.edit');
    Route::put('/rsvps/{id}', [RsvpController::class, 'update'])->name('rsvps.update');

    // Payment routes (authenticated user)
    Route::get('/payments/{id}', [PaymentController::class, 'show'])->name('payments.show');
    Route::post('/payments/{id}/proof', [PaymentProofController::class, 'store'])->name('payments.proof.store');
    Route::post('/payments/{id}/cancel', [PaymentController::class, 'cancel'])->name('payments.cancel');
    Route::get('/payments/proof/{id}', [PaymentProofController::class, 'show'])->name('payments.proof.show');
    Route::get('/payments/proof/{id}/download', [PaymentProofController::class, 'download'])->name('payments.proof.download');

    // Baitul Maal routes
    Route::get('/maal', [CampaignController::class, 'index'])->name('maal.index');
    Route::get('/maal/campaigns/{slug}', [CampaignController::class, 'show'])->name('maal.show');
    Route::post('/maal/donate', [DonationController::class, 'store'])->name('maal.donate');

    // Store module (seller-facing)
    Route::prefix('my/stores')->name('stores.')->group(function () {
        Route::get('/', [StoreApplicationController::class, 'index'])->name('mine');
        Route::get('/create', [StoreApplicationController::class, 'create'])->name('create');
        Route::post('/', [StoreApplicationController::class, 'store'])->name('store');
        Route::get('/{store}', [StoreController::class, 'show'])->name('manage');
        Route::get('/{store}/settings', [StoreController::class, 'editSettings'])->name('settings');
        Route::patch('/{store}', [StoreController::class, 'update'])->name('update');
        Route::get('/{store}/address', [StoreController::class, 'editAddress'])->name('address.edit');
        Route::post('/{store}/address', [StoreController::class, 'updateAddress'])->name('address.store');
        Route::get('/{store}/members', [StoreMemberController::class, 'index'])->name('members.index');
        Route::post('/{store}/members', [StoreMemberController::class, 'invite'])->name('members.invite');
        Route::delete('/{store}/members/{member}', [StoreMemberController::class, 'revoke'])->name('members.revoke');

        Route::get('/{store}/products', [ProductController::class, 'index'])->name('products.index');
        Route::get('/{store}/products/create', [ProductController::class, 'create'])->name('products.create');
        Route::post('/{store}/products', [ProductController::class, 'store'])->name('products.store');
        Route::get('/{store}/products/{product}/edit', [ProductController::class, 'edit'])->name('products.edit');
        Route::put('/{store}/products/{product}', [ProductController::class, 'update'])->name('products.update');
        Route::patch('/{store}/products/{product}/status', [ProductController::class, 'updateStatus'])->name('products.status');
        Route::delete('/{store}/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');

        Route::get('/{store}/orders', [StoreOrderManagementController::class, 'index'])->name('orders.index');
        Route::get('/{store}/orders/{order}', [StoreOrderManagementController::class, 'show'])->name('orders.show');
        Route::post('/{store}/orders/{order}/process', [StoreOrderManagementController::class, 'process'])->name('orders.process');
        Route::post('/{store}/orders/{order}/ship', [StoreOrderManagementController::class, 'ship'])->name('orders.ship');
        Route::post('/{store}/orders/{order}/cancel', [StoreOrderManagementController::class, 'cancel'])->name('orders.cancel');
        Route::patch('/{store}/orders/{order}/status', [StoreOrderManagementController::class, 'updateStatus'])->name('orders.status.update');

        Route::get('/{store}/shipping-methods', [StoreShippingMethodController::class, 'index'])->name('shipping-methods.index');
        Route::get('/{store}/shipping-methods/create', [StoreShippingMethodController::class, 'create'])->name('shipping-methods.create');
        Route::post('/{store}/shipping-methods', [StoreShippingMethodController::class, 'store'])->name('shipping-methods.store');
        Route::get('/{store}/shipping-methods/{shippingMethod}/edit', [StoreShippingMethodController::class, 'edit'])->name('shipping-methods.edit');
        Route::put('/{store}/shipping-methods/{shippingMethod}', [StoreShippingMethodController::class, 'update'])->name('shipping-methods.update');
        Route::patch('/{store}/shipping-methods/{shippingMethod}/status', [StoreShippingMethodController::class, 'updateStatus'])->name('shipping-methods.status');
        Route::delete('/{store}/shipping-methods/{shippingMethod}', [StoreShippingMethodController::class, 'destroy'])->name('shipping-methods.destroy');

        // "Pesanan Event" recap (fase 8) — JSON, not an Inertia prop (CLAUDE.md: no unbounded
        // datasets in Inertia props).
        Route::get('/{store}/event-reservations', [StoreEventReservationController::class, 'page'])->name('event-reservations');
        Route::get('/{store}/api-event-reservations', [StoreEventReservationController::class, 'index'])->name('api-event-reservations');
    });

    Route::get('/store-invitations/{token}', [StoreMemberController::class, 'invitationShow'])->name('stores.invitations.show');
    Route::post('/store-invitations/{token}', [StoreMemberController::class, 'invitationAccept'])->name('stores.invitations.accept');

    // Buyer address book (JSON, consumed by AddressPicker inside checkout — not a full page)
    Route::prefix('my/addresses')->name('addresses.')->group(function () {
        Route::get('/', [UserAddressController::class, 'index'])->name('index');
        Route::post('/', [UserAddressController::class, 'store'])->name('store');
        Route::put('/{id}', [UserAddressController::class, 'update'])->name('update');
        Route::delete('/{id}', [UserAddressController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/default', [UserAddressController::class, 'setDefault'])->name('default');
    });

    // Cart (per-store)
    Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
    Route::post('/cart/items', [CartController::class, 'store'])->name('cart.items.store');
    Route::patch('/cart/items/{id}', [CartController::class, 'updateQty'])->name('cart.items.update');
    Route::delete('/cart/items/{id}', [CartController::class, 'destroy'])->name('cart.items.destroy');

    // Shipping rates — billed RajaOngkir lookup per call
    Route::post('/api/shipping/rates', [ShippingController::class, 'rates'])
        ->name('api.shipping.rates')
        ->middleware('throttle:30,1');

    // Checkout
    Route::get('/checkout/{store:slug}', [CheckoutController::class, 'show'])->name('checkout.show');
    Route::post('/checkout/{store:slug}', [CheckoutController::class, 'store'])->name('checkout.store');

    // Buyer order history
    Route::get('/store/orders', [StoreOrderController::class, 'index'])->name('store.orders.index');
    Route::get('/store/orders/{id}', [StoreOrderController::class, 'show'])->name('store.orders.show');
    Route::post('/store/orders/{id}/complete', [StoreOrderController::class, 'complete'])->name('store.orders.complete');

    // Digital product delivery — ownership/quota/expiry checked in the controller
    Route::get('/downloads/{token}', [StoreDownloadController::class, 'show'])->name('store.downloads.show');
});

// Public Store directory & storefront
Route::get('/stores', [StoreDirectoryController::class, 'index'])->name('stores.directory');
Route::get('/stores/{store:slug}', [StoreDirectoryController::class, 'show'])->name('stores.show');
Route::get('/stores/{store:slug}/products/{productSlug}', [StoreDirectoryController::class, 'productShow'])->name('stores.products.show');

// Public Event Detail Route
Route::get('/events/{slug}', [EventController::class, 'show'])->name('events.show');

// Public API: Payment channels data
Route::get('/api/payment-channels', [EventController::class, 'paymentChannels'])->name('api.payment-channels');

// Debug API: iPaymu configuration check (only in debug mode)
Route::get('/api/debug/ipaymu-config', [PaymentController::class, 'debugIPaymuConfig'])->name('api.debug.ipaymu-config');

// Hash-based payment pages (public – hash is the access token)
Route::get('/payment/{hash}', [PaymentPageController::class, 'show'])->name('payment.show');
Route::get('/payment/{hash}/status', [PaymentPageController::class, 'status'])->name('payment.status');
Route::get('/payment-confirmation/{hash}', [PaymentPageController::class, 'confirmationShow'])->name('payment.confirmation.show');
Route::post('/payment-confirmation/{hash}', [PaymentPageController::class, 'confirmationStore'])->name('payment.confirmation.store');

// Store order payment page (separate from the RSVP page above — see MVP2 README decision D8)
Route::get('/store/payment/{hash}', [StorePaymentPageController::class, 'show'])->name('store.payment.show');
Route::get('/store/payment/{hash}/status', [StorePaymentPageController::class, 'status'])->name('store.payment.status');
Route::post('/store/payment/{hash}/proof', [StorePaymentProofController::class, 'store'])->name('store.payment.proof.store');

// Public, credential-free payment channel catalog (cached). Context-neutral endpoint (fase 9,
// D40); /api/store/payment-channels kept as an alias to the same handler so Pages/Store/Checkout.tsx
// doesn't need to change in this release.
Route::get('/api/payment/channels', [PaymentChannelController::class, 'index'])->name('api.payment.channels');
Route::get('/api/store/payment-channels', [PaymentChannelController::class, 'index'])->name('api.store.payment-channels');

// iPaymu webhook (exempt from CSRF – verified by provider signature)
Route::post('/payments/ipaymu/webhook', [PaymentController::class, 'ipaymuWebhook'])
    ->name('payments.ipaymu.webhook')
    ->withoutMiddleware([PreventRequestForgery::class]);

// Satutera webhook (exempt from CSRF – verified by HMAC signature)
Route::post('/webhooks/satutera/payment', [SatuteraWebhookController::class, 'handle'])
    ->name('webhooks.satutera.payment')
    ->withoutMiddleware([PreventRequestForgery::class]);

// Telegram bot webhook (exempt from CSRF – verified by whitelist check)
Route::post('/telegram/webhook', [TelegramWebhookController::class, 'handle'])
    ->name('telegram.webhook')
    ->withoutMiddleware([PreventRequestForgery::class]);

// Telegram webhook test/debug (raw logging)
Route::post('/telegram/webhook-debug', function (Request $request) {
    Log::info('🔍 Telegram webhook debug request received', [
        'update_id' => $request->input('update_id'),
        'message' => $request->input('message.text'),
        'from_id' => $request->input('message.from.id'),
        'chat_id' => $request->input('message.chat.id'),
        'all_keys' => array_keys($request->all()),
        'raw_body' => $request->getContent(),
    ]);

    return response('ok', 200);
})
    ->name('telegram.webhook.debug')
    ->withoutMiddleware([PreventRequestForgery::class]);

// ─── God Mode ────────────────────────────────────────────────────────────────
Route::prefix('god-mode')->name('god-mode.')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::get('/auth/google', [AuthController::class, 'redirectToGoogle'])->name('auth.google');
    Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback'])->name('auth.google.callback');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::middleware('god-mode.auth')->group(function () {
        Route::get('/', [App\Domains\GodMode\Controllers\DashboardController::class, 'index'])->name('dashboard');

        // Admins Management
        Route::get('/admins', [AdminManagementController::class, 'index'])->name('admins.index');
        Route::post('/admins', [AdminManagementController::class, 'store'])->name('admins.store');
        Route::delete('/admins/{id}', [AdminManagementController::class, 'destroy'])->name('admins.destroy');

        // Admin Activity Logs
        Route::get('/activity-logs', [AdminActivityLogController::class, 'index'])->name('activity-logs.index');

        // Pages
        Route::get('/pages/check-slug', [GodModePageController::class, 'checkSlug'])->name('pages.check-slug');
        Route::get('/pages', [GodModePageController::class, 'index'])->name('pages.index');
        Route::get('/pages/create', [GodModePageController::class, 'create'])->name('pages.create');
        Route::post('/pages', [GodModePageController::class, 'store'])->name('pages.store');
        Route::get('/pages/{page}/edit', [GodModePageController::class, 'edit'])->name('pages.edit');
        Route::put('/pages/{page}', [GodModePageController::class, 'update'])->name('pages.update');
        Route::delete('/pages/{page}', [GodModePageController::class, 'destroy'])->name('pages.destroy');

        // Users
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/users-search', [UserController::class, 'search'])->name('users.search');
        Route::get('/users/{id}', [UserController::class, 'show'])->name('users.show');
        Route::patch('/users/{id}/verify', [UserController::class, 'toggleVerify'])->name('users.verify');

        // Events
        Route::get('/events', [App\Domains\GodMode\Controllers\EventController::class, 'index'])->name('events.index');
        // Must be registered before /events/{id} — otherwise "create" is captured as the {id}.
        Route::get('/events/create', [App\Domains\GodMode\Controllers\EventController::class, 'create'])->name('events.create');
        Route::post('/events', [App\Domains\GodMode\Controllers\EventController::class, 'store'])->name('events.store');
        Route::get('/events/{id}', [App\Domains\GodMode\Controllers\EventController::class, 'show'])->name('events.show');
        Route::get('/events/{id}/api-rsvps', [App\Domains\GodMode\Controllers\EventController::class, 'apiRsvps'])->name('events.api-rsvps');
        Route::get('/events/{id}/edit', [App\Domains\GodMode\Controllers\EventController::class, 'edit'])->name('events.edit');
        Route::put('/events/{id}', [App\Domains\GodMode\Controllers\EventController::class, 'update'])->name('events.update');
        Route::patch('/events/{id}/toggle-registration', [App\Domains\GodMode\Controllers\EventController::class, 'toggleRegistration'])->name('events.toggle-registration');
        Route::get('/events/{id}/manual-register', [App\Domains\GodMode\Controllers\EventController::class, 'createManualRegister'])->name('events.manual-register.create');
        Route::post('/events/{id}/manual-register', [App\Domains\GodMode\Controllers\EventController::class, 'manualRegister'])->name('events.manual-register');
        Route::get('/events/{id}/participants/{rsvp_id}', [App\Domains\GodMode\Controllers\EventController::class, 'participantShow'])->name('events.participants.show');
        Route::delete('/events/{id}/participants/{rsvp_id}', [App\Domains\GodMode\Controllers\EventController::class, 'participantDestroy'])->name('events.participants.destroy');
        Route::get('/events/{id}/export-excel', [App\Domains\GodMode\Controllers\EventController::class, 'exportExcel'])->name('events.export-excel');
        Route::get('/events/{id}/export-csv/{type}', [App\Domains\GodMode\Controllers\EventController::class, 'exportCsv'])->name('events.export-csv');

        // Event Packages
        Route::get('/events/{event}/packages', [EventPackageController::class, 'index'])->name('events.packages.index');
        Route::post('/events/{event}/packages', [EventPackageController::class, 'store'])->name('events.packages.store');
        Route::put('/events/{event}/packages/{package}', [EventPackageController::class, 'update'])->name('events.packages.update');
        Route::delete('/events/{event}/packages/{package}', [EventPackageController::class, 'destroy'])->name('events.packages.destroy');

        // Event Addons
        Route::get('/events/{event}/addons', [EventAddonController::class, 'index'])->name('events.addons.index');
        Route::post('/events/{event}/addons', [EventAddonController::class, 'store'])->name('events.addons.store');
        Route::post('/events/{event}/addons/from-product', [EventAddonController::class, 'storeFromProduct'])->name('events.addons.store-from-product');
        Route::put('/events/{event}/addons/{addon}', [EventAddonController::class, 'update'])->name('events.addons.update');
        Route::delete('/events/{event}/addons/{addon}', [EventAddonController::class, 'destroy'])->name('events.addons.destroy');

        // Product-linked addon stock recap (fase 8 §5.3)
        Route::get('/events/{event}/api-product-reservations', [App\Domains\GodMode\Controllers\EventController::class, 'apiProductReservations'])->name('events.api-product-reservations');
        Route::post('/events/{event}/product-reservations/{reservation}/fulfill', [App\Domains\GodMode\Controllers\EventController::class, 'fulfillProductReservation'])->name('events.product-reservations.fulfill');

        // Cross-store product search for the addon-linking modal (fase 8 §5.1)
        Route::get('/api/products/search', [ProductSearchController::class, 'index'])->name('api.products.search');

        // Payments (manual transfer approval)
        Route::get('/payments', [App\Domains\GodMode\Controllers\PaymentController::class, 'index'])->name('payments.index');
        Route::post('/payments/{id}/approve', [App\Domains\GodMode\Controllers\PaymentController::class, 'approve'])->name('payments.approve');
        Route::post('/payments/{id}/reject', [App\Domains\GodMode\Controllers\PaymentController::class, 'reject'])->name('payments.reject');
        Route::get('/payments/{id}/proof', [App\Domains\GodMode\Controllers\PaymentController::class, 'downloadProof'])->name('payments.proof');

        // Payment settings (Fase 7 — gateway toggle/credentials + manual transfer accounts)
        Route::get('/settings/payments', [PaymentSettingController::class, 'index'])->name('settings.payments.index');
        Route::put('/settings/payments/{code}', [PaymentSettingController::class, 'update'])->name('settings.payments.update');
        Route::post('/settings/payments/{code}/test', [PaymentSettingController::class, 'test'])->name('settings.payments.test');
        Route::post('/settings/payments/manual-accounts', [PaymentSettingController::class, 'storeManualAccount'])->name('settings.manual-accounts.store');
        Route::put('/settings/payments/manual-accounts/{id}', [PaymentSettingController::class, 'updateManualAccount'])->name('settings.manual-accounts.update');
        Route::delete('/settings/payments/manual-accounts/{id}', [PaymentSettingController::class, 'destroyManualAccount'])->name('settings.manual-accounts.destroy');

        // Consulates
        Route::get('/consulates', [ConsulateController::class, 'index'])->name('consulates.index');
        Route::post('/consulates', [ConsulateController::class, 'store'])->name('consulates.store');
        Route::patch('/consulates/{id}', [ConsulateController::class, 'update'])->name('consulates.update');
        Route::delete('/consulates/{id}', [ConsulateController::class, 'destroy'])->name('consulates.destroy');

        // Email Tester
        Route::get('/email-tester', [EmailTesterController::class, 'index'])->name('email-tester.index');
        Route::post('/email-tester/send', [EmailTesterController::class, 'send'])->name('email-tester.send');

        // Stores
        Route::get('/stores', [App\Domains\GodMode\Controllers\StoreController::class, 'index'])->name('stores.index');
        Route::get('/stores/create', [App\Domains\GodMode\Controllers\StoreController::class, 'create'])->name('stores.create');
        Route::post('/stores', [App\Domains\GodMode\Controllers\StoreController::class, 'store'])->name('stores.store');
        Route::get('/stores/{id}', [App\Domains\GodMode\Controllers\StoreController::class, 'show'])->name('stores.show');
        Route::post('/stores/{id}/approve', [App\Domains\GodMode\Controllers\StoreController::class, 'approve'])->name('stores.approve');
        Route::post('/stores/{id}/reject', [App\Domains\GodMode\Controllers\StoreController::class, 'reject'])->name('stores.reject');
        Route::post('/stores/{id}/suspend', [App\Domains\GodMode\Controllers\StoreController::class, 'suspend'])->name('stores.suspend');
        Route::post('/stores/{id}/badges', [StoreBadgeController::class, 'assign'])->name('stores.badges.assign');
        Route::delete('/stores/{id}/badges/{badgeId}', [StoreBadgeController::class, 'revoke'])->name('stores.badges.revoke');

        // Store Badges catalog
        Route::get('/store-badges', [StoreBadgeController::class, 'index'])->name('store-badges.index');
        Route::post('/store-badges', [StoreBadgeController::class, 'store'])->name('store-badges.store');
        Route::put('/store-badges/{id}', [StoreBadgeController::class, 'update'])->name('store-badges.update');
        Route::delete('/store-badges/{id}', [StoreBadgeController::class, 'destroy'])->name('store-badges.destroy');

        // Store Orders
        Route::get('/store-orders', [App\Domains\GodMode\Controllers\StoreOrderController::class, 'index'])->name('store-orders.index');
        Route::get('/store-orders/{id}', [App\Domains\GodMode\Controllers\StoreOrderController::class, 'show'])->name('store-orders.show');
        Route::patch('/store-orders/{id}/status', [App\Domains\GodMode\Controllers\StoreOrderController::class, 'updateStatus'])->name('store-orders.status.update');
        Route::get('/store-orders-export', [App\Domains\GodMode\Controllers\StoreOrderController::class, 'exportExcel'])->name('store-orders.export');

        // Homepage Highlights (fase 10 — docs/plan/mvp2/10-storefront-frontside-ux.md)
        Route::get('/homepage-highlights', [HomepageHighlightController::class, 'index'])->name('homepage-highlights.index');
        Route::post('/homepage-highlights', [HomepageHighlightController::class, 'store'])->name('homepage-highlights.store');
        Route::patch('/homepage-highlights/{id}', [HomepageHighlightController::class, 'update'])->name('homepage-highlights.update');
        Route::delete('/homepage-highlights/{id}', [HomepageHighlightController::class, 'destroy'])->name('homepage-highlights.destroy');
    });
});

// Public CMS pages use a final, single-segment catch-all. Keeping this route last guarantees that
// every application route above wins before a published page slug is considered.
Route::get('/{page:slug}', [PublicPageController::class, 'show'])
    ->where('page', '[a-z0-9]+(?:-[a-z0-9]+)*')
    ->name('pages.show');
