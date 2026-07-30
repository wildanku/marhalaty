<?php

namespace App\Domains\Store\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Product extends Model implements HasMedia
{
    use HasSlug, HasUlids, InteractsWithMedia;

    protected $fillable = [
        'store_id',
        'name',
        'slug',
        'description',
        'type',
        'sku',
        'status',
        'has_variants',
        'price',
        'stock_quantity',
        'weight_grams',
        'options',
    ];

    protected $casts = [
        'options' => 'json',
        'price' => 'decimal:2',
        'has_variants' => 'boolean',
    ];

    protected $appends = ['images', 'primary_image_url', 'display_price', 'available_stock'];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug')
            ->doNotGenerateSlugsOnUpdate();
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('product-images')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp'])
            ->useDisk('public');

        // Digital files must never be public — leaked URLs would let anyone download paid
        // products without paying. Access is gated behind a signed route in fase 5.
        $this->addMediaCollection('product-digital-file')
            ->singleFile()
            ->useDisk('local');
    }

    public function getImagesAttribute(): array
    {
        return $this->getMedia('product-images')
            ->map(fn ($media) => $media->getUrl())
            ->values()
            ->all();
    }

    public function getPrimaryImageUrlAttribute(): ?string
    {
        return $this->getFirstMediaUrl('product-images') ?: null;
    }

    public function getDisplayPriceAttribute(): string
    {
        if (! $this->has_variants) {
            return (string) ($this->price ?? '0.00');
        }

        $lowest = $this->relationLoaded('variants')
            ? $this->variants->where('is_active', true)->min('price')
            : $this->variants()->where('is_active', true)->min('price');

        return (string) ($lowest ?? '0.00');
    }

    public function getAvailableStockAttribute(): int
    {
        if (! $this->has_variants) {
            return (int) ($this->stock_quantity ?? 0);
        }

        return $this->relationLoaded('variants')
            ? (int) $this->variants->where('is_active', true)->sum('stock_quantity')
            : (int) $this->variants()->where('is_active', true)->sum('stock_quantity');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('status', 'active')
            ->whereHas('store', fn (Builder $s) => $s->publiclyVisible());
    }

    public function isPhysical(): bool
    {
        return $this->type === 'physical';
    }

    public function isDigital(): bool
    {
        return $this->type === 'digital';
    }
}
