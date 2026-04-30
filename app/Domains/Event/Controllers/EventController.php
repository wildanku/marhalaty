<?php

namespace App\Domains\Event\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\Rsvp;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Event::query()->orderBy('event_date', 'asc');
        
        if ($request->has('scope') && $request->scope === 'marhalah') {
            $query->where('visibility_scope', $user->marhalah_year);
        } elseif ($request->has('scope') && $request->scope === 'global') {
            $query->where(function ($q) {
                $q->whereNull('visibility_scope')
                  ->orWhere('visibility_scope', 'global');
            });
        } else {
            // All accessible events logic
            $query->where(function ($q) use ($user) {
                $q->whereNull('visibility_scope')
                  ->orWhere('visibility_scope', 'global')
                  ->orWhere('visibility_scope', $user->marhalah_year);
            });
        }

        return Inertia::render('Event/Index', [
            'events' => $query->get(),
            'currentScope' => $request->scope ?? 'all'
        ]);
    }

    public function show($slug, Request $request)
    {
        $event = Event::with('addons')->where('slug', $slug)->firstOrFail();
        $user = $request->user();

        if ($event->visibility_scope && $event->visibility_scope !== 'global' && $event->visibility_scope != $user->marhalah_year) {
            abort(403, 'This event is restricted to a specific Marhalah.');
        }

        $existingRsvp = Rsvp::where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->first();

        return Inertia::render('Event/Show', [
            'event'        => $event,
            'existingRsvp' => $existingRsvp,
        ]);
    }
}
