<?php

namespace App\Domains\Event\Models;

use App\Domains\Store\Models\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventAddonVariant extends Model
{
    protected $fillable = [
        'event_addon_id',
        'product_variant_id',
        'option1_name',
        'option1_value',
        'option2_name',
        'option2_value',
        'price',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $appends = ['label'];

    public function addon(): BelongsTo
    {
        return $this->belongsTo(EventAddon::class, 'event_addon_id');
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function getLabelAttribute(): string
    {
        return implode(' / ', array_filter([$this->option1_value, $this->option2_value]));
    }
}
