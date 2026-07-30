<?php

namespace App\Domains\Store\Models;

use App\Domains\Shared\Models\IndonesiaVillage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreAddress extends Model
{
    protected $fillable = [
        'store_id',
        'label',
        'recipient_name',
        'phone',
        'address_line',
        'village_id',
        'postal_code',
        'lat',
        'lng',
        'rajaongkir_destination_id',
        'destination_resolved_at',
        'is_primary',
    ];

    protected $casts = [
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
        'destination_resolved_at' => 'datetime',
        'is_primary' => 'boolean',
    ];

    protected $appends = ['full_address'];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function village(): BelongsTo
    {
        return $this->belongsTo(IndonesiaVillage::class, 'village_id');
    }

    public function getFullAddressAttribute(): string
    {
        $village = $this->village()->with('district.city.province')->first();

        $parts = array_filter([
            $this->address_line,
            $village ? "Kel. {$village->name}" : null,
            $village?->district ? "Kec. {$village->district->name}" : null,
            $village?->district?->city ? $village->district->city->name : null,
            $village?->district?->city?->province ? $village->district->city->province->name : null,
            $this->postal_code,
        ]);

        return implode(', ', $parts);
    }
}
