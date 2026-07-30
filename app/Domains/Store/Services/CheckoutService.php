<?php

namespace App\Domains\Store\Services;

use App\Contracts\ShippingProviderInterface;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Domains\Store\Models\Cart;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductVariant;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Models\StoreShippingMethod;
use App\Jobs\SendStoreOrderCreatedEmail;
use App\Models\User;
use App\Models\UserAddress;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private ShippingProviderInterface $shipping,
        private AddressResolver $addressResolver,
        private SatuteraPaymentService $satutera,
    ) {}

    /**
     * Recomputes every amount from the database inside a single locked transaction — the client's
     * numbers (price, weight, shipping cost) are for display only and are never trusted here.
     *
     * @param array{
     *   user_address_id?: int|null,
     *   shipping_courier_code?: string|null,
     *   shipping_service?: string|null,
     *   payment_provider: string,
     *   payment_method: string,
     *   payment_channel: string,
     *   buyer_note?: string|null,
     * } $data
     */
    public function place(User $buyer, Cart $cart, array $data): StoreOrder
    {
        return DB::transaction(function () use ($buyer, $cart, $data) {
            $store = $cart->store;

            if (! $store || ! $store->isPubliclyVisible()) {
                throw ValidationException::withMessages(['store' => 'Toko ini sedang tidak aktif.']);
            }

            $cart->load('items');
            if ($cart->items->isEmpty()) {
                throw ValidationException::withMessages(['cart' => 'Keranjang kosong.']);
            }

            [$orderItemsData, $subtotal, $totalWeight, $requiresShipping] = $this->lockAndValidateItems($cart);

            $shippingCost = 0;
            $shippingSnapshot = [];
            $shippingAddressSnapshot = null;
            $originAddressSnapshot = null;

            if ($requiresShipping) {
                [$shippingCost, $shippingSnapshot, $shippingAddressSnapshot, $originAddressSnapshot]
                    = $this->resolveShipping($buyer, $store, $data, $totalWeight);
            }

            $channel = $this->satutera->findChannel(
                $data['payment_provider'],
                $data['payment_method'],
                $data['payment_channel'],
            );

            if (! $channel) {
                throw ValidationException::withMessages(['payment_channel' => 'Metode pembayaran tidak tersedia. Pilih ulang.']);
            }

            $paymentFee = (int) ($channel['fee'] ?? 0);
            $total = $subtotal + $shippingCost + $paymentFee;

            $order = StoreOrder::create(array_merge([
                'store_id' => $store->id,
                'buyer_user_id' => $buyer->id,
                'status' => 'pending_payment',
                'requires_shipping' => $requiresShipping,
                'subtotal' => $subtotal,
                'shipping_cost' => $shippingCost,
                'payment_fee' => $paymentFee,
                'total' => $total,
                'total_weight_grams' => $totalWeight,
                'shipping_address_snapshot' => $shippingAddressSnapshot,
                'origin_address_snapshot' => $originAddressSnapshot,
                'buyer_note' => $data['buyer_note'] ?? null,
                'expires_at' => now()->addMinutes((int) config('store.order_expiry_minutes')),
            ], $shippingSnapshot));

            foreach ($orderItemsData as $itemData) {
                $order->items()->create($itemData);
            }

            foreach ($cart->items as $cartItem) {
                if ($cartItem->product_variant_id) {
                    ProductVariant::where('id', $cartItem->product_variant_id)->decrement('stock_quantity', $cartItem->quantity);
                } else {
                    Product::where('id', $cartItem->product_id)->decrement('stock_quantity', $cartItem->quantity);
                }
            }

            $cart->items()->delete();

            $transaction = Transaction::create([
                'payable_type' => StoreOrder::class,
                'payable_id' => $order->id,
                'user_id' => $buyer->id,
                'amount' => $total,
                'payment_fee' => $paymentFee,
                'payment_provider' => 'satutera',
                'payment_channel' => $data['payment_channel'],
                'status' => 'pending',
            ]);

            $this->initiateSatuteraPayment($order, $transaction, $buyer, $data);

            SendStoreOrderCreatedEmail::dispatch($order->fresh(['items', 'store']), $transaction);

            return $order->fresh(['items', 'store']);
        });
    }

    /**
     * Lock every product/variant referenced by the cart, re-validate it, and build the order-item
     * snapshot rows + totals purely from the locked database rows.
     *
     * @return array{0: array<int, array<string, mixed>>, 1: float, 2: int, 3: bool}
     */
    private function lockAndValidateItems(Cart $cart): array
    {
        $subtotal = 0.0;
        $totalWeight = 0;
        $requiresShipping = false;
        $itemsData = [];

        foreach ($cart->items as $cartItem) {
            $product = Product::where('id', $cartItem->product_id)->lockForUpdate()->first();

            if (! $product || $product->status !== 'active' || ! $product->store->isPubliclyVisible()) {
                throw ValidationException::withMessages([
                    'cart' => 'Ada produk di keranjang yang sudah tidak tersedia. Perbarui keranjangmu.',
                ]);
            }

            $variant = null;
            if ($cartItem->product_variant_id) {
                $variant = ProductVariant::where('id', $cartItem->product_variant_id)->lockForUpdate()->first();
                if (! $variant || ! $variant->is_active) {
                    throw ValidationException::withMessages([
                        'cart' => "Varian untuk \"{$product->name}\" sudah tidak tersedia.",
                    ]);
                }
            }

            $stock = $variant ? $variant->stock_quantity : (int) ($product->stock_quantity ?? 0);
            if ($cartItem->quantity > $stock) {
                throw ValidationException::withMessages([
                    'cart' => "Stok \"{$product->name}\" tidak mencukupi (tersisa {$stock}).",
                ]);
            }

            $price = (float) ($variant ? $variant->price : $product->price);
            $weight = $variant ? $variant->effective_weight : (int) ($product->weight_grams ?? 0);
            $lineSubtotal = $price * $cartItem->quantity;

            $subtotal += $lineSubtotal;

            if ($product->isPhysical()) {
                $requiresShipping = true;
                $totalWeight += $weight * $cartItem->quantity;
            }

            $itemsData[] = [
                'product_id' => $product->id,
                'product_variant_id' => $variant?->id,
                'name_snapshot' => $product->name,
                'variant_label_snapshot' => $variant?->label,
                'sku_snapshot' => $variant?->sku ?? $product->sku,
                'type_snapshot' => $product->type,
                'unit_price' => $price,
                'quantity' => $cartItem->quantity,
                'weight_grams' => $weight,
                'subtotal' => $lineSubtotal,
            ];
        }

        return [$itemsData, $subtotal, $requiresShipping ? max($totalWeight, 1000) : 0, $requiresShipping];
    }

    /**
     * @return array{0: int, 1: array<string, string|null>, 2: array<string, mixed>, 3: array<string, mixed>}
     */
    private function resolveShipping(User $buyer, Store $store, array $data, int $totalWeight): array
    {
        if (! empty($data['shipping_method_id'])) {
            return $this->resolveCustomShipping($buyer, $store, $data);
        }

        if (empty($data['user_address_id'])) {
            throw ValidationException::withMessages(['user_address_id' => 'Pilih alamat pengiriman.']);
        }

        $buyerAddress = UserAddress::where('user_id', $buyer->id)->find($data['user_address_id']);
        if (! $buyerAddress) {
            throw ValidationException::withMessages(['user_address_id' => 'Alamat tidak ditemukan.']);
        }

        $originAddress = $store->primaryAddress()->first();
        if (! $originAddress) {
            throw ValidationException::withMessages(['store' => 'Toko belum mengatur alamat asal pengiriman.']);
        }

        $destinationResolution = $this->addressResolver->resolve($buyerAddress);
        if (! $destinationResolution['resolved']) {
            throw ValidationException::withMessages([
                'user_address_id' => 'Alamat pengiriman belum bisa dipetakan ke layanan ongkir. Pilih kelurahan/kecamatan yang sesuai terlebih dahulu.',
            ]);
        }

        $originResolution = $this->addressResolver->resolve($originAddress);
        if (! $originResolution['resolved']) {
            throw ValidationException::withMessages([
                'store' => 'Alamat asal toko belum bisa dipetakan ke layanan ongkir.',
            ]);
        }

        if (empty($data['shipping_courier_code']) || empty($data['shipping_service'])) {
            throw ValidationException::withMessages(['shipping_courier_code' => 'Pilih opsi pengiriman.']);
        }

        $rates = $this->shipping->calculateCost(
            $originResolution['destination_id'],
            $destinationResolution['destination_id'],
            $totalWeight,
        );

        if (empty($rates)) {
            throw ValidationException::withMessages([
                'shipping_courier_code' => 'Tarif pengiriman belum bisa diambil, coba lagi.',
            ]);
        }

        $matched = collect($rates)->first(
            fn ($rate) => $rate->matches($data['shipping_courier_code'], $data['shipping_service'])
        );

        if (! $matched) {
            throw ValidationException::withMessages([
                'shipping_courier_code' => 'Opsi pengiriman yang dipilih tidak lagi tersedia. Silakan pilih ulang.',
            ]);
        }

        $shippingSnapshot = [
            'shipping_provider' => $this->shipping->providerCode(),
            'shipping_courier_code' => $matched->courierCode,
            'shipping_courier_name' => $matched->courierName,
            'shipping_service' => $matched->service,
            'shipping_etd' => $matched->etd,
        ];

        $shippingAddressSnapshot = [
            'recipient_name' => $buyerAddress->recipient_name,
            'phone' => $buyerAddress->phone,
            'address_line' => $buyerAddress->address_line,
            'full_address' => $buyerAddress->full_address,
            'postal_code' => $buyerAddress->postal_code,
        ];

        $originAddressSnapshot = [
            'recipient_name' => $originAddress->recipient_name,
            'phone' => $originAddress->phone,
            'address_line' => $originAddress->address_line,
            'postal_code' => $originAddress->postal_code,
        ];

        return [$matched->cost, $shippingSnapshot, $shippingAddressSnapshot, $originAddressSnapshot];
    }

    /**
     * A seller-defined flat-fee/pickup method — no RajaOngkir lookup at all, the fee is whatever
     * the seller set. `pickup` never needs a buyer address (the destination is the store itself);
     * `flat` still collects one so the store knows where to actually deliver, it just isn't
     * resolved against a shipping provider since the fee doesn't depend on it.
     *
     * @return array{0: int, 1: array<string, string|null>, 2: array<string, mixed>|null, 3: array<string, mixed>|null}
     */
    private function resolveCustomShipping(User $buyer, Store $store, array $data): array
    {
        $method = StoreShippingMethod::where('store_id', $store->id)
            ->where('id', $data['shipping_method_id'])
            ->where('is_active', true)
            ->first();

        if (! $method) {
            throw ValidationException::withMessages([
                'shipping_method_id' => 'Metode pengiriman yang dipilih tidak lagi tersedia. Silakan pilih ulang.',
            ]);
        }

        $originAddress = $store->primaryAddress()->first();
        $originAddressSnapshot = $originAddress ? [
            'recipient_name' => $originAddress->recipient_name,
            'phone' => $originAddress->phone,
            'address_line' => $originAddress->address_line,
            'postal_code' => $originAddress->postal_code,
        ] : null;

        $shippingSnapshot = [
            'shipping_provider' => 'store',
            'store_shipping_method_id' => $method->id,
            'shipping_courier_code' => $method->type,
            'shipping_courier_name' => $method->name,
            'shipping_service' => null,
            'shipping_etd' => null,
        ];

        if ($method->isPickup()) {
            return [(int) $method->fee, $shippingSnapshot, null, $originAddressSnapshot];
        }

        if (empty($data['user_address_id'])) {
            throw ValidationException::withMessages(['user_address_id' => 'Pilih alamat pengiriman.']);
        }

        $buyerAddress = UserAddress::where('user_id', $buyer->id)->find($data['user_address_id']);
        if (! $buyerAddress) {
            throw ValidationException::withMessages(['user_address_id' => 'Alamat tidak ditemukan.']);
        }

        $shippingAddressSnapshot = [
            'recipient_name' => $buyerAddress->recipient_name,
            'phone' => $buyerAddress->phone,
            'address_line' => $buyerAddress->address_line,
            'full_address' => $buyerAddress->full_address,
            'postal_code' => $buyerAddress->postal_code,
        ];

        return [(int) $method->fee, $shippingSnapshot, $shippingAddressSnapshot, $originAddressSnapshot];
    }

    private function initiateSatuteraPayment(StoreOrder $order, Transaction $transaction, User $buyer, array $data): void
    {
        try {
            $payload = [
                'client_id' => config('services.satutera.client_id'),
                'client_transaction_id' => $order->order_number,
                'amount' => (int) round((float) $transaction->amount),
                'currency' => 'IDR',
                'provider' => $data['payment_provider'],
                'payment_method' => $data['payment_method'],
                'payment_channel' => $data['payment_channel'],
                'response_mode' => 'raw_detail',
                'customer' => [
                    'name' => $buyer->name,
                    'email' => $buyer->email,
                    'phone' => $buyer->phone_number,
                ],
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->name_snapshot.($item->variant_label_snapshot ? " ({$item->variant_label_snapshot})" : ''),
                    'price' => (int) $item->unit_price,
                    'quantity' => $item->quantity,
                ])->all(),
                'client_redirect' => [
                    'success_url' => route('store.orders.show', $order->id),
                    'failed_url' => route('store.payment.show', $transaction->payment_hash),
                    'expired_url' => route('store.payment.show', $transaction->payment_hash),
                ],
                'metadata' => ['order_id' => $order->id, 'store_id' => $order->store_id],
            ];

            $response = $this->satutera->createPayment($payload, "order-{$order->id}-{$transaction->id}");

            $transaction->update([
                'external_reference' => $response['payment_id'] ?? null,
                'checkout_token' => $response['checkout_token'] ?? null,
                'payment_detail' => $response['payment_detail'] ?? null,
                'va_number' => $response['payment_detail']['payment_no'] ?? null,
                'expired_at' => isset($response['expires_at']) ? Carbon::parse($response['expires_at']) : null,
            ]);
        } catch (\Throwable $e) {
            report($e);
            // Order + transaction remain pending_payment/pending — the payment page can retry
            // payment creation when there's no external_reference yet, so checkout still
            // succeeds and the buyer isn't stuck on a hard failure here.
        }
    }
}
