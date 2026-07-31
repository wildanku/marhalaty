<?php

namespace App\Domains\Event\Services;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductVariant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Mirrors `App\Domains\Store\Services\ProductService`'s variant handling — same upsert-by-combo-key
 * pattern (`syncVariants`), same shape validation (`assertVariantsMatchOptions`). Addendum to
 * docs/plan/mvp2/8-event-product-integration.md, supersedes D26: addons now carry per-combination
 * pricing (max 2 option groups) instead of one flat price for every variant, for manual addons and
 * product-linked addons alike.
 */
class EventAddonService
{
    /**
     * Create/update a manual addon (no product link). Product-linked addons go through
     * `linkFromProduct()` instead — the two forms don't share a shape (this one has no
     * `product_id`/locked-variant branching).
     *
     * @param  array<string, mixed>  $data
     */
    public function saveAddon(Event $event, array $data, ?EventAddon $addon = null): EventAddon
    {
        $hasVariants = (bool) ($data['has_variants'] ?? false);

        if ($hasVariants) {
            $this->assertVariantsMatchOptions($data['options'], $data['variants']);
        } elseif (! isset($data['price'])) {
            throw ValidationException::withMessages([
                'price' => 'Harga wajib diisi.',
            ]);
        }

        return DB::transaction(function () use ($event, $data, $addon, $hasVariants) {
            $attributes = [
                'name' => $data['name'],
                'price' => $hasVariants ? null : $data['price'],
                'stock_quantity' => $data['stock_quantity'] ?? 0,
                'has_variants' => $hasVariants,
                'options' => $hasVariants ? $data['options'] : null,
                'form_fields' => $data['form_fields'] ?? null,
            ];

            if ($addon) {
                $addon->update($attributes);
            } else {
                $addon = $event->addons()->create($attributes);
            }

            if ($hasVariants) {
                $this->syncVariants($addon, $data['variants']);
            } else {
                $addon->variants()->update(['is_active' => false]);
            }

            if (! empty($data['image']) && $data['image'] instanceof UploadedFile) {
                $addon->clearMediaCollection('addon-images');
                $addon->addMedia($data['image'])->toMediaCollection('addon-images');
            }

            return $addon->fresh(['variants']);
        });
    }

    /**
     * "Ambil dari Produk Toko" (docs/plan/mvp2/8-event-product-integration.md §5.1).
     *
     * @param  array<string, mixed>  $data
     */
    public function linkFromProduct(Event $event, array $data): EventAddon
    {
        $product = Product::findOrFail($data['product_id']);

        if ($product->isDigital()) {
            throw ValidationException::withMessages([
                'product_id' => 'Produk digital tidak bisa dipakai sebagai addon event — semua produk lewat event diambil saat acara (D28).',
            ]);
        }

        $lockedVariantId = $data['product_variant_id'] ?? null;

        if ($lockedVariantId) {
            $variantBelongsToProduct = ProductVariant::where('id', $lockedVariantId)
                ->where('product_id', $product->id)
                ->exists();

            if (! $variantBelongsToProduct) {
                throw ValidationException::withMessages([
                    'product_variant_id' => 'Varian yang dipilih bukan milik produk ini.',
                ]);
            }
        }

        $hasVariants = ! $lockedVariantId && $product->has_variants;

        if ($hasVariants && empty($data['variants'])) {
            throw ValidationException::withMessages([
                'variants' => 'Harga tiap varian wajib diisi.',
            ]);
        }

        if (! $hasVariants && ! isset($data['price'])) {
            throw ValidationException::withMessages([
                'price' => 'Harga wajib diisi.',
            ]);
        }

        if ($hasVariants) {
            $this->assertLinkedVariantsMatchProduct($product, $data['variants']);
        }

        return DB::transaction(function () use ($event, $data, $product, $lockedVariantId, $hasVariants) {
            $addon = $event->addons()->create([
                'name' => $data['name'],
                'price' => $hasVariants ? null : $data['price'],
                'stock_quantity' => 0,
                'has_variants' => $hasVariants,
                'options' => $hasVariants ? $product->options : null,
                'form_fields' => null,
                'product_id' => $product->id,
                'product_variant_id' => $lockedVariantId,
                'stock_source' => 'product',
            ]);

            if ($hasVariants) {
                $this->createVariantsFromProduct($addon, $product, $data['variants']);
            }

            return $addon->fresh(['variants']);
        });
    }

