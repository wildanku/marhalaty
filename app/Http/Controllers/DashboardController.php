<?php

namespace App\Http\Controllers;

use App\Domains\Event\Models\Rsvp;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $rsvps = Rsvp::with('event')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Dashboard', [
            'rsvps' => $rsvps,
        ]);
    }
}
