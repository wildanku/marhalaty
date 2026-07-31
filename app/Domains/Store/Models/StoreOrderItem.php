<?php

namespace App\Domains\Store\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreOrderItem extends Model
{
    protected $fillable = [
        'store_order_id',
        'product_id',
        'product_variant_id',
        'name_snapshot',
        'variant_label_snapshot',
        'note_snapshot',
        'sku_snapshot',
        'type_snapshot',
        'unit_price',
        'quantity',
        'weight_grams',
        'subtotal',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(StoreOrder::class, 'store_order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function digitalDeliveries(): HasMany
    {
        return $this->hasMany(DigitalDelivery::class, 'store_order_item_id');
    }

    public function isDigital(): bool
    {
        return $this->type_snapshot === 'digital';
    }
}
