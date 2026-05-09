<?php

namespace App\Domains\Event\Models;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Transaction extends Model
{
    protected $fillable = [
        'rsvp_id',
        'user_id',
        'amount',
        'payment_provider',
        'status',
        'external_reference',
        'payment_url',
        'va_number',
        'paid_at',
        'expired_at',
        'metadata',
    ];

    protected $casts = [
        'amount'   => 'decimal:2',
        'paid_at'  => 'datetime',
        'expired_at' => 'datetime',
        'metadata' => 'json',
    ];

    // ─── Relationships ────────────────────────────────────────────────

    public function rsvp(): BelongsTo
    {
        return $this->belongsTo(Rsvp::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function proof(): HasOne
    {
        return $this->hasOne(PaymentProof::class);
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function isManual(): bool
    {
        return $this->payment_provider === 'manual';
    }

    public function isIpaymu(): bool
    {
        return $this->payment_provider === 'ipaymu';
    }
}
