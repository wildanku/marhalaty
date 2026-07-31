<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Services\EventAddonService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventAddonController extends Controller
{
    public function __construct(private readonly EventAddonService $addons) {}

    public function index($eventId)
    {
        $event = Event::findOrFail($eventId);
        $addons = $event->addons()->with(['product.store', 'variant', 'variants'])->get()->map(function ($addon) {
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
        $validated = $this->validateManual($request);

        $addon = $this->addons->saveAddon($event, $validated);

        return redirect()->back()->with('success', "Addon \"{$addon->name}\" created successfully.");
    }

    /**
     * "Ambil dari Produk Toko" — link a new addon to an existing store product instead of typing
     * one from scratch (docs/plan/mvp2/8-event-product-integration.md §5.1). Kept as a separate
     * action from store() rather than branching inside it: the two forms don't share a shape (this
     * one has no admin-typed option groups — combos come straight from the product's variants).
     */
    public function storeFromProduct(Request $request, $eventId)
    {
        $event = Event::findOrFail($eventId);

        $validated = $request->validate([
            'product_id' => 'required|string|exists:products,id',
            'product_variant_id' => 'nullable|string|exists:product_variants,id',
            'name' => 'required|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'variants' => 'nullable|array',
            'variants.*.product_variant_id' => 'required_with:variants|string|exists:product_variants,id',
            'variants.*.price' => 'required_with:variants|numeric|min:0',
        ]);

        $addon = $this->addons->linkFromProduct($event, $validated);

        return redirect()->back()->with('success', "Addon \"{$addon->name}\" berhasil ditautkan ke produk.");
    }

    public function update(Request $request, $eventId, $addonId)
    {
        $event = Event::findOrFail($eventId);
        $addon = $event->addons()->findOrFail($addonId);
        $validated = $this->validateManual($request);

        // A product-linked addon keeps reading stock from the product (D25) regardless of what's
        // submitted here — `stock_quantity` is only ever meaningful for a non-linked addon. The
        // *name*/per-combination *price* override is real and intentional (D24: seller pricing may
        // differ from the product's own price) — `saveAddon()` preserves each variant row's
        // `product_variant_id` link when only its price changes.
        $this->addons->saveAddon($event, $validated, $addon);

        return redirect()->back()->with('success', 'Addon updated successfully.');
    }

    public function destroy($eventId, $addonId)
    {
        $event = Event::findOrFail($eventId);
        $addon = $event->addons()->findOrFail($addonId);

        $addon->delete();

        return redirect()->back()->with('success', 'Addon deleted successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateManual(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'has_variants' => 'boolean',
            'price' => 'required_if:has_variants,false|nullable|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'form_fields' => 'nullable|array',

            'options' => 'required_if:has_variants,true|array|max:2',
            'options.*.name' => 'required|string|max:50',
            'options.*.values' => 'required|array|min:1|max:30',
            'options.*.values.*' => 'required|string|max:50',

            'variants' => 'required_if:has_variants,true|array',
            'variants.*.option1_value' => 'required|string|max:50',
            'variants.*.option2_value' => 'nullable|string|max:50',
            'variants.*.price' => 'required|numeric|min:0',

            'image' => 'nullable|image|max:2048',
        ]);
    }
}
