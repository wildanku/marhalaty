<?php

namespace App\Models;

use App\Domains\Page\Models\Page;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;

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

    public function pagesCreated(): HasMany
    {
        return $this->hasMany(Page::class, 'created_by_admin_id');
    }

    public function pagesUpdated(): HasMany
    {
        return $this->hasMany(Page::class, 'updated_by_admin_id');
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];
}
