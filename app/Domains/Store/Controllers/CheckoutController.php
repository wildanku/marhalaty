<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Shared\Services\PaymentSettingsService;
use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Domains\Store\Models\Cart;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Services\CartService;
use App\Domains\Store\Services\CheckoutService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function show(Request $request, Store $store, CartService $cartService, SatuteraPaymentService $satutera, PaymentSettingsService $paymentSettings)
    {
        $cart = Cart::where('user_id', $request->user()->id)
            ->where('store_id', $store->id)
            ->with(['items.product.media', 'items.variant'])
            ->first();

        // No cart row at all, or one with every item already removed — nothing to check out.
        // Render the same page in an empty state rather than a bare 404 or a payment form with
        // nothing in it.
        if (! $cart || $cart->items->isEmpty()) {
            return Inertia::render('Store/Checkout', [
                'store' => $store,
                'isEmpty' => true,
            ]);
        }

        $summary = $cartService->summary($cart);

        if ($summary->hasBlockingIssues()) {
            return redirect()->route('cart.index')->with('error', 'Selesaikan masalah di keranjang sebelum checkout.');
        }

        $enabledGateways = $paymentSettings->gatewaysFor('store');
        $gatewayCodes = collect($enabledGateways)->pluck('code');

        return Inertia::render('Store/Checkout', [
            'store' => $store->load(['primaryAddress', 'activeBadges']),
            'isEmpty' => false,
            'cart' => $cart,
            'summary' => [
                'subtotal' => $summary->subtotal,
                'total_weight_grams' => $summary->totalWeightGrams,
                'requires_shipping' => $summary->requiresShipping,
            ],
            'addresses' => $request->user()->addresses()->with('village.district.city.province')->orderByDesc('is_default')->get(),
            'paymentGateways' => $enabledGateways,
            'paymentChannels' => $gatewayCodes->contains('satutera') ? $satutera->getPaymentChannels() : [],
            'manualAccounts' => $gatewayCodes->contains('manual') ? $paymentSettings->manualAccounts() : [],
            'shippingMethods' => $store->shippingMethods()->where('is_active', true)->orderBy('created_at')->get(),
            'qrisOnlyBelowAmount' => (int) config('store.qris_only_below_amount'),
        ]);
    }

    public function store(Request $request, Store $store, CheckoutService $checkout, PaymentSettingsService $paymentSettings)
    {
        $enabledGatewayCodes = $paymentSettings->enabledCodesFor('store');

        $validated = $request->validate([
            'user_address_id' => 'nullable|integer|exists:user_addresses,id',
            'shipping_courier_code' => 'nullable|string|max:20',
            'shipping_service' => 'nullable|string|max:50',
            'shipping_method_id' => 'nullable|string|exists:store_shipping_methods,id',
            'payment_gateway' => ['required', Rule::in($enabledGatewayCodes)],
            'payment_provider' => 'required_if:payment_gateway,satutera|nullable|string|max:30',
            'payment_method' => 'required_if:payment_gateway,satutera|nullable|string|max:20',
            'payment_channel' => 'required_if:payment_gateway,satutera|nullable|string|max:30',
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
