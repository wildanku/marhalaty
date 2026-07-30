<?php

namespace App\Domains\Store\Models;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Store extends Model implements HasMedia
{
    use HasSlug, HasUlids, InteractsWithMedia;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'owner_user_id',
        'status',
        'contact_phone',
        'contact_email',
        'is_active',
        'created_by_admin_id',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected $appends = ['logo_url', 'banner_url'];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug')
            ->doNotGenerateSlugsOnUpdate();
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('store-logo')->singleFile()->useDisk('public');
        $this->addMediaCollection('store-banner')->singleFile()->useDisk('public');
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->getFirstMediaUrl('store-logo') ?: null;
    }

    public function getBannerUrlAttribute(): ?string
    {
        return $this->getFirstMediaUrl('store-banner') ?: null;
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'verified_by');
    }

    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'created_by_admin_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(StoreMember::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(StoreAddress::class);
    }

    public function primaryAddress(): HasOne
    {
        return $this->hasOne(StoreAddress::class)->where('is_primary', true);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function scopePubliclyVisible(Builder $q): Builder
    {
        return $q->where('status', 'approved')->where('is_active', true);
    }

    public function isPubliclyVisible(): bool
    {
        return $this->status === 'approved' && $this->is_active;
    }

    public function isManagedBy(User $user): bool
    {
        return $this->members()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
    }

    public function roleFor(User $user): ?string
    {
        return $this->members()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->value('role');
    }
}
