<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TelegramWhitelist extends Model
{
    protected $fillable = [
        'chat_id',
        'name',
        'is_active',
    ];

    protected $casts = [
        'chat_id'   => 'integer',
        'is_active' => 'boolean',
    ];

    public static function isAllowed(int|string $chatId): bool
    {
        return static::where('chat_id', $chatId)
            ->where('is_active', true)
            ->exists();
    }
}
