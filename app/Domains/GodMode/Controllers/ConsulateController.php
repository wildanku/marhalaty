<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Consulate;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ConsulateController extends Controller
{
    public function index()
    {
        $consulates = Consulate::with(['cities.city'])->withCount('cities')->orderBy('name')->get();

        return Inertia::render('GodMode/Consulates/Index', [
            'admin'      => auth('admin')->user(),
            'consulates' => $consulates,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'notes' => 'nullable|string',
            'city_ids' => 'nullable|array',
            'city_ids.*' => 'string'
        ]);

        $consulateData = [
            'name' => $validated['name'],
            'notes' => $validated['notes'] ?? null,
            'created_by' => auth('admin')->user()->name,
        ];

        $consulate = Consulate::create($consulateData);

        if (!empty($validated['city_ids'])) {
            $cities = array_map(function($cityId) {
                return ['city_id' => $cityId];
            }, $validated['city_ids']);
            $consulate->cities()->createMany($cities);
        }

        return back()->with('success', 'Konsulat berhasil dibuat.');
    }

    public function update(Request $request, $id)
    {
        $consulate = Consulate::findOrFail($id);

        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'notes' => 'nullable|string',
            'city_ids' => 'nullable|array',
            'city_ids.*' => 'string'
        ]);

        $consulate->update([
            'name' => $validated['name'],
            'notes' => $validated['notes'] ?? null,
        ]);

        $consulate->cities()->delete();
        if (!empty($validated['city_ids'])) {
            $cities = array_map(function($cityId) {
                return ['city_id' => $cityId];
            }, $validated['city_ids']);
            $consulate->cities()->createMany($cities);
        }

        return back()->with('success', 'Konsulat berhasil diperbarui.');
    }

    public function destroy($id)
    {
        Consulate::findOrFail($id)->delete();

        return back()->with('success', 'Konsulat berhasil dihapus.');
    }
}
