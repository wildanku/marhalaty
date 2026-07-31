<?php

namespace App\Domains\Store\Services;

use App\Domains\Store\Data\CartSummary;
use App\Domains\Store\Models\Cart;
use App\Domains\Store\Models\CartItem;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductVariant;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function add(User $user, Product $product, ?ProductVariant $variant, int $qty): Cart
    {
        if ($product->status !== 'active' || ! $product->store->isPubliclyVisible()) {
            throw ValidationException::withMessages([
                'product' => 'Produk ini sedang tidak tersedia.',
            ]);
        }

        if ($product->has_variants && ! $variant) {
            throw ValidationException::withMessages([
                'variant' => 'Pilih varian produk terlebih dahulu.',
            ]);
        }

        if ($variant && ($variant->product_id !== $product->id || ! $variant->is_active)) {
            throw ValidationException::withMessages([
                'variant' => 'Varian yang dipilih tidak tersedia.',
            ]);
        }

        $availableStock = $variant ? $variant->stock_quantity : $product->available_stock;

        $cart = Cart::firstOrCreate([
            'user_id' => $user->id,
            'store_id' => $product->store_id,
        ]);

        // Postgres treats NULL as distinct in a unique index, so a plain unique constraint on
        // (cart_id, product_id, product_variant_id) would not catch duplicate no-variant rows —
        // look the row up explicitly instead of relying on the DB constraint.
        $item = $cart->items()
            ->where('product_id', $product->id)
            ->when($variant, fn ($q) => $q->where('product_variant_id', $variant->id))
            ->when(! $variant, fn ($q) => $q->whereNull('product_variant_id'))
            ->first();

        $newQty = ($item?->quantity ?? 0) + $qty;

        if ($newQty > $availableStock) {
            throw ValidationException::withMessages([
                'quantity' => "Stok tidak mencukupi. Tersisa {$availableStock}.",
            ]);
        }

        if ($item) {
            $item->update(['quantity' => $newQty]);
        } else {
            $cart->items()->create([
                'product_id' => $product->id,
                'product_variant_id' => $variant?->id,
                'quantity' => $qty,
            ]);
        }

        return $cart;
    }

    public function updateQty(CartItem $item, int $qty, ?string $note = null): void
    {
        if ($qty <= 0) {
            $this->remove($item);

            return;
        }

        $item->update(['quantity' => $qty, 'note' => $note]);
    }

    public function remove(CartItem $item): void
    {
        $item->delete();
    }

    public function summary(Cart $cart): CartSummary
    {
        $cart->load(['items.product.store', 'items.variant']);

        $subtotal = 0;
        $totalWeight = 0;
        $requiresShipping = false;
        $issues = [];

        foreach ($cart->items as $item) {
            $product = $item->product;
            $variant = $item->variant;

            if (! $product) {
                continue;
            }

            if (! $product->store->isPubliclyVisible()) {
                $issues[] = ['cart_item_id' => $item->id, 'type' => 'store_suspended', 'message' => 'Toko sedang tidak aktif.'];

                continue;
            }

            if ($product->status !== 'active') {
                $issues[] = ['cart_item_id' => $item->id, 'type' => 'product_inactive', 'message' => "\"{$product->name}\" sudah tidak tersedia."];

                continue;
            }

            if ($product->has_variants && (! $variant || ! $variant->is_active)) {
                $issues[] = ['cart_item_id' => $item->id, 'type' => 'variant_inactive', 'message' => "Varian untuk \"{$product->name}\" sudah tidak tersedia."];

                continue;
            }

            $stock = $variant ? $variant->stock_quantity : $product->available_stock;
            if ($item->quantity > $stock) {
                $issues[] = ['cart_item_id' => $item->id, 'type' => 'insufficient_stock', 'message' => "Stok \"{$product->name}\" tersisa {$stock}."];

                continue;
            }

            if ($product->updated_at->gt($item->created_at)) {
                $issues[] = ['cart_item_id' => $item->id, 'type' => 'details_changed', 'message' => "Detail \"{$product->name}\" berubah sejak ditambahkan, cek kembali sebelum checkout."];
            }

            $price = (float) ($variant ? $variant->price : $product->price);
            $weight = $variant ? $variant->effective_weight : (int) ($product->weight_grams ?? 0);

            $subtotal += $price * $item->quantity;

            if ($product->isPhysical()) {
                $requiresShipping = true;
                $totalWeight += $weight * $item->quantity;
            }
        }

        return new CartSummary(
            subtotal: $subtotal,
            totalWeightGrams: $requiresShipping ? max($totalWeight, 1000) : 0,
            requiresShipping: $requiresShipping,
            issues: $issues,
        );
    }
}
