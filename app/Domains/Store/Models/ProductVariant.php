<?php

namespace App\Domains\Store\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    use HasUlids;

    protected $fillable = [
        'product_id',
        'sku',
        'option1_name',
        'option1_value',
        'option2_name',
        'option2_value',
        'price',
        'stock_quantity',
        'weight_grams',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $appends = ['label', 'effective_weight'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getLabelAttribute(): string
    {
        return implode(' / ', array_filter([$this->option1_value, $this->option2_value]));
    }

    public function getEffectiveWeightAttribute(): int
    {
        return (int) ($this->weight_grams ?? $this->product?->weight_grams ?? 0);
    }
}
