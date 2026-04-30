<?php

namespace App\Domains\Shared\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IndonesiaCity extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $guarded = [];

    public function province(): BelongsTo
    {
        return $this->belongsTo(IndonesiaProvince::class, 'province_id');
    }

    public function districts(): HasMany
    {
        return $this->hasMany(IndonesiaDistrict::class, 'city_id');
    }
}
