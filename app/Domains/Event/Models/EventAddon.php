<?php

namespace App\Domains\Event\Models;

use Illuminate\Database\Eloquent\Model;

class EventAddon extends Model
{
    protected $fillable = [
        'event_id',
        'name',
        'price',
        'stock_quantity',
        'variants',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'variants' => 'json',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
