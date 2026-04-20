<?php

namespace App\Domains\Donation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Campaign extends Model
{
    use HasFactory, HasSlug;

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
}
