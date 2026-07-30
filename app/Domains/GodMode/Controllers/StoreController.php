<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Store\Actions\ApproveStore;
use App\Domains\Store\Actions\RejectStore;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreMember;
use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\Scopes\MarhalahScope;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->input('status', 'pending');

        $stores = Store::with('owner')
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('GodMode/Stores/Index', [
            'admin' => auth('admin')->user(),
            'stores' => $stores,
            'status' => $status,
        ]);
    }

    public function show(string $id)
    {
        $store = Store::with(['owner', 'primaryAddress.village.district.city.province', 'members.user'])
            ->findOrFail($id);

        return Inertia::render('GodMode/Stores/Show', [
            'admin' => auth('admin')->user(),
            'store' => $store,
        ]);
    }

    public function approve(string $id, ApproveStore $action)
    {
        $store = Store::findOrFail($id);

        $action->execute($store, auth('admin')->user());

        return redirect()->back()->with('success', 'Toko berhasil disetujui.');
    }

    public function reject(Request $request, string $id, RejectStore $action)
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $store = Store::findOrFail($id);

        $action->execute($store, auth('admin')->user(), $validated['rejection_reason']);

        return redirect()->back()->with('success', 'Toko berhasil ditolak.');
    }

    public function suspend(Request $request, string $id)
    {
        $validated = $request->validate([
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        $store = Store::findOrFail($id);

        DB::transaction(function () use ($store, $validated) {
            $store->update([
                'status' => 'suspended',
                'rejection_reason' => $validated['rejection_reason'] ?? $store->rejection_reason,
            ]);

            AdminActivityLog::create([
                'admin_id' => auth('admin')->id(),
                'action' => "suspend_store:{$store->id}",
            ]);
        });

        return redirect()->back()->with('success', 'Toko berhasil disuspend.');
    }

    public function create()
    {
        return Inertia::render('GodMode/Stores/Create', [
            'admin' => auth('admin')->user(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:stores,name',
            'description' => 'required|string|max:2000',
            'owner_user_id' => 'required|exists:users,id',
            'contact_phone' => 'required|string|max:30',
            'contact_email' => 'nullable|email|max:100',
        ]);

        $owner = User::withoutGlobalScope(MarhalahScope::class)->findOrFail($validated['owner_user_id']);

        abort_unless($owner->is_verified, 422, 'Owner yang dipilih belum terverifikasi.');

        $admin = auth('admin')->user();

        $store = DB::transaction(function () use ($validated, $owner, $admin) {
            $store = Store::create([
                'name' => $validated['name'],
                'description' => $validated['description'],
                'owner_user_id' => $owner->id,
                'status' => 'approved',
                'verified_at' => now(),
                'verified_by' => $admin->id,
                'created_by_admin_id' => $admin->id,
                'contact_phone' => $validated['contact_phone'],
                'contact_email' => $validated['contact_email'] ?? null,
            ]);

            StoreMember::create([
                'store_id' => $store->id,
                'user_id' => $owner->id,
                'role' => 'owner',
                'status' => 'active',
                'accepted_at' => now(),
            ]);

            AdminActivityLog::create([
                'admin_id' => $admin->id,
                'action' => "create_store:{$store->id}",
            ]);

            return $store;
        });

        return redirect()->route('god-mode.stores.show', $store->id)->with('success', 'Toko berhasil dibuat.');
    }
}
