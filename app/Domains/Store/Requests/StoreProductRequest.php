<?php

namespace App\Domains\Store\Requests;

use App\Domains\Store\Models\Store;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Store $store */
        $store = $this->route('store');

        return $store->isManagedBy($this->user());
    }

    public function rules(): array
    {
        $store = $this->route('store');
        $product = $this->route('product');

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
            'weight_grams' => 'required_if:type,physical|nullable|integer|min:1|max:500000',

            'options' => 'required_if:has_variants,true|array|max:2',
            'options.*.name' => 'required|string|max:50',
            'options.*.values' => 'required|array|min:1|max:30',
            'options.*.values.*' => 'required|string|max:50',

            'variants' => 'required_if:has_variants,true|array|min:1|max:200',
            'variants.*.option1_value' => 'required|string|max:50',
            'variants.*.option2_value' => 'nullable|string|max:50',
            'variants.*.price' => 'required|numeric|min:0',
            'variants.*.stock_quantity' => 'required|integer|min:0',
            'variants.*.weight_grams' => 'nullable|integer|min:1|max:500000',
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
