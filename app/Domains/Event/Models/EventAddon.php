<?php

namespace App\Domains\Event\Models;

use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductVariant;
use App\Support\Eloquent\HasTypeSafeMorphMany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class EventAddon extends Model implements HasMedia
{
    use HasTypeSafeMorphMany, InteractsWithMedia;

    protected $fillable = [
        'event_id',
        'name',
        'price',
        'stock_quantity',
        'has_variants',
        'options',
        'form_fields',
        'product_id',
        'product_variant_id',
        'stock_source',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'has_variants' => 'boolean',
        'options' => 'json',
        'form_fields' => 'json',
    ];

    protected $appends = ['image_url', 'is_product_linked', 'available_stock', 'variant_options', 'display_price'];

    public function getImageUrlAttribute()
    {
        return $this->getFirstMediaUrl('addon-images');
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * Per-combination pricing (max 2 option groups) — mirrors `Product::variants()`. Populated for
     * manual addons (admin-typed) and for product-linked addons that aren't locked to a single
     * variant (docs/plan/mvp2/8-event-product-integration.md addendum, supersedes D26's flat price).
     */
    public function variants(): HasMany
    {
        return $this->hasMany(EventAddonVariant::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('addon-images')->singleFile();
    }

    public function getIsProductLinkedAttribute(): bool
    {
        return $this->stock_source === 'product' && $this->product_id !== null;
    }

    /**
     * Stock as seen by the buyer. `stock_quantity` (event's own free-standing counter) is
     * ignored entirely once `stock_source = 'product'` — D25, docs/plan/mvp2/8-event-product-integration.md:
     * a linked addon has no stock of its own, only the product/variant does. Locked to a single
     * variant → that variant's count; otherwise a variant-bearing product → summed across all its
     * variants (reuses `Product::available_stock`, same rule the storefront uses); otherwise the
     * product's own `stock_quantity`.
     */
    public function getAvailableStockAttribute(): ?int
    {
        if (! $this->is_product_linked) {
            return $this->stock_quantity;
        }

        if ($this->product_variant_id) {
            $variant = $this->relationLoaded('variant') ? $this->variant : $this->variant()->first();

            return (int) ($variant?->stock_quantity ?? 0);
        }

        $product = $this->relationLoaded('product') ? $this->product : $this->product()->first();

        return $product?->available_stock ?? 0;
    }

    /**
     * `{"Ukuran": ["M","L"], "Warna": ["Merah","Putih"]}` shape `Event/Show.tsx` builds pickers
     * from — same for manual and product-linked addons now (addendum to
     * docs/plan/mvp2/8-event-product-integration.md, supersedes D26's live-derived-only version):
     * `options` is populated once, either admin-typed or copied from the linked product at link
     * time, and stays put until an admin edits it. Null when the addon has no variants.
     */
    public function getVariantOptionsAttribute(): ?array
    {
        if (! $this->has_variants || ! $this->options) {
            return null;
        }

        return collect($this->options)->mapWithKeys(fn ($group) => [$group['name'] => $group['values']])->all();
    }

    /**
     * Mirrors `Product::display_price` — the flat `price` when there are no variants, otherwise the
     * lowest active combination price. Used for "mulai dari" ("starting from") display before a
     * buyer has picked a variant.
     */
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
}
