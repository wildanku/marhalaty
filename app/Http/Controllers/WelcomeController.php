<?php

namespace App\Http\Controllers;

use App\Domains\Event\Models\Event;
use Inertia\Inertia;

class WelcomeController extends Controller
{
    public function index()
    {
        $upcomingEvents = Event::query()
            ->where(function ($q) {
                $q->whereNull('visibility_scope')
                  ->orWhere('visibility_scope', 'global');
            })
            ->where('event_date', '>=', now()->startOfDay())
            ->orderBy('event_date', 'asc')
            ->limit(4)
            ->get();

        return Inertia::render('Welcome', [
            'upcomingEvents' => $upcomingEvents->values(),
        ]);
    }
}
