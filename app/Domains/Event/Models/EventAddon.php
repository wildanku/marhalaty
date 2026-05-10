<?php

namespace App\Domains\Event\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class EventAddon extends Model implements HasMedia
{
    use InteractsWithMedia;

    protected $fillable = [
        'event_id',
        'name',
        'price',
        'stock_quantity',
        'variants',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'variants' => 'json',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        return $this->getFirstMediaUrl('addon-images');
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('addon-images')->singleFile();
    }
}
