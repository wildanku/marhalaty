<?php

namespace App\Domains\Shared\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingDestination extends Model
{
    protected $fillable = [
        'provider',
        'destination_id',
        'label',
        'subdistrict_name',
        'district_name',
        'city_name',
        'province_name',
        'zip_code',
        'synced_at',
    ];

    protected $casts = [
        'synced_at' => 'datetime',
    ];
}
