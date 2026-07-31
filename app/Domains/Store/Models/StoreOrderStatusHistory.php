<?php

namespace App\Domains\Store\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreOrderStatusHistory extends Model
{
    protected $fillable = [
        'store_order_id',
        'from_status',
        'to_status',
        'reason',
        'actor_type',
        'actor_id',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(StoreOrder::class, 'store_order_id');
    }
}
