<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Consulate extends Model
{
    protected $fillable = [
        'name',
        'notes',
        'metadata',
        'created_by',
    ];

    protected $casts = [
        'metadata' => 'json',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the cities associated with this consulate.
     */
    public function cities(): HasMany
    {
        return $this->hasMany(ConsulateCity::class);
    }

    /**
     * Get city IDs for this consulate
     */
    public function cityIds(): array
    {
        return $this->cities()->pluck('city_id')->toArray();
    }
}
