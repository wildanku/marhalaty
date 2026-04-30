<?php

namespace App\Domains\Shared\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IndonesiaDistrict extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $guarded = [];

    public function city(): BelongsTo
    {
        return $this->belongsTo(IndonesiaCity::class, 'city_id');
    }

    public function villages(): HasMany
    {
        return $this->hasMany(IndonesiaVillage::class, 'district_id');
    }
}
