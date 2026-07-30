<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Shared\Models\IndonesiaVillage;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreOrder;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StoreController extends Controller
{
    public function show(Request $request, Store $store)
    {
        $this->authorize('view', $store);

        $store->load(['primaryAddress.village.district.city.province', 'members.user']);

        return Inertia::render('Store/Manage/Dashboard', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
            'productCount' => $store->products()->count(),
            'orderCount' => StoreOrder::where('store_id', $store->id)->count(),
            'shippingMethodCount' => $store->shippingMethods()->count(),
        ]);
    }

    public function update(Request $request, Store $store)
    {
        $this->authorize('update', $store);

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:stores,name,'.$store->id,
            'description' => 'required|string|max:2000',
            'contact_phone' => 'required|string|max:30',
            'contact_email' => 'nullable|email|max:100',
            'logo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'banner' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
        ]);

        $store->update([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'contact_phone' => $validated['contact_phone'],
            'contact_email' => $validated['contact_email'] ?? null,
        ]);

        if ($request->hasFile('logo')) {
            $store->addMediaFromRequest('logo')->toMediaCollection('store-logo');
        }

        if ($request->hasFile('banner')) {
            $store->addMediaFromRequest('banner')->toMediaCollection('store-banner');
        }

        return redirect()->back()->with('success', 'Profil toko berhasil diperbarui.');
    }

    public function updateAddress(Request $request, Store $store)
    {
        $this->authorize('update', $store);

        $validated = $request->validate([
            'recipient_name' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'address_line' => 'required|string|max:500',
            'village_id' => 'required|exists:indonesia_villages,id',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
        ]);

        $village = IndonesiaVillage::findOrFail($validated['village_id']);

        $store->addresses()->updateOrCreate(
            ['is_primary' => true],
            [
                'recipient_name' => $validated['recipient_name'],
                'phone' => $validated['phone'],
                'address_line' => $validated['address_line'],
                'village_id' => $village->id,
                'postal_code' => $village->postal_code,
                'lat' => $validated['lat'] ?? null,
                'lng' => $validated['lng'] ?? null,
                // Store's own destination resolution is stale after an address change.
                'rajaongkir_destination_id' => null,
                'destination_resolved_at' => null,
            ]
        );

        return redirect()->back()->with('success', 'Alamat toko berhasil disimpan.');
    }
}
