<?php

namespace App\Domains\Donation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\User;

class Donation extends Model
{
    use HasFactory;

    protected $fillable = [
        'donatable_type',
        'donatable_id',
        'user_id',
        'amount',
        'status',
        'is_anonymous',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_anonymous' => 'boolean',
    ];

    public function donatable()
    {
        return $this->morphTo();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
