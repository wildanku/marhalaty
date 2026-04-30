<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\Rsvp;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total_users'    => User::withoutGlobalScopes()->count(),
            'verified_users' => User::withoutGlobalScopes()->where('is_verified', true)->count(),
            'total_events'   => Event::count(),
            'total_revenue'  => Rsvp::where('status', 'paid')->sum('total_amount'),
            'pending_rsvps'  => Rsvp::where('status', 'pending')->count(),
        ];

        return Inertia::render('GodMode/Dashboard', [
            'admin' => auth('admin')->user(),
            'stats' => $stats,
        ]);
    }
}
