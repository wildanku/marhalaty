<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Domains\Store\Models\Cart;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Services\CartService;
use App\Domains\Store\Services\CheckoutService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function show(Request $request, Store $store, CartService $cartService, SatuteraPaymentService $satutera)
    {
        $cart = Cart::where('user_id', $request->user()->id)
            ->where('store_id', $store->id)
            ->with(['items.product.media', 'items.variant'])
            ->firstOrFail();

        $summary = $cartService->summary($cart);

        if ($summary->hasBlockingIssues()) {
            return redirect()->route('cart.index')->with('error', 'Selesaikan masalah di keranjang sebelum checkout.');
        }

        return Inertia::render('Store/Checkout', [
            'store' => $store->load('primaryAddress'),
            'cart' => $cart,
            'summary' => [
                'subtotal' => $summary->subtotal,
                'total_weight_grams' => $summary->totalWeightGrams,
                'requires_shipping' => $summary->requiresShipping,
            ],
            'addresses' => $request->user()->addresses()->with('village.district.city.province')->orderByDesc('is_default')->get(),
            'paymentChannels' => $satutera->getPaymentChannels(),
            'shippingMethods' => $store->shippingMethods()->where('is_active', true)->orderBy('created_at')->get(),
        ]);
    }

    public function store(Request $request, Store $store, CheckoutService $checkout)
    {
        $validated = $request->validate([
            'user_address_id' => 'nullable|integer|exists:user_addresses,id',
            'shipping_courier_code' => 'nullable|string|max:20',
            'shipping_service' => 'nullable|string|max:50',
            'shipping_method_id' => 'nullable|string|exists:store_shipping_methods,id',
            'payment_provider' => 'required|string|max:30',
            'payment_method' => 'required|string|max:20',
            'payment_channel' => 'required|string|max:30',
            'buyer_note' => 'nullable|string|max:500',
        ]);

        $cart = Cart::where('user_id', $request->user()->id)
            ->where('store_id', $store->id)
            ->firstOrFail();

        $order = $checkout->place($request->user(), $cart, $validated);

        $transaction = $order->latestTransaction();

        if (! $transaction) {
            throw ValidationException::withMessages(['checkout' => 'Gagal membuat transaksi pembayaran.']);
        }

        return redirect()->route('store.payment.show', $transaction->payment_hash)
            ->with('success', 'Pesanan berhasil dibuat! Selesaikan pembayaran sebelum batas waktu.');
    }
}
