<?php

namespace App\Domains\Event\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Event extends Model implements HasMedia
{
    use HasFactory, HasSlug, InteractsWithMedia;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'location',
        'event_date',
        'payment_type',
        'pricing_rules',
        'visibility_scope',
        'metadata',
    ];

    protected $casts = [
        'event_date' => 'datetime',
        'pricing_rules' => 'json',
        'metadata' => 'json',
    ];

    public function getSlugOptions() : SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug');
    }

    public function addons()
    {
        return $this->hasMany(EventAddon::class);
    }

    public function rsvps()
    {
        return $this->hasMany(Rsvp::class);
    }

    /**
     * Register media collections for event images and documents.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('event-images')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp'])
            ->useDisk('public');

        $this->addMediaCollection('event-documents')
            ->acceptsMimeTypes(['application/pdf', 'application/msword'])
            ->useDisk('public');
    }
}
