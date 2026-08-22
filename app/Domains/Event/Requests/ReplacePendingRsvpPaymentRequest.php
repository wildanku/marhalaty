<?php

namespace App\Domains\Event\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReplacePendingRsvpPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'payment_provider' => ['required', Rule::in(['manual', 'satutera'])],
            'channel_provider' => ['required_if:payment_provider,satutera', 'nullable', 'string', 'max:30'],
            'payment_method' => ['required_if:payment_provider,satutera', 'nullable', 'string', 'max:20'],
            'payment_channel' => ['required_if:payment_provider,satutera', 'nullable', 'string', 'max:30'],
        ];
    }
}
