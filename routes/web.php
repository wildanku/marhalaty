<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\OnboardingController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('welcome');

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');

Route::middleware('web')->group(function () {
    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
});

// Placeholder for protected dashboard
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/directory', [\App\Domains\Alumni\Controllers\DirectoryController::class, 'index'])->name('directory.index');
    Route::get('/p/{slug}', [\App\Domains\Alumni\Controllers\DirectoryController::class, 'show'])->name('directory.show');

    // Events routes
    Route::get('/events', [\App\Domains\Event\Controllers\EventController::class, 'index'])->name('events.index');
    Route::get('/events/{slug}', [\App\Domains\Event\Controllers\EventController::class, 'show'])->name('events.show');
    Route::post('/events/{slug}/rsvp', [\App\Domains\Event\Controllers\RsvpController::class, 'store'])->name('events.rsvp');

    // Baitul Maal routes
    Route::get('/maal', [\App\Domains\Donation\Controllers\CampaignController::class, 'index'])->name('maal.index');
    Route::get('/maal/campaigns/{slug}', [\App\Domains\Donation\Controllers\CampaignController::class, 'show'])->name('maal.show');
    Route::post('/maal/donate', [\App\Domains\Donation\Controllers\DonationController::class, 'store'])->name('maal.donate');
});
