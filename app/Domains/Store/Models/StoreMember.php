<?php

namespace App\Domains\Store\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreMember extends Model
{
    protected $fillable = [
        'store_id',
        'user_id',
        'role',
        'status',
        'invited_by_user_id',
        'invitation_token',
        'invitation_expires_at',
        'accepted_at',
        'revoked_at',
    ];

    protected $casts = [
        'invitation_expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function isExpired(): bool
    {
        return $this->invitation_expires_at !== null && $this->invitation_expires_at->isPast();
    }
}
