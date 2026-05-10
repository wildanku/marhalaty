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
        $events = Event::with('packages')
            ->withCount('rsvps')
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

    public function edit($id)
    {
        $event = Event::findOrFail($id);

        return Inertia::render('GodMode/Events/Edit', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'current_image_url' => $event->getFirstMediaUrl('event-images'),
        ]);
    }

    public function update(Request $request, $id)
    {
        $event = Event::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:events,slug,' . $event->id,
            'description' => 'required|string',
            'location' => 'required|string',
            'event_date' => 'required|date',
            'visibility_scope' => 'nullable|string',
            'infak_rules' => 'nullable|string',
            'metadata' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
        ]);

        // Decode JSON fields if provided as strings
        $infakRules = $validated['infak_rules'] ? json_decode($validated['infak_rules'], true) : null;
        $metadata = $validated['metadata'] ? json_decode($validated['metadata'], true) : null;

        $event->update([
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'description' => $validated['description'],
            'location' => $validated['location'],
            'event_date' => $validated['event_date'],
            'visibility_scope' => $validated['visibility_scope'],
            'infak_rules' => $infakRules,
            'metadata' => $metadata,
        ]);

        if ($request->hasFile('image')) {
            $event->clearMediaCollection('event-images');
            $event->addMediaFromRequest('image')->toMediaCollection('event-images');
        }

        // Flash message for successful update
        $request->session()->flash('success', 'Event updated successfully.');

        return redirect()->route('god-mode.events.show', $event->id);
    }
}
