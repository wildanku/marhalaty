<?php

namespace App\Domains\Event\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

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
    ];

    protected $casts = [
        'package_amount' => 'decimal:2',
        'infak_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'add_ons_snapshot' => 'json',
        'custom_form_data' => 'json',
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
}
