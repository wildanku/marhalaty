<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventAddonController extends Controller
{
    public function index($eventId)
    {
        $event = Event::findOrFail($eventId);
        $addons = $event->addons()->get()->map(function ($addon) {
            $addon->image_url = $addon->getFirstMediaUrl('addon-images');
            return $addon;
        });

        return Inertia::render('GodMode/Events/Addons/Index', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'addons' => $addons,
        ]);
    }

    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'variants' => 'nullable|string', // Will be JSON string from frontend
            'image' => 'nullable|image|max:5120',
        ]);

        $variants = $validated['variants'] ? json_decode($validated['variants'], true) : null;

        $addon = $event->addons()->create([
            'name' => $validated['name'],
            'price' => $validated['price'],
            'stock_quantity' => $validated['stock_quantity'],
            'variants' => $variants,
        ]);

        if ($request->hasFile('image')) {
            $addon->addMediaFromRequest('image')->toMediaCollection('addon-images');
        }

        return redirect()->back()->with('success', 'Addon created successfully.');
    }

    public function update(Request $request, $eventId, $addonId)
    {
        $event = Event::findOrFail($eventId);
        $addon = $event->addons()->findOrFail($addonId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'variants' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
        ]);

        $variants = $validated['variants'] ? json_decode($validated['variants'], true) : null;

        $addon->update([
            'name' => $validated['name'],
            'price' => $validated['price'],
            'stock_quantity' => $validated['stock_quantity'],
            'variants' => $variants,
        ]);

        if ($request->hasFile('image')) {
            $addon->clearMediaCollection('addon-images');
            $addon->addMediaFromRequest('image')->toMediaCollection('addon-images');
        }

        return redirect()->back()->with('success', 'Addon updated successfully.');
    }

    public function destroy($eventId, $addonId)
    {
        $event = Event::findOrFail($eventId);
        $addon = $event->addons()->findOrFail($addonId);

        $addon->delete();

        return redirect()->back()->with('success', 'Addon deleted successfully.');
    }
}
