<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Store\Actions\AssignStoreBadge;
use App\Domains\Store\Actions\RevokeStoreBadge;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreBadge;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StoreBadgeController extends Controller
{
    /**
     * Katalog jenis badge — bisa ditambah admin tanpa deploy kode.
     */
    public function index()
    {
        $badges = StoreBadge::withCount('assignments')->orderBy('sort_order')->get();

        return Inertia::render('GodMode/StoreBadges/Index', [
            'admin' => auth('admin')->user(),
            'badges' => $badges,
            'badgeIcons' => config('store.badge_icons'),
            'badgeColors' => config('store.badge_colors'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateBadge($request);

        StoreBadge::create($validated);

        return back()->with('success', 'Badge berhasil dibuat.');
    }

    public function update(Request $request, string $id)
    {
        $badge = StoreBadge::findOrFail($id);

        $validated = $this->validateBadge($request, $badge->id);

        $badge->update($validated);

        return back()->with('success', 'Badge berhasil diperbarui.');
    }

    public function destroy(string $id)
    {
        $badge = StoreBadge::withCount('assignments')->findOrFail($id);

        if ($badge->assignments_count > 0) {
            throw ValidationException::withMessages([
                'badge' => 'Badge ini masih terpasang di beberapa toko. Nonaktifkan saja, jangan dihapus.',
            ]);
        }

        $badge->delete();

        return back()->with('success', 'Badge berhasil dihapus.');
    }

    /**
     * Pasang badge ke satu toko, dipanggil dari halaman detail toko god-mode.
     */
    public function assign(Request $request, string $storeId, AssignStoreBadge $action)
    {
        $validated = $request->validate([
            'store_badge_id' => 'required|exists:store_badges,id',
            'expires_at' => 'nullable|date|after:now',
            'note' => 'nullable|string|max:500',
        ]);

        $store = Store::findOrFail($storeId);
        $badge = StoreBadge::findOrFail($validated['store_badge_id']);

        $action->execute(
            $store,
            $badge,
            auth('admin')->user(),
            isset($validated['expires_at']) ? Carbon::parse($validated['expires_at']) : null,
            $validated['note'] ?? null,
        );

        return back()->with('success', "Badge \"{$badge->name}\" berhasil dipasang ke toko.");
    }

    public function revoke(string $storeId, string $badgeId, RevokeStoreBadge $action)
    {
        $store = Store::findOrFail($storeId);
        $badge = StoreBadge::findOrFail($badgeId);

        $action->execute($store, $badge, auth('admin')->user());

        return back()->with('success', "Badge \"{$badge->name}\" berhasil dicabut.");
    }

    private function validateBadge(Request $request, ?int $badgeId = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9_]+$/', Rule::unique('store_badges', 'code')->ignore($badgeId)],
            'name' => ['required', 'string', 'max:50'],
            'name_en' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:200'],
            'icon' => ['required', 'string', Rule::in(config('store.badge_icons'))],
            'color_token' => ['required', 'string', Rule::in(config('store.badge_colors'))],
            'is_active' => ['boolean'],
            'sort_order' => ['integer', 'min:0', 'max:999'],
        ]);
    }
}
