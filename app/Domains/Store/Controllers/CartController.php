<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\Cart;
use App\Domains\Store\Models\CartItem;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductVariant;
use App\Domains\Store\Services\CartService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CartController extends Controller
{
    public function __construct(private CartService $cartService) {}

    /**
     * A cart is per-store (D1 in the fase-3 spec), so a buyer may have several open carts at
     * once — the index groups them into one section per store, each with its own summary/issues
     * and its own checkout entry point.
     */
    public function index(Request $request)
    {
        $carts = Cart::where('user_id', $request->user()->id)
            ->whereHas('items')
            ->with(['store', 'items.product.media', 'items.variant'])
            ->get();

        $sections = $carts->map(function (Cart $cart) {
            $summary = $this->cartService->summary($cart);

            return [
                'cart' => $cart,
                'summary' => [
                    'subtotal' => $summary->subtotal,
                    'total_weight_grams' => $summary->totalWeightGrams,
                    'requires_shipping' => $summary->requiresShipping,
                    'issues' => $summary->issues,
                ],
            ];
        })->values();

        return Inertia::render('Store/Cart', ['sections' => $sections]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'product_variant_id' => 'nullable|exists:product_variants,id',
            'quantity' => 'required|integer|min:1|max:99',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $variant = ! empty($validated['product_variant_id'])
            ? ProductVariant::findOrFail($validated['product_variant_id'])
            : null;

        $this->cartService->add($request->user(), $product, $variant, $validated['quantity']);

        return redirect()->back()->with('success', 'Produk ditambahkan ke keranjang.');
    }

    public function updateQty(Request $request, int $id)
    {
        $item = CartItem::whereHas('cart', fn ($q) => $q->where('user_id', $request->user()->id))->findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:0|max:99',
            'note' => 'nullable|string|max:250',
        ]);

        // `note` is only sent by the Cart page's note field (auto-save onBlur); the qty
        // +/- buttons omit it entirely, so an absent key must keep the item's existing note
        // rather than wipe it.
        $note = $request->has('note') ? ($validated['note'] ?? null) : $item->note;

        $this->cartService->updateQty($item, $validated['quantity'], $note);

        return redirect()->back();
    }

    public function destroy(Request $request, int $id)
    {
        $item = CartItem::whereHas('cart', fn ($q) => $q->where('user_id', $request->user()->id))->findOrFail($id);

        $this->cartService->remove($item);

        return redirect()->back()->with('success', 'Item dihapus dari keranjang.');
    }
}
