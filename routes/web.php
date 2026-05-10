<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\OnboardingController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [\App\Http\Controllers\WelcomeController::class, 'index'])->name('welcome');

Route::get('/login', function () {
    return Inertia::render('Auth/Login');
})->name('login');

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
Route::post('/logout', \App\Http\Controllers\Auth\LogoutController::class)->name('logout');
Route::post('/language', [\App\Http\Controllers\LanguageController::class, 'switch'])->name('language.switch');

Route::middleware('web')->group(function () {
    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');

    Route::get('/api/locations/cities', [\App\Http\Controllers\Api\LocationController::class, 'cities'])->name('api.locations.cities');
});

// Placeholder for protected dashboard
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Profile updates
    Route::get('/profile/edit', [\App\Http\Controllers\ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [\App\Http\Controllers\ProfileController::class, 'update'])->name('profile.update');

    Route::get('/directory', [\App\Domains\Alumni\Controllers\DirectoryController::class, 'index'])->name('directory.index');
    Route::get('/p/{slug}', [\App\Domains\Alumni\Controllers\DirectoryController::class, 'show'])->name('directory.show');

    // Events routes
    Route::get('/events', [\App\Domains\Event\Controllers\EventController::class, 'index'])->name('events.index');
    Route::post('/events/{slug}/rsvp', [\App\Domains\Event\Controllers\RsvpController::class, 'store'])->name('events.rsvp');

    // Payment routes (authenticated user)
    Route::get('/payments/{id}', [\App\Domains\Event\Controllers\PaymentController::class, 'show'])->name('payments.show');
    Route::post('/payments/{id}/proof', [\App\Domains\Event\Controllers\PaymentProofController::class, 'store'])->name('payments.proof.store');

    // Baitul Maal routes
    Route::get('/maal', [\App\Domains\Donation\Controllers\CampaignController::class, 'index'])->name('maal.index');
    Route::get('/maal/campaigns/{slug}', [\App\Domains\Donation\Controllers\CampaignController::class, 'show'])->name('maal.show');
    Route::post('/maal/donate', [\App\Domains\Donation\Controllers\DonationController::class, 'store'])->name('maal.donate');
});

// Public Event Detail Route
Route::get('/events/{slug}', [\App\Domains\Event\Controllers\EventController::class, 'show'])->name('events.show');

// Hash-based payment pages (public – hash is the access token)
Route::get('/payment/{hash}', [\App\Domains\Event\Controllers\PaymentPageController::class, 'show'])->name('payment.show');
Route::get('/payment-confirmation/{hash}', [\App\Domains\Event\Controllers\PaymentPageController::class, 'confirmationShow'])->name('payment.confirmation.show');
Route::post('/payment-confirmation/{hash}', [\App\Domains\Event\Controllers\PaymentPageController::class, 'confirmationStore'])->name('payment.confirmation.store');

// iPaymu webhook (exempt from CSRF – verified by provider signature)
Route::post('/payments/ipaymu/webhook', [\App\Domains\Event\Controllers\PaymentController::class, 'ipaymuWebhook'])
    ->name('payments.ipaymu.webhook')
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class]);

// ─── God Mode ────────────────────────────────────────────────────────────────
Route::prefix('god-mode')->name('god-mode.')->group(function () {
    Route::get('/login', [\App\Domains\GodMode\Controllers\AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [\App\Domains\GodMode\Controllers\AuthController::class, 'login'])->name('login.post');
    Route::post('/logout', [\App\Domains\GodMode\Controllers\AuthController::class, 'logout'])->name('logout');

    Route::middleware('god-mode.auth')->group(function () {
        Route::get('/', [\App\Domains\GodMode\Controllers\DashboardController::class, 'index'])->name('dashboard');

        // Users
        Route::get('/users', [\App\Domains\GodMode\Controllers\UserController::class, 'index'])->name('users.index');
        Route::get('/users/{id}', [\App\Domains\GodMode\Controllers\UserController::class, 'show'])->name('users.show');
        Route::patch('/users/{id}/verify', [\App\Domains\GodMode\Controllers\UserController::class, 'toggleVerify'])->name('users.verify');

        // Events
        Route::get('/events', [\App\Domains\GodMode\Controllers\EventController::class, 'index'])->name('events.index');
        Route::get('/events/{id}', [\App\Domains\GodMode\Controllers\EventController::class, 'show'])->name('events.show');
        Route::get('/events/{id}/edit', [\App\Domains\GodMode\Controllers\EventController::class, 'edit'])->name('events.edit');
        Route::put('/events/{id}', [\App\Domains\GodMode\Controllers\EventController::class, 'update'])->name('events.update');

        // Event Packages
        Route::get('/events/{event}/packages', [\App\Domains\GodMode\Controllers\EventPackageController::class, 'index'])->name('events.packages.index');
        Route::post('/events/{event}/packages', [\App\Domains\GodMode\Controllers\EventPackageController::class, 'store'])->name('events.packages.store');
        Route::post('/events/{event}/packages/{package}', [\App\Domains\GodMode\Controllers\EventPackageController::class, 'update'])->name('events.packages.update');
        Route::delete('/events/{event}/packages/{package}', [\App\Domains\GodMode\Controllers\EventPackageController::class, 'destroy'])->name('events.packages.destroy');

        // Event Addons
        Route::get('/events/{event}/addons', [\App\Domains\GodMode\Controllers\EventAddonController::class, 'index'])->name('events.addons.index');
        Route::post('/events/{event}/addons', [\App\Domains\GodMode\Controllers\EventAddonController::class, 'store'])->name('events.addons.store');
        Route::post('/events/{event}/addons/{addon}', [\App\Domains\GodMode\Controllers\EventAddonController::class, 'update'])->name('events.addons.update');
        Route::delete('/events/{event}/addons/{addon}', [\App\Domains\GodMode\Controllers\EventAddonController::class, 'destroy'])->name('events.addons.destroy');

        // Payments (manual transfer approval)
        Route::get('/payments', [\App\Domains\GodMode\Controllers\PaymentController::class, 'index'])->name('payments.index');
        Route::post('/payments/{id}/approve', [\App\Domains\GodMode\Controllers\PaymentController::class, 'approve'])->name('payments.approve');
        Route::post('/payments/{id}/reject', [\App\Domains\GodMode\Controllers\PaymentController::class, 'reject'])->name('payments.reject');
        Route::get('/payments/{id}/proof', [\App\Domains\GodMode\Controllers\PaymentController::class, 'downloadProof'])->name('payments.proof');

        // Consulates
        Route::get('/consulates', [\App\Domains\GodMode\Controllers\ConsulateController::class, 'index'])->name('consulates.index');
        Route::post('/consulates', [\App\Domains\GodMode\Controllers\ConsulateController::class, 'store'])->name('consulates.store');
        Route::patch('/consulates/{id}', [\App\Domains\GodMode\Controllers\ConsulateController::class, 'update'])->name('consulates.update');
        Route::delete('/consulates/{id}', [\App\Domains\GodMode\Controllers\ConsulateController::class, 'destroy'])->name('consulates.destroy');

        // Email Tester
        Route::get('/email-tester', [\App\Domains\GodMode\Controllers\EmailTesterController::class, 'index'])->name('email-tester.index');
        Route::post('/email-tester/send', [\App\Domains\GodMode\Controllers\EmailTesterController::class, 'send'])->name('email-tester.send');
    });
});
