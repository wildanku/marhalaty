<?php

namespace App\Domains\Store\Requests;

use App\Domains\Store\Models\Store;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class StoreProductImportRequest extends FormRequest
{
    /** @var array<string, mixed>|null */
    private ?array $decodedPayload = null;

    public function authorize(): bool
    {
        /** @var Store $store */
        $store = $this->route('store');

        return auth('admin')->check() || $store->isManagedBy($this->user());
    }

    public function rules(): array
    {
        return ['payload' => ['required', 'string', 'max:2097152']];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            try {
                $decoded = json_decode((string) $this->input('payload'), true, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                $validator->errors()->add('payload', 'JSON tidak valid. Periksa kembali tanda kurung, koma, dan kutipnya.');

                return;
            }

            if (! is_array($decoded)) {
                $validator->errors()->add('payload', 'JSON harus berupa objek dengan properti "products".');

                return;
            }

            $this->decodedPayload = $decoded;
            /** @var Store $store */
            $store = $this->route('store');
            $productRules = StoreProductRequest::rulesFor($store);
            $nestedRules = ['products' => ['required', 'array', 'min:1', 'max:200']];

            foreach ($productRules as $field => $rules) {
                if (in_array($field, ['images', 'images.*', 'digital_file'], true)) {
                    continue;
                }

                $nestedRules['products.*.'.$field] = $rules;
            }

            // A JSON import cannot safely carry a protected download file, so this endpoint
            // intentionally supports physical products only and refuses all upload fields.
            $nestedRules['products.*.type'] = ['required', Rule::in(['physical'])];
            $nestedRules['products.*.images'] = ['prohibited'];
            $nestedRules['products.*.digital_file'] = ['prohibited'];

            $nested = Validator::make($decoded, $nestedRules);

            foreach ($nested->errors()->messages() as $field => $messages) {
                foreach ($messages as $message) {
                    $validator->errors()->add($field, $message);
                }
            }

            foreach ($decoded['products'] ?? [] as $index => $product) {
                if (! is_array($product)) {
                    continue;
                }

                $hasVariants = filter_var($product['has_variants'] ?? false, FILTER_VALIDATE_BOOLEAN);
                if (! $hasVariants) {
                    foreach (['price', 'stock_quantity', 'weight_grams'] as $field) {
                        if (! array_key_exists($field, $product) || $product[$field] === '' || $product[$field] === null) {
                            $validator->errors()->add("products.{$index}.{$field}", 'Field ini wajib diisi untuk produk tanpa varian.');
                        }
                    }

                    continue;
                }

                if (empty($product['options']) || ! is_array($product['options'])) {
                    $validator->errors()->add("products.{$index}.options", 'Produk bervarian wajib memiliki minimal satu grup opsi.');
                }
                if (empty($product['variants']) || ! is_array($product['variants'])) {
                    $validator->errors()->add("products.{$index}.variants", 'Produk bervarian wajib memiliki minimal satu varian.');
                    continue;
                }

                foreach ($product['variants'] as $variantIndex => $variant) {
                    if (! is_array($variant) || ! array_key_exists('weight_grams', $variant) || $variant['weight_grams'] === '' || $variant['weight_grams'] === null) {
                        $validator->errors()->add("products.{$index}.variants.{$variantIndex}.weight_grams", 'Berat wajib diisi untuk setiap varian produk fisik.');
                    }
                }
            }

            $skus = collect($decoded['products'] ?? [])
                ->pluck('sku')
                ->filter(fn ($sku): bool => is_string($sku) && $sku !== '')
                ->map(fn (string $sku): string => mb_strtolower($sku));

            if ($skus->count() !== $skus->unique()->count()) {
                $validator->errors()->add('products', 'SKU produk tidak boleh duplikat dalam satu impor.');
            }
        });
    }

    /** @return array<int, array<string, mixed>> */
    public function products(): array
    {
        return $this->decodedPayload['products'] ?? [];
    }
}
