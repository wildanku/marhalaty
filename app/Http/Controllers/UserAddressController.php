<?php

namespace App\Http\Controllers;

use App\Domains\Shared\Models\IndonesiaVillage;
use Illuminate\Http\Request;

/**
 * Buyer address book. Consumed as JSON from `Components/Store/AddressPicker.tsx` inside the
 * checkout flow (not a full Inertia page) — the same "data sampingan" pattern used for
 * `AsyncSelect`/`ShippingRatePicker`.
 */
class UserAddressController extends Controller
{
    public function index(Request $request)
    {
        $addresses = $request->user()->addresses()
            ->with('village.district.city.province')
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $addresses]);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $village = IndonesiaVillage::findOrFail($validated['village_id']);
        $user = $request->user();

        $address = $user->addresses()->create([
            'label' => $validated['label'] ?? 'Rumah',
            'recipient_name' => $validated['recipient_name'],
            'phone' => $validated['phone'],
            'address_line' => $validated['address_line'],
            'village_id' => $village->id,
            'postal_code' => $village->postal_code,
            'lat' => $validated['lat'] ?? null,
            'lng' => $validated['lng'] ?? null,
            'is_default' => $user->addresses()->count() === 0,
        ]);

        return response()->json(['data' => $address->load('village.district.city.province')], 201);
    }

    public function update(Request $request, int $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $validated = $this->validated($request);
        $village = IndonesiaVillage::findOrFail($validated['village_id']);

        $address->update([
            'label' => $validated['label'] ?? $address->label,
            'recipient_name' => $validated['recipient_name'],
            'phone' => $validated['phone'],
            'address_line' => $validated['address_line'],
            'village_id' => $village->id,
            'postal_code' => $village->postal_code,
            'lat' => $validated['lat'] ?? null,
            'lng' => $validated['lng'] ?? null,
            // Address changed — the cached destination no longer applies.
            'rajaongkir_destination_id' => null,
            'destination_resolved_at' => null,
        ]);

        return response()->json(['data' => $address->fresh('village.district.city.province')]);
    }

    public function destroy(Request $request, int $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $request->user()->addresses()->orderByDesc('created_at')->first()?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Alamat berhasil dihapus.']);
    }

    public function setDefault(Request $request, int $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);

        $request->user()->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json(['data' => $address]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'label' => 'nullable|string|max:50',
            'recipient_name' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'address_line' => 'required|string|max:500',
            'village_id' => 'required|exists:indonesia_villages,id',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
        ]);
    }
}
