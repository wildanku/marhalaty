<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Shared\Models\IndonesiaVillage;
use App\Domains\Shared\Services\TelegramService;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreAddress;
use App\Domains\Store\Models\StoreMember;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StoreApplicationController extends Controller
{
    public function __construct(private TelegramService $telegram) {}

    public function index(Request $request)
    {
        $user = $request->user();

        $storeIds = StoreMember::where('user_id', $user->id)
            ->where('status', 'active')
            ->pluck('store_id');

        $stores = Store::whereIn('id', $storeIds)
            ->orWhere('owner_user_id', $user->id)
            ->with('primaryAddress')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Store/MyStores', [
            'stores' => $stores,
        ]);
    }

    public function create(Request $request)
    {
        abort_unless($request->user()->is_verified, 403, 'Kamu perlu terverifikasi sebagai alumni sebelum bisa mengajukan toko. Hubungi admin untuk verifikasi.');

        return Inertia::render('Store/Create');
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->is_verified, 403, 'Kamu perlu terverifikasi sebagai alumni sebelum bisa mengajukan toko. Hubungi admin untuk verifikasi.');

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:stores,name',
            'description' => 'required|string|max:2000',
            'contact_phone' => 'required|string|max:30',
            'contact_email' => 'nullable|email|max:100',
            'logo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',

            'recipient_name' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'address_line' => 'required|string|max:500',
            'village_id' => 'required|exists:indonesia_villages,id',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
        ]);

        $village = IndonesiaVillage::findOrFail($validated['village_id']);
        $user = $request->user();

        $store = DB::transaction(function () use ($validated, $village, $user, $request) {
            $store = Store::create([
                'name' => $validated['name'],
                'description' => $validated['description'],
                'owner_user_id' => $user->id,
                'status' => 'pending',
                'contact_phone' => $validated['contact_phone'],
                'contact_email' => $validated['contact_email'] ?? null,
            ]);

            StoreMember::create([
                'store_id' => $store->id,
                'user_id' => $user->id,
                'role' => 'owner',
                'status' => 'active',
                'accepted_at' => now(),
            ]);

            StoreAddress::create([
                'store_id' => $store->id,
                'recipient_name' => $validated['recipient_name'],
                'phone' => $validated['phone'],
                'address_line' => $validated['address_line'],
                'village_id' => $village->id,
                'postal_code' => $village->postal_code,
                'lat' => $validated['lat'] ?? null,
                'lng' => $validated['lng'] ?? null,
                'is_primary' => true,
            ]);

            if ($request->hasFile('logo')) {
                $store->addMediaFromRequest('logo')->toMediaCollection('store-logo');
            }

            return $store;
        });

        $this->telegram->sendMessage(
            config('services.telegram.notify_chat_id', ''),
            "🏪 <b>Pengajuan Toko Baru</b>\n\n".
                '👤 <b>Pemohon:</b> '.e($user->name)."\n".
                '🏬 <b>Nama Toko:</b> '.e($store->name)."\n\n".
                'Tinjau di panel admin: '.config('app.url').'/god-mode/stores/'.$store->id
        );

        return redirect()->route('stores.mine')
            ->with('success', 'Pengajuan toko berhasil dikirim. Kami akan meninjau dalam waktu 1x24 jam.');
    }
}
