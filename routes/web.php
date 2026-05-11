<?php

use App\Domains\Alumni\Controllers\DirectoryController;
use App\Domains\Donation\Controllers\CampaignController;
use App\Domains\Donation\Controllers\DonationController;
use App\Domains\Event\Controllers\EventController;
use App\Domains\Event\Controllers\PaymentController;
use App\Domains\Event\Controllers\PaymentPageController;
use App\Domains\Event\Controllers\PaymentProofController;
use App\Domains\Event\Controllers\RsvpController;
use App\Domains\GodMode\Controllers\AuthController;
use App\Domains\GodMode\Controllers\ConsulateController;
use App\Domains\GodMode\Controllers\EmailTesterController;
use App\Domains\GodMode\Controllers\EventAddonController;
use App\Domains\GodMode\Controllers\EventPackageController;
use App\Domains\GodMode\Controllers\UserController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\OnboardingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
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

    // Payment routes (authenticated user)
    Route::get('/payments/{id}', [PaymentController::class, 'show'])->name('payments.show');
    Route::post('/payments/{id}/proof', [PaymentProofController::class, 'store'])->name('payments.proof.store');

    // Baitul Maal routes
    Route::get('/maal', [CampaignController::class, 'index'])->name('maal.index');
    Route::get('/maal/campaigns/{slug}', [CampaignController::class, 'show'])->name('maal.show');
    Route::post('/maal/donate', [DonationController::class, 'store'])->name('maal.donate');
});

// Public Event Detail Route
Route::get('/events/{slug}', [EventController::class, 'show'])->name('events.show');

// Public API: Payment channels data
Route::get('/api/payment-channels', [EventController::class, 'paymentChannels'])->name('api.payment-channels');

// Debug API: iPaymu configuration check (only in debug mode)
Route::get('/api/debug/ipaymu-config', [PaymentController::class, 'debugIPaymuConfig'])->name('api.debug.ipaymu-config');

// Hash-based payment pages (public – hash is the access token)
Route::get('/payment/{hash}', [PaymentPageController::class, 'show'])->name('payment.show');
Route::get('/payment-confirmation/{hash}', [PaymentPageController::class, 'confirmationShow'])->name('payment.confirmation.show');
Route::post('/payment-confirmation/{hash}', [PaymentPageController::class, 'confirmationStore'])->name('payment.confirmation.store');

// iPaymu webhook (exempt from CSRF – verified by provider signature)
Route::post('/payments/ipaymu/webhook', [PaymentController::class, 'ipaymuWebhook'])
    ->name('payments.ipaymu.webhook')
    ->withoutMiddleware([VerifyCsrfToken::class]);

// Telegram bot webhook (exempt from CSRF – verified by whitelist check)
Route::post('/telegram/webhook', [App\Domains\Shared\Controllers\TelegramWebhookController::class, 'handle'])
    ->name('telegram.webhook')
    ->withoutMiddleware([VerifyCsrfToken::class]);

// Telegram webhook test/debug (raw logging)
Route::post('/telegram/webhook-debug', function (\Illuminate\Http\Request $request) {
    \Illuminate\Support\Facades\Log::info('🔍 Telegram webhook debug request received', [
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
    ->withoutMiddleware([VerifyCsrfToken::class]);

// ─── God Mode ────────────────────────────────────────────────────────────────
Route::prefix('god-mode')->name('god-mode.')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::get('/auth/google', [AuthController::class, 'redirectToGoogle'])->name('auth.google');
    Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback'])->name('auth.google.callback');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::middleware('god-mode.auth')->group(function () {
        Route::get('/', [App\Domains\GodMode\Controllers\DashboardController::class, 'index'])->name('dashboard');

        // Admins Management
        Route::get('/admins', [App\Domains\GodMode\Controllers\AdminManagementController::class, 'index'])->name('admins.index');
        Route::post('/admins', [App\Domains\GodMode\Controllers\AdminManagementController::class, 'store'])->name('admins.store');
        Route::delete('/admins/{id}', [App\Domains\GodMode\Controllers\AdminManagementController::class, 'destroy'])->name('admins.destroy');

        // Admin Activity Logs
        Route::get('/activity-logs', [App\Domains\GodMode\Controllers\AdminActivityLogController::class, 'index'])->name('activity-logs.index');

        // Users
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/users/{id}', [UserController::class, 'show'])->name('users.show');
        Route::patch('/users/{id}/verify', [UserController::class, 'toggleVerify'])->name('users.verify');

        // Events
        Route::get('/events', [App\Domains\GodMode\Controllers\EventController::class, 'index'])->name('events.index');
        Route::get('/events/{id}', [App\Domains\GodMode\Controllers\EventController::class, 'show'])->name('events.show');
        Route::get('/events/{id}/edit', [App\Domains\GodMode\Controllers\EventController::class, 'edit'])->name('events.edit');
        Route::put('/events/{id}', [App\Domains\GodMode\Controllers\EventController::class, 'update'])->name('events.update');
        Route::get('/events/{id}/participants/{rsvp_id}', [App\Domains\GodMode\Controllers\EventController::class, 'participantShow'])->name('events.participants.show');
        Route::get('/events/{id}/export-csv', [App\Domains\GodMode\Controllers\EventController::class, 'exportCsv'])->name('events.export-csv');

        // Event Packages
        Route::get('/events/{event}/packages', [EventPackageController::class, 'index'])->name('events.packages.index');
        Route::post('/events/{event}/packages', [EventPackageController::class, 'store'])->name('events.packages.store');
        Route::put('/events/{event}/packages/{package}', [EventPackageController::class, 'update'])->name('events.packages.update');
        Route::delete('/events/{event}/packages/{package}', [EventPackageController::class, 'destroy'])->name('events.packages.destroy');

        // Event Addons
        Route::get('/events/{event}/addons', [EventAddonController::class, 'index'])->name('events.addons.index');
        Route::post('/events/{event}/addons', [EventAddonController::class, 'store'])->name('events.addons.store');
        Route::put('/events/{event}/addons/{addon}', [EventAddonController::class, 'update'])->name('events.addons.update');
        Route::delete('/events/{event}/addons/{addon}', [EventAddonController::class, 'destroy'])->name('events.addons.destroy');

        // Payments (manual transfer approval)
        Route::get('/payments', [App\Domains\GodMode\Controllers\PaymentController::class, 'index'])->name('payments.index');
        Route::post('/payments/{id}/approve', [App\Domains\GodMode\Controllers\PaymentController::class, 'approve'])->name('payments.approve');
        Route::post('/payments/{id}/reject', [App\Domains\GodMode\Controllers\PaymentController::class, 'reject'])->name('payments.reject');
        Route::get('/payments/{id}/proof', [App\Domains\GodMode\Controllers\PaymentController::class, 'downloadProof'])->name('payments.proof');

        // Consulates
        Route::get('/consulates', [ConsulateController::class, 'index'])->name('consulates.index');
        Route::post('/consulates', [ConsulateController::class, 'store'])->name('consulates.store');
        Route::patch('/consulates/{id}', [ConsulateController::class, 'update'])->name('consulates.update');
        Route::delete('/consulates/{id}', [ConsulateController::class, 'destroy'])->name('consulates.destroy');

        // Email Tester
        Route::get('/email-tester', [EmailTesterController::class, 'index'])->name('email-tester.index');
        Route::post('/email-tester/send', [EmailTesterController::class, 'send'])->name('email-tester.send');
    });
});
