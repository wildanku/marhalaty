<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Store\Models\FeaturedProduct;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class HomepageHighlightController extends Controller
{
    public function index()
    {
        $highlights = FeaturedProduct::with(['product.store:id,name,slug', 'product.media'])
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('GodMode/HomepageHighlights/Index', [
            'admin' => auth('admin')->user(),
            'highlights' => $highlights,
            'maxSlots' => config('store.max_homepage_highlights'),
            'activeCount' => $highlights->where('is_active', true)->count(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id', Rule::unique('featured_products', 'product_id')],
        ]);

        $activeCount = FeaturedProduct::active()->count();
        $maxSlots = config('store.max_homepage_highlights');

        if ($activeCount >= $maxSlots) {
            throw ValidationException::withMessages([
                'product_id' => "Slot penuh ({$activeCount}/{$maxSlots}), nonaktifkan salah satu dulu.",
            ]);
        }

        FeaturedProduct::create([
            'product_id' => $validated['product_id'],
            'sort_order' => (int) FeaturedProduct::max('sort_order') + 1,
            'is_active' => true,
            'created_by_admin_id' => auth('admin')->id(),
        ]);

        return back()->with('success', 'Produk berhasil ditambahkan ke highlight beranda.');
    }

    public function update(Request $request, int $id)
    {
        $highlight = FeaturedProduct::findOrFail($id);

        $validated = $request->validate([
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (($validated['is_active'] ?? false) && ! $highlight->is_active) {
            $activeCount = FeaturedProduct::active()->count();
            $maxSlots = config('store.max_homepage_highlights');

            if ($activeCount >= $maxSlots) {
                throw ValidationException::withMessages([
                    'is_active' => "Slot penuh ({$activeCount}/{$maxSlots}), nonaktifkan salah satu dulu.",
                ]);
            }
        }

        $highlight->update($validated);

        return back()->with('success', 'Highlight berhasil diperbarui.');
    }

    public function destroy(int $id)
    {
        $highlight = FeaturedProduct::findOrFail($id);
        $highlight->delete();

        return back()->with('success', 'Produk dilepas dari highlight beranda.');
    }
}
