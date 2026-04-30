<?php

namespace App\Domains\Donation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Campaign extends Model implements HasMedia
{
    use HasFactory, HasSlug, InteractsWithMedia;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'image_url',
        'target_amount',
        'collected_amount',
        'end_date',
        'status',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'collected_amount' => 'decimal:2',
        'end_date' => 'date',
    ];

    public function getSlugOptions() : SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug');
    }

    public function donations()
    {
        return $this->morphMany(Donation::class, 'donatable');
    }

    public function updates()
    {
        return $this->hasMany(CampaignUpdate::class);
    }

    /**
     * Register media collections for campaign images and updates.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('campaign-featured-image')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp'])
            ->useDisk('public');

        $this->addMediaCollection('campaign-gallery')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp'])
            ->useDisk('public');

        $this->addMediaCollection('campaign-documents')
            ->acceptsMimeTypes(['application/pdf'])
            ->useDisk('public');
    }
}
