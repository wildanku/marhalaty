<?php

namespace App\Domains\Store\Services;

use App\Domains\Shared\Services\TelegramService;
use App\Domains\Store\Models\DigitalDelivery;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductVariant;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Models\StoreOrderStatusHistory;
use App\Jobs\SendStoreNewOrderEmail;
use App\Jobs\SendStoreOrderPaidEmail;
use App\Jobs\SendStoreOrderShippedEmail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderFulfillmentService
{
    /**
     * Explicit transition map — a seller/buyer action can only move an order to one of these
     * next states, never to an arbitrary `status` value taken straight from the request.
     */
    private const VALID_TRANSITIONS = [
        'paid' => ['processing', 'cancelled'],
        'processing' => ['shipped', 'cancelled'],
        'shipped' => ['completed'],
    ];

    /**
     * A separate, deliberately looser matrix for the manual "Ubah Status Pesanan" admin control
     * (fase 11, D50) — used only by `overrideStatus()`, never by the automatic transitions above.
     * `cancelled`/`expired` → `pending_payment` ("buka lagi") is listed here but gated to god-mode
     * only at the controller layer (D51) — it doesn't re-lock stock, see that method's docblock.
     */
    private const OVERRIDE_TRANSITIONS = [
        'pending_payment' => ['paid', 'cancelled'],
        'paid' => ['processing', 'shipped', 'completed', 'cancelled'],
        'processing' => ['shipped', 'completed', 'cancelled'],
        'shipped' => ['completed'],
        'cancelled' => ['pending_payment'],
        'expired' => ['pending_payment'],
    ];

    public function __construct(private TelegramService $telegram) {}

    /**
     * Called once the payment callback confirms `paid` (never from the socket event or a browser
     * redirect — see D4). The caller has already set `status = paid` before invoking this; this
     * method only handles the side effects (digital delivery issuance, notifications).
     */
    public function onPaid(StoreOrder $order): void
    {
        $order->loadMissing(['buyer', 'store.owner', 'items']);

        $this->issueDigitalDeliveries($order);

        SendStoreOrderPaidEmail::dispatch($order->fresh(['buyer', 'store', 'items.digitalDeliveries']));
        SendStoreNewOrderEmail::dispatch($order);

        if ($order->store) {
            $this->telegram->sendMessage(
                config('services.telegram.notify_chat_id', ''),
                "💰 <b>Pesanan Baru Dibayar</b>\n\n".
                    '🏬 <b>Toko:</b> '.e($order->store->name)."\n".
                    '🔖 <b>No. Order:</b> '.e($order->order_number)."\n".
                    '💵 <b>Total:</b> Rp '.number_format((float) $order->total, 0, ',', '.')
            );
        }

        Log::info('Store order marked paid', [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'store_id' => $order->store_id,
        ]);
    }

    public function markProcessing(StoreOrder $order): StoreOrder
    {
        return $this->applyTransition($order, 'processing');
    }

    public function markShipped(StoreOrder $order, string $trackingNumber): StoreOrder
    {
        $updated = $this->applyTransition($order, 'shipped', [
            'tracking_number' => $trackingNumber,
            'shipped_at' => now(),
        ]);

        SendStoreOrderShippedEmail::dispatch($updated->loadMissing(['buyer', 'store']));

        return $updated;
    }

    public function markCompleted(StoreOrder $order): StoreOrder
    {
        return $this->applyTransition($order, 'completed', ['completed_at' => now()]);
    }

    /**
     * Only allowed from `paid`/`processing` — matches the spec exactly (a `shipped` order can no
     * longer be cancelled from here, since the parcel is already with the courier).
     */
    public function cancel(StoreOrder $order, string $reason): StoreOrder
    {
        return DB::transaction(function () use ($order, $reason) {
            $locked = StoreOrder::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if (! in_array($locked->status, ['paid', 'processing'], true)) {
                throw ValidationException::withMessages([
                    'status' => "Order berstatus \"{$locked->status}\" tidak bisa dibatalkan.",
                ]);
            }

            $locked->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
            ]);

            $this->releaseStock($locked);

            return $locked->fresh();
        });
    }

    /**
     * Reverses the stock decrement made at checkout time. Idempotent via `stock_released_at` —
     * the scheduled expiry command and a late webhook can both reach this for the same order, and
     * only the first call may actually credit stock back.
     */
    public function releaseStock(StoreOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $locked = StoreOrder::where('id', $order->id)->lockForUpdate()->first();

            if (! $locked || $locked->stock_released_at !== null) {
                return;
            }

            $locked->loadMissing('items');

            foreach ($locked->items as $item) {
                if ($item->product_variant_id) {
                    ProductVariant::where('id', $item->product_variant_id)->increment('stock_quantity', $item->quantity);
                } else {
                    Product::where('id', $item->product_id)->increment('stock_quantity', $item->quantity);
                }
            }

            $locked->update(['stock_released_at' => now()]);

            Log::info('Store order stock released', [
                'order_id' => $locked->id,
                'order_number' => $locked->order_number,
            ]);
        });
    }

    /**
     * Manual override used only by the "Ubah Status Pesanan" admin control (admin-store and
     * god-mode) — a seller correcting a payment that happened outside the system, or an admin
     * fixing a stuck order. Deliberately separate from `applyTransition()`'s automatic-flow
     * matrix so the two never get confused, and every use is recorded in
     * `store_order_status_histories` for audit (D50).
     */
    public function overrideStatus(
        StoreOrder $order,
        string $to,
        ?string $reason,
        string $actorType,
        int|string $actorId,
        ?string $trackingNumber = null,
    ): StoreOrder {
        return DB::transaction(function () use ($order, $to, $reason, $actorType, $actorId, $trackingNumber) {
            $locked = StoreOrder::where('id', $order->id)->lockForUpdate()->firstOrFail();
            $from = $locked->status;
            $allowed = self::OVERRIDE_TRANSITIONS[$from] ?? [];

            throw_unless(in_array($to, $allowed, true), ValidationException::withMessages([
                'status' => "Status tidak bisa dipindahkan dari \"{$from}\" ke \"{$to}\".",
            ]));

            $extra = match ($to) {
                'paid' => ['paid_at' => now()],
                'shipped' => ['shipped_at' => now(), 'tracking_number' => $trackingNumber ?? $locked->tracking_number],
                'completed' => ['completed_at' => now()],
                'cancelled' => ['cancelled_at' => now(), 'cancellation_reason' => $reason],
                // "Buka lagi" — stock is deliberately NOT re-locked here (D51); the UI that offers
                // this transition must warn the operator to verify availability manually.
                'pending_payment' => ['expires_at' => now()->addMinutes((int) config('store.order_expiry_minutes'))],
                default => [],
            };

            $locked->update(array_merge(['status' => $to], $extra));
            $fresh = $locked->fresh(['buyer', 'store.owner', 'items']);

            // Side effects mirror the automatic transitions — one definition of "what happens when
            // an order becomes X", whether it got there via webhook or manual override.
            match ($to) {
                'paid' => $this->handleOverrideToPaid($fresh),
                'cancelled' => $this->handleOverrideToCancelled($fresh),
                'shipped' => SendStoreOrderShippedEmail::dispatch($fresh->loadMissing(['buyer', 'store'])),
                default => null,
            };

            StoreOrderStatusHistory::create([
                'store_order_id' => $locked->id,
                'from_status' => $from,
                'to_status' => $to,
                'reason' => $reason,
                'actor_type' => $actorType,
                'actor_id' => $actorId,
            ]);

            return $locked->fresh();
        });
    }

    /**
     * The transaction is marked `paid` (if it was still `pending`) before `onPaid()` runs, so a
     * webhook that arrives after this override sees a non-`pending` transaction and skips
     * reprocessing (see `SatuteraWebhookController`'s pending-only guard).
     */
    private function handleOverrideToPaid(StoreOrder $order): void
    {
        $this->syncTransactionPaid($order);
        $this->onPaid($order);
    }

    private function handleOverrideToCancelled(StoreOrder $order): void
    {
        $this->releaseStock($order);
        $this->voidPendingTransaction($order);
    }

    private function syncTransactionPaid(StoreOrder $order): void
    {
        $transaction = $order->latestTransaction();

        if ($transaction && $transaction->status === 'pending') {
            $transaction->update(['status' => 'paid', 'paid_at' => now()]);
        }
    }

    /**
     * Marks a still-`pending` transaction `cancelled` so a late webhook for it has nothing left
     * to process (see the pending-only guard in `SatuteraWebhookController`).
     */
    private function voidPendingTransaction(StoreOrder $order): void
    {
        $transaction = $order->latestTransaction();

        if ($transaction && $transaction->status === 'pending') {
            $transaction->update(['status' => 'cancelled']);
        }
    }

    private function applyTransition(StoreOrder $order, string $to, array $extra = []): StoreOrder
    {
        return DB::transaction(function () use ($order, $to, $extra) {
            $locked = StoreOrder::where('id', $order->id)->lockForUpdate()->firstOrFail();
            $allowedNext = self::VALID_TRANSITIONS[$locked->status] ?? [];

            if (! in_array($to, $allowedNext, true)) {
                throw ValidationException::withMessages([
                    'status' => "Order tidak bisa dipindahkan dari \"{$locked->status}\" ke \"{$to}\".",
                ]);
            }

            $locked->update(array_merge(['status' => $to], $extra));

            return $locked->fresh();
        });
    }

    /**
     * One `DigitalDelivery` (download token) per digital order item. Idempotent — a retried
     * webhook for the same paid transaction must not mint a second token.
     */
    private function issueDigitalDeliveries(StoreOrder $order): void
    {
        foreach ($order->items as $item) {
            if ($item->type_snapshot !== 'digital') {
                continue;
            }

            if ($item->digitalDeliveries()->exists()) {
                continue;
            }

            $product = Product::find($item->product_id);
            $media = $product?->getFirstMedia('product-digital-file');

            if (! $media) {
                Log::warning('Digital order item has no source file', ['store_order_item_id' => $item->id]);

                continue;
            }

            DigitalDelivery::create([
                'store_order_item_id' => $item->id,
                'media_id' => $media->id,
                'download_token' => Str::random(64),
                'max_downloads' => config('store.digital_download_max'),
                'expires_at' => now()->addDays(30),
            ]);
        }
    }
}
