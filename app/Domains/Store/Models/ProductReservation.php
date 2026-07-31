<?php

namespace App\Domains\Store\Models;

use App\Domains\Event\Models\EventAddon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Ledger of product units taken by a channel outside the normal store checkout — today always an
 * event RSVP (D27, docs/plan/mvp2/8-event-product-integration.md). Deliberately not a `StoreOrder`:
 * this only records stock movement, not a sale (no shipping/payment/store-revenue implications).
 */
class ProductReservation extends Model
{
    protected $fillable = [
        'product_id',
        'product_variant_id',
        'reservable_type',
        'reservable_id',
        'event_addon_id',
        'quantity',
        'status',
        'selection_snapshot',
        'released_at',
        'fulfilled_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'selection_snapshot' => 'json',
        'released_at' => 'datetime',
        'fulfilled_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function addon(): BelongsTo
    {
        return $this->belongsTo(EventAddon::class, 'event_addon_id');
    }

    public function reservable(): MorphTo
    {
        return $this->morphTo();
    }
}
