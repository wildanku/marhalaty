<?php

namespace App\Domains\Store\Services;

use App\Domains\Shared\Services\HtmlSanitizerService;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\Store;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class ProductService
{
    public function __construct(private readonly HtmlSanitizerService $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function saveProduct(Store $store, array $data, ?Product $product = null): Product
    {
        $this->assertBusinessRules($data, $product);

        return DB::transaction(function () use ($store, $data, $product) {
            $attributes = [
                'name' => $data['name'],
                'description' => $this->htmlSanitizer->sanitize($data['description'] ?? null),
                'type' => $data['type'],
                'sku' => $data['sku'] ?? null,
                'status' => $data['status'],
                'has_variants' => (bool) $data['has_variants'],
                'price' => $data['has_variants'] ? null : $data['price'],
                'stock_quantity' => $data['has_variants'] ? null : $data['stock_quantity'],
                'weight_grams' => $data['type'] === 'physical' ? $data['weight_grams'] : null,
                'options' => $data['has_variants'] ? $data['options'] : null,
            ];

            if ($product) {
                $product->update($attributes);
            } else {
                $product = $store->products()->create($attributes);
            }

            if ($data['has_variants']) {
                $this->syncVariants($product, $data['variants']);
            } else {
                $product->variants()->update(['is_active' => false]);
            }

            if (! empty($data['images'])) {
                foreach ($data['images'] as $image) {
                    if ($image instanceof UploadedFile) {
                        $product->addMedia($image)->toMediaCollection('product-images');
                    }
                }
            }

            if (! empty($data['digital_file']) && $data['digital_file'] instanceof UploadedFile) {
                $product->addMedia($data['digital_file'])->toMediaCollection('product-digital-file');
            }

            return $product->fresh(['variants', 'media']);
        });
    }

    public function destroy(Product $product): void
    {
        if ($this->hasBeenOrdered($product)) {
            throw ValidationException::withMessages([
                'product' => 'Produk yang sudah pernah dipesan tidak bisa dihapus. Arsipkan produk ini.',
            ]);
        }

        $product->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertBusinessRules(array $data, ?Product $product): void
    {
        if ($data['has_variants']) {
            if ($data['type'] === 'digital') {
                throw ValidationException::withMessages([
                    'has_variants' => 'Produk digital tidak boleh memiliki varian.',
                ]);
            }

            $this->assertVariantsMatchOptions($data['options'], $data['variants']);
        }

        if ($data['type'] === 'digital') {
            $hasUploadedFile = ! empty($data['digital_file']) && $data['digital_file'] instanceof UploadedFile;
            $hasExistingFile = $product?->getFirstMedia('product-digital-file') !== null;

            if (! $hasUploadedFile && ! $hasExistingFile) {
                throw ValidationException::withMessages([
                    'digital_file' => 'Produk digital wajib memiliki file unduhan.',
                ]);
            }
        }

        if ($product && $product->exists && $product->type !== $data['type'] && $this->hasBeenOrdered($product)) {
            throw ValidationException::withMessages([
                'type' => 'Tipe produk tidak bisa diubah karena produk sudah pernah dipesan.',
            ]);
        }
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
                    'variants' => 'Produk ini hanya punya satu grup opsi.',
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
     * Upsert variants by (option1_value, option2_value) combination. Combinations missing from
     * the new payload are deactivated rather than deleted — they may still be referenced by past
     * orders.
     *
     * @param  array<int, array<string, mixed>>  $variants
     */
    private function syncVariants(Product $product, array $variants): void
    {
        $option1Name = $product->options[0]['name'] ?? null;
        $option2Name = $product->options[1]['name'] ?? null;

        $keptComboKeys = [];

        foreach ($variants as $variant) {
            $comboKey = $variant['option1_value'].'|'.($variant['option2_value'] ?? '');
            $keptComboKeys[] = $comboKey;

            $product->variants()->updateOrCreate(
                [
                    'option1_value' => $variant['option1_value'],
                    'option2_value' => $variant['option2_value'] ?? null,
                ],
                [
                    'sku' => $variant['sku'] ?? null,
                    'option1_name' => $option1Name,
                    'option2_name' => $option2Name,
                    'price' => $variant['price'],
                    'stock_quantity' => $variant['stock_quantity'],
                    'weight_grams' => $variant['weight_grams'] ?? null,
                    'is_active' => true,
                ]
            );
        }

        $product->variants()
            ->get()
            ->reject(function ($variant) use ($keptComboKeys) {
                $comboKey = $variant->option1_value.'|'.($variant->option2_value ?? '');

                return in_array($comboKey, $keptComboKeys, true);
            })
            ->each(fn ($variant) => $variant->update(['is_active' => false]));
    }

    private function hasBeenOrdered(Product $product): bool
    {
        return Schema::hasTable('store_order_items')
            && DB::table('store_order_items')->where('product_id', $product->id)->exists();
    }
}
