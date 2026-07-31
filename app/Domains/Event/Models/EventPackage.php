<?php

namespace App\Domains\Event\Models;

use App\Support\Eloquent\HasTypeSafeMorphMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class EventPackage extends Model implements HasMedia
{
    use HasFactory, HasTypeSafeMorphMany, InteractsWithMedia;

    protected $fillable = [
        'event_id',
        'name',
        'description',
        'price',
        'quota',
        'booked_count',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'quota' => 'integer',
        'booked_count' => 'integer',
    ];

    protected $appends = ['image_url', 'available_quota', 'is_available'];

    public function getImageUrlAttribute()
    {
        return $this->getFirstMediaUrl('package-images');
    }

    public function getAvailableQuotaAttribute(): ?int
    {
        return $this->getAvailableQuota();
    }

    public function getIsAvailableAttribute(): bool
    {
        return $this->hasAvailableQuota();
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

    // ─── Quota Management ─────────────────────────────────────────────

    /**
     * Get available quota (remaining capacity).
     * If quota is null, unlimited. Otherwise available = quota - booked_count.
     */
    public function getAvailableQuota(): ?int
    {
        if ($this->quota === null) {
            return null; // Unlimited
        }

        return max(0, $this->quota - $this->booked_count);
    }

    /**
     * Check if this package still has available quota.
     */
    public function hasAvailableQuota(): bool
    {
        if ($this->quota === null) {
            return true; // Unlimited
        }

        return $this->booked_count < $this->quota;
    }

    /**
     * Increment booked count when an RSVP transitions to 'paid'.
     */
    public function incrementBooked(): void
    {
        if ($this->quota !== null) {
            $this->increment('booked_count');
        }
    }

    /**
     * Decrement booked count when an RSVP transitions away from 'paid'.
     */
    public function decrementBooked(): void
    {
        if ($this->quota !== null && $this->booked_count > 0) {
            $this->decrement('booked_count');
        }
    }
}
