<?php

namespace App\Domains\Store\Requests;

use App\Domains\Store\Models\Store;
use Illuminate\Foundation\Http\FormRequest;

class StoreShippingMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Store $store */
        $store = $this->route('store');

        return auth('admin')->check() || $store->isManagedBy($this->user());
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'type' => 'required|in:pickup,flat',
            'fee' => 'required|numeric|min:0|max:99999999',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ];
    }
}
