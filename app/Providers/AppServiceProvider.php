<?php

namespace App\Providers;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Observers\RsvpObserver;
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
    }
}
