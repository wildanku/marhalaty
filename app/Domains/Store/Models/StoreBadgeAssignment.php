<?php

namespace App\Domains\Store\Models;

use App\Models\Admin;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreBadgeAssignment extends Model
{
    protected $fillable = [
        'store_id',
        'store_badge_id',
        'assigned_by',
        'assigned_at',
        'expires_at',
        'note',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function badge(): BelongsTo
    {
        return $this->belongsTo(StoreBadge::class, 'store_badge_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'assigned_by');
    }
}
