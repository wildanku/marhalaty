<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Option Model
 * 
 * Stores key-value configuration options for the application.
 * Used for storing enumerated values like professions, campuses, etc.
 */
class Option extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'key',
        'name',
        'value',
        'json_value',
        'description',
        'type',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'json_value' => 'json',
    ];
}
