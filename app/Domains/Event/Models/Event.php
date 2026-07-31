<?php

namespace App\Domains\Event\Models;

use App\Support\Eloquent\HasTypeSafeMorphMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Event extends Model implements HasMedia
{
    use HasFactory, HasSlug, HasTypeSafeMorphMany, InteractsWithMedia;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'location',
        'event_date',
        'infak_rules',
        'visibility_scope',
        'metadata',
        'is_registration_enabled',
    ];

    protected $casts = [
        'event_date' => 'datetime',
        'infak_rules' => 'json',
        'metadata' => 'json',
        'is_registration_enabled' => 'boolean',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug')
            ->doNotGenerateSlugsOnUpdate();
    }

    public function packages()
    {
        return $this->hasMany(EventPackage::class);
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
