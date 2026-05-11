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
        $exists = static::where('chat_id', $chatId)
            ->where('is_active', true)
            ->exists();

        \Illuminate\Support\Facades\Log::debug('TelegramWhitelist::isAllowed check', [
            'chat_id'   => $chatId,
            'exists'    => $exists,
            'chat_id_type' => gettype($chatId),
        ]);

        return $exists;
    }
}
