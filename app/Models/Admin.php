<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Admin extends Authenticatable
{
    use HasFactory;

    protected $guard = 'admin';

    protected $fillable = [
        'google_id',
        'name',
        'email',
        'password',
        'avatar_url',
        'role',
    ];

    public function activityLogs()
    {
        return $this->hasMany(AdminActivityLog::class);
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];
}
