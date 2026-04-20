<?php

namespace App\Domains\Event\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Event extends Model
{
    use HasFactory, HasSlug;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'location',
        'event_date',
        'payment_type',
        'pricing_rules',
        'visibility_scope',
    ];

    protected $casts = [
        'event_date' => 'datetime',
        'pricing_rules' => 'json',
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
}
