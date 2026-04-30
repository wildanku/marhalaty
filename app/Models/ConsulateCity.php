<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsulateCity extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'consulate_id',
        'city_id',
    ];

    /**
     * Get the consulate that owns this city mapping.
     */
    public function consulate()
    {
        return $this->belongsTo(Consulate::class);
    }
}
