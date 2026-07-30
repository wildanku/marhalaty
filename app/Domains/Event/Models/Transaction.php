<?php

namespace App\Domains\Event\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

class Transaction extends Model
{
    protected $fillable = [
        'rsvp_id',
        'payable_type',
        'payable_id',
        'user_id',
        'amount',
        'payment_provider',
        'payment_channel',
        'payment_hash',
        'status',
        'external_reference',
        'payment_url',
        'va_number',
        'payment_fee',
        'checkout_token',
        'payment_detail',
        'paid_at',
        'expired_at',
        'metadata',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Transaction $transaction): void {
            if (empty($transaction->payment_hash)) {
                do {
                    $hash = Str::random(40);
                } while (static::where('payment_hash', $hash)->exists());
                $transaction->payment_hash = $hash;
            }
        });
    }

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_fee' => 'decimal:2',
        'payment_detail' => 'json',
        'paid_at' => 'datetime',
        'expired_at' => 'datetime',
        'metadata' => 'json',
    ];

    // ─── Relationships ────────────────────────────────────────────────

    public function rsvp(): BelongsTo
    {
        return $this->belongsTo(Rsvp::class);
    }

    /**
     * Polymorphic owner of this transaction — `Rsvp` for the legacy event flow (still populated
     * via `rsvp_id` above, not this relation) or `StoreOrder` for the Store module.
     */
    public function payable(): MorphTo
    {
        return $this->morphTo();
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

    public function isSatutera(): bool
    {
        return $this->payment_provider === 'satutera';
    }
}
