<?php

namespace App\Domains\Event\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Rsvp extends Model
{
    protected $fillable = [
        'event_id',
        'user_id',
        'event_package_id',
        'package_amount',
        'infak_amount',
        'total_amount',
        'status',
        'add_ons_snapshot',
        'qr_code_path',
        'custom_form_data',
        'is_manual_entry',
        'guest_name',
        'guest_email',
        'guest_phone',
        'manual_entry_note',
        'admin_id',
    ];

    protected $casts = [
        'package_amount' => 'decimal:2',
        'infak_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'add_ons_snapshot' => 'json',
        'custom_form_data' => 'json',
        'is_manual_entry' => 'boolean',
    ];

    public function package()
    {
        return $this->belongsTo(EventPackage::class, 'event_package_id');
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function latestTransaction(): HasOne
    {
        return $this->hasOne(Transaction::class)->latestOfMany();
    }

    public function admin()
    {
        return $this->belongsTo(\App\Models\Admin::class);
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->guest_name ?? optional($this->user)->name ?? '—';
    }

    public function getDisplayPhoneAttribute(): ?string
    {
        return $this->guest_phone ?? optional($this->user)->phone_number;
    }
}
