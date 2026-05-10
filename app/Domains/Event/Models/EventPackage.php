<?php

namespace App\Domains\Event\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class EventPackage extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

    protected $fillable = [
        'event_id',
        'name',
        'description',
        'price',
        'stock_quantity',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock_quantity' => 'integer',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        return $this->getFirstMediaUrl('package-images');
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Merchandise/addons bundled into this package.
     * The pivot stores the included_quantity for each bundled item.
     */
    public function includedAddons()
    {
        return $this->belongsToMany(
            EventAddon::class,
            'event_package_included_addons',
            'event_package_id',
            'event_addon_id'
        )->withPivot('included_quantity')->withTimestamps();
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('package-images')->singleFile();
    }
}
