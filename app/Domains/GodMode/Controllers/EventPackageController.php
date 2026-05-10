<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventPackage;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventPackageController extends Controller
{
    public function index($eventId)
    {
        $event = Event::findOrFail($eventId);
        $packages = $event->packages()->with('includedAddons')->get()->map(function ($pkg) {
            $pkg->image_url = $pkg->getFirstMediaUrl('package-images');
            return $pkg;
        });

        // Need addons for the bundle selector when creating/editing a package
        $addons = $event->addons()->get()->map(function ($addon) {
            $addon->image_url = $addon->getFirstMediaUrl('addon-images');
            return $addon;
        });

        return Inertia::render('GodMode/Events/Packages/Index', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'packages' => $packages,
            'addons' => $addons,
        ]);
    }

    public function store(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'image' => 'nullable|image|max:5120',
            'included_addons' => 'nullable|array',
            'included_addons.*.id' => 'required|exists:event_addons,id',
            'included_addons.*.quantity' => 'required|integer|min:1',
        ]);

        $package = $event->packages()->create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'price' => $validated['price'],
            'stock_quantity' => $validated['stock_quantity'],
        ]);

        if ($request->hasFile('image')) {
            $package->addMediaFromRequest('image')->toMediaCollection('package-images');
        }

        if (!empty($validated['included_addons'])) {
            $syncData = [];
            foreach ($validated['included_addons'] as $addon) {
                $syncData[$addon['id']] = ['included_quantity' => $addon['quantity']];
            }
            $package->includedAddons()->sync($syncData);
        }

        return redirect()->back()->with('success', 'Package created successfully.');
    }

    public function update(Request $request, $eventId, $packageId)
    {
        $event = Event::findOrFail($eventId);
        $package = $event->packages()->findOrFail($packageId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'image' => 'nullable|image|max:5120',
            'included_addons' => 'nullable|array',
            'included_addons.*.id' => 'required|exists:event_addons,id',
            'included_addons.*.quantity' => 'required|integer|min:1',
        ]);

        $package->update([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'price' => $validated['price'],
            'stock_quantity' => $validated['stock_quantity'],
        ]);

        if ($request->hasFile('image')) {
            $package->clearMediaCollection('package-images');
            $package->addMediaFromRequest('image')->toMediaCollection('package-images');
        }

        if (isset($validated['included_addons'])) {
            $syncData = [];
            foreach ($validated['included_addons'] as $addon) {
                $syncData[$addon['id']] = ['included_quantity' => $addon['quantity']];
            }
            $package->includedAddons()->sync($syncData);
        } else {
            $package->includedAddons()->sync([]);
        }

        return redirect()->back()->with('success', 'Package updated successfully.');
    }

    public function destroy($eventId, $packageId)
    {
        $event = Event::findOrFail($eventId);
        $package = $event->packages()->findOrFail($packageId);

        $package->delete();

        return redirect()->back()->with('success', 'Package deleted successfully.');
    }
}
