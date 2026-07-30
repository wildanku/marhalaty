<?php

namespace App\Domains\Store\Controllers;

use App\Contracts\ShippingProviderInterface;
use App\Domains\Store\Models\Cart;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Services\AddressResolver;
use App\Domains\Store\Services\CartService;
use App\Http\Controllers\Controller;
use App\Models\UserAddress;
use Illuminate\Http\Request;

class ShippingController extends Controller
{
    public function __construct(
        private ShippingProviderInterface $shipping,
        private AddressResolver $resolver,
        private CartService $cartService,
    ) {}

    /**
     * POST /api/shipping/rates — throttled at the route level (30/min): each call can trigger a
     * billed RajaOngkir API request.
     */
    public function rates(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:stores,id',
            'address_id' => 'required|exists:user_addresses,id',
        ]);

        $store = Store::findOrFail($validated['store_id']);
        $address = UserAddress::where('user_id', $request->user()->id)->findOrFail($validated['address_id']);

        $origin = $store->primaryAddress()->first();
        if (! $origin) {
            return response()->json(['message' => 'Toko belum mengatur alamat asal pengiriman.'], 422);
        }

        $originResolution = $this->resolver->resolve($origin);
        $destinationResolution = $this->resolver->resolve($address);

        if (! $originResolution['resolved'] || ! $destinationResolution['resolved']) {
            return response()->json([
                'message' => 'Alamat belum bisa dipetakan ke layanan ongkir. Pilih kelurahan/kecamatan yang sesuai.',
                'candidates' => $destinationResolution['candidates'] ?? [],
            ], 422);
        }

        $cart = Cart::where('user_id', $request->user()->id)->where('store_id', $store->id)->first();
        $weight = 1000;

        if ($cart) {
            $summary = $this->cartService->summary($cart);
            $weight = $summary->totalWeightGrams ?: 1000;
        }

        $rates = $this->shipping->calculateCost(
            $originResolution['destination_id'],
            $destinationResolution['destination_id'],
            $weight,
        );

        if (empty($rates)) {
            return response()->json(['message' => 'Tarif pengiriman belum bisa diambil, coba lagi.', 'data' => []], 503);
        }

        return response()->json(['data' => array_map(fn ($rate) => $rate->toArray(), $rates)]);
    }
}
