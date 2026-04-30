<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

#[Fillable(['name', 'email', 'google_id', 'avatar_url', 'marhalah_year', 'phone_number', 'is_verified', 'slug', 'country', 'city_id', 'foreign_city', 'profession_id', 'campus_id', 'social_media', 'metadata', 'privacy_setting', 'business_showcase_url'])]
#[Hidden(['remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasSlug;

    /**
     * Get the options for generating the slug.
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    public function donations()
    {
        return $this->hasMany(\App\Domains\Donation\Models\Donation::class);
    }

    public function city()
    {
        return $this->belongsTo(\App\Domains\Shared\Models\IndonesiaCity::class, 'city_id');
    }

    public function profession()
    {
        return $this->belongsTo(Option::class, 'profession_id');
    }

    public function campus()
    {
        return $this->belongsTo(Option::class, 'campus_id');
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new \App\Models\Scopes\MarhalahScope());
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'social_media' => 'array',
            'metadata' => 'array',
        ];
    }
}
