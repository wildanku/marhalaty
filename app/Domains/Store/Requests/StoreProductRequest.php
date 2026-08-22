<?php

namespace App\Domains\Store\Requests;

use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Store $store */
        $store = $this->route('store');

        return auth('admin')->check() || $store->isManagedBy($this->user());
    }

    public function rules(): array
    {
        $store = $this->route('store');
        $product = $this->route('product');

        return self::rulesFor($store, $product, $this);
    }

    /**
     * Shared by the regular form and JSON import request so both entry points enforce the
     * identical product, option, weight, and SKU constraints.
     *
     * @return array<string, array<int, mixed>|string>
     */
    public static function rulesFor(Store $store, ?Product $product = null, ?self $request = null): array
    {
        return [
            'name' => 'required|string|max:150',
            // HTML from the rich text editor — generous cap to cover markup overhead over the
            // effective ~5000-char plain-text limit; sanitized server-side by HtmlSanitizerService.
            'description' => 'nullable|string|max:20000',
            'type' => 'required|in:physical,digital',
            'sku' => [
                'nullable', 'string', 'max:50',
                Rule::unique('products', 'sku')
                    ->where('store_id', $store->id)
                    ->ignore($product?->id),
            ],
            'status' => 'required|in:draft,active,archived',
            'has_variants' => 'required|boolean',

            'price' => 'required_if:has_variants,false|nullable|numeric|min:0',
            'stock_quantity' => 'required_if:has_variants,false|nullable|integer|min:0',
            // A product with variants stores the weight on each variant. The parent product
            // weight is only required for a physical product without variants.
            'weight_grams' => [
                'nullable',
                'integer',
                'min:1',
                'max:500000',
                Rule::requiredIf(fn (): bool => $request?->input('type') === 'physical' && ! $request->boolean('has_variants')),
            ],

            'options' => 'required_if:has_variants,true|array|max:2',
            'options.*.name' => 'required|string|max:50',
            'options.*.values' => 'required|array|min:1|max:30',
            'options.*.values.*' => 'required|string|max:50',

            'variants' => 'required_if:has_variants,true|array|min:1|max:200',
            'variants.*.option1_value' => 'required|string|max:50',
            'variants.*.option2_value' => 'nullable|string|max:50',
            'variants.*.price' => 'required|numeric|min:0',
            'variants.*.stock_quantity' => 'required|integer|min:0',
            'variants.*.weight_grams' => [
                'nullable',
                'integer',
                'min:1',
                'max:500000',
                Rule::requiredIf(fn (): bool => $request?->input('type') === 'physical' && $request->boolean('has_variants')),
            ],
            'variants.*.sku' => 'nullable|string|max:50',

            'images' => 'nullable|array|max:5',
            'images.*' => 'image|mimes:jpg,jpeg,png,webp|max:2048',
            // Not required_if here: a digital product being *edited* without re-uploading is
            // valid as long as it already has a stored file — ProductService enforces the
            // "must have a file eventually" rule using the existing media state.
            'digital_file' => 'nullable|file|mimes:pdf,epub,zip,mp3,mp4|max:51200',
        ];
    }
}
