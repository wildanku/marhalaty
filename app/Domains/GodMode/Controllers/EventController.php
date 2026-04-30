<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\Rsvp;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $events = Event::withCount('rsvps')
            ->withSum(['rsvps as total_revenue' => function ($q) {
                $q->where('status', 'paid');
            }], 'total_amount')
            ->orderBy('event_date', 'asc')
            ->get();

        return Inertia::render('GodMode/Events/Index', [
            'admin'  => auth('admin')->user(),
            'events' => $events,
        ]);
    }

    public function show($id)
    {
        $event = Event::with(['addons'])->findOrFail($id);

        $rsvps = Rsvp::with('user')
            ->where('event_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        $stats = [
            'total_registrants' => $rsvps->count(),
            'paid_count'        => $rsvps->where('status', 'paid')->count(),
            'pending_count'     => $rsvps->where('status', 'pending')->count(),
            'total_revenue'     => $rsvps->where('status', 'paid')->sum('total_amount'),
        ];

        return Inertia::render('GodMode/Events/Show', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'rsvps' => $rsvps,
            'stats' => $stats,
        ]);
    }
}
