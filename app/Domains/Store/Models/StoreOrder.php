<?php

namespace App\Domains\Store\Models;

use App\Domains\Event\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class StoreOrder extends Model
{
    use HasUlids;

    protected $fillable = [
        'order_number',
        'store_id',
        'buyer_user_id',
        'status',
        'requires_shipping',
        'subtotal',
        'shipping_cost',
        'payment_fee',
        'total',
        'total_weight_grams',
        'shipping_provider',
        'store_shipping_method_id',
        'shipping_courier_code',
        'shipping_courier_name',
        'shipping_service',
        'shipping_etd',
        'shipping_address_snapshot',
        'origin_address_snapshot',
        'buyer_note',
        'cancellation_reason',
        'tracking_number',
        'expires_at',
        'paid_at',
        'shipped_at',
        'completed_at',
        'cancelled_at',
        'stock_released_at',
    ];

    protected $casts = [
        'requires_shipping' => 'boolean',
        'subtotal' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'payment_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'shipping_address_snapshot' => 'json',
        'origin_address_snapshot' => 'json',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'shipped_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'stock_released_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (StoreOrder $order): void {
            if (empty($order->order_number)) {
                do {
                    $candidate = 'INV/'.now()->format('Ymd').'/'.strtoupper(Str::random(6));
                } while (static::where('order_number', $candidate)->exists());
                $order->order_number = $candidate;
            }
        });
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StoreOrderItem::class);
    }

    public function transactions(): MorphMany
    {
        return $this->morphMany(Transaction::class, 'payable');
    }

    public function latestTransaction(): ?Transaction
    {
        return $this->transactions()->latest('id')->first();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending_payment';
    }
}