    /**
     * @param  array<int, array{name: string, values: array<int, string>}>  $options
     * @param  array<int, array<string, mixed>>  $variants
     */
    private function assertVariantsMatchOptions(array $options, array $variants): void
    {
        $option1Values = $options[0]['values'] ?? [];
        $option2Values = $options[1]['values'] ?? null;

        $seenCombos = [];

        foreach ($variants as $variant) {
            if (! in_array($variant['option1_value'], $option1Values, true)) {
                throw ValidationException::withMessages([
                    'variants' => "Nilai opsi \"{$variant['option1_value']}\" tidak ada di daftar opsi pertama.",
                ]);
            }

            if ($option2Values !== null) {
                if (empty($variant['option2_value']) || ! in_array($variant['option2_value'], $option2Values, true)) {
                    throw ValidationException::withMessages([
                        'variants' => 'Setiap kombinasi wajib memiliki nilai opsi kedua yang valid.',
                    ]);
                }
            } elseif (! empty($variant['option2_value'])) {
                throw ValidationException::withMessages([
                    'variants' => 'Addon ini hanya punya satu grup opsi.',
                ]);
            }

            $comboKey = $variant['option1_value'].'|'.($variant['option2_value'] ?? '');
            if (isset($seenCombos[$comboKey])) {
                throw ValidationException::withMessages([
                    'variants' => 'Ada kombinasi varian yang duplikat.',
                ]);
            }
            $seenCombos[$comboKey] = true;
        }
    }

    /**
     * Upsert variants by (option1_value, option2_value) combination, mirroring
     * `ProductService::syncVariants`. Deliberately never writes `product_variant_id` here — a
     * linked addon's link is set once at creation (`createVariantsFromProduct`) and must survive
     * later price-only edits. Combinations missing from the payload are deactivated, not deleted —
     * may still be referenced by past RSVP snapshots/reservations.
     *
     * @param  array<int, array<string, mixed>>  $variants
     */
    private function syncVariants(EventAddon $addon, array $variants): void
    {
        $option1Name = $addon->options[0]['name'] ?? null;
        $option2Name = $addon->options[1]['name'] ?? null;

        $keptComboKeys = [];

        foreach ($variants as $variant) {
            $comboKey = $variant['option1_value'].'|'.($variant['option2_value'] ?? '');
            $keptComboKeys[] = $comboKey;

            $addon->variants()->updateOrCreate(
                [
                    'option1_value' => $variant['option1_value'],
                    'option2_value' => $variant['option2_value'] ?? null,
                ],
                [
                    'option1_name' => $option1Name,
                    'option2_name' => $option2Name,
                    'price' => $variant['price'],
                    'is_active' => true,
                ]
            );
        }

        $addon->variants()
            ->get()
            ->reject(function ($variant) use ($keptComboKeys) {
                $comboKey = $variant->option1_value.'|'.($variant->option2_value ?? '');

                return in_array($comboKey, $keptComboKeys, true);
            })
            ->each(fn ($variant) => $variant->update(['is_active' => false]));
    }

    /**
     * @param  array<int, array{product_variant_id: string, price: mixed}>  $variants
     */
    private function assertLinkedVariantsMatchProduct(Product $product, array $variants): void
    {
        $activeVariantIds = $product->variants()->where('is_active', true)->pluck('id')->sort()->values()->all();
        $submittedIds = collect($variants)->pluck('product_variant_id')->sort()->values()->all();

        if ($submittedIds !== $activeVariantIds) {
            throw ValidationException::withMessages([
                'variants' => 'Daftar varian tidak sesuai dengan varian aktif produk ini — muat ulang dan coba lagi.',
            ]);
        }
    }

    /**
     * @param  array<int, array{product_variant_id: string, price: mixed}>  $variants
     */
    private function createVariantsFromProduct(EventAddon $addon, Product $product, array $variants): void
    {
        $productVariants = $product->variants()->where('is_active', true)->get()->keyBy('id');

        foreach ($variants as $row) {
            $productVariant = $productVariants->get($row['product_variant_id']);

            if (! $productVariant) {
                continue;
            }

            $addon->variants()->create([
                'product_variant_id' => $productVariant->id,
                'option1_name' => $productVariant->option1_name,
                'option1_value' => $productVariant->option1_value,
                'option2_name' => $productVariant->option2_name,
                'option2_value' => $productVariant->option2_value,
                'price' => $row['price'],
                'is_active' => true,
            ]);
        }
    }
}
