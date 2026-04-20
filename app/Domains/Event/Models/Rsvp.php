<?php

namespace App\Domains\Event\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class Rsvp extends Model
{
    protected $fillable = [
        'event_id',
        'user_id',
        'base_amount',
        'total_amount',
        'status',
        'add_ons_snapshot',
        'qr_code_path',
    ];

    protected $casts = [
        'base_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'add_ons_snapshot' => 'json',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
