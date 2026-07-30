<?php

namespace App\Domains\Store\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreShippingMethod extends Model
{
    use HasUlids;

    protected $fillable = [
        'store_id',
        'name',
        'type',
        'fee',
        'description',
        'is_active',
    ];

    protected $casts = [
        'fee' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function isPickup(): bool
    {
        return $this->type === 'pickup';
    }
}
