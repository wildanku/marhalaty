<?php

namespace App\Domains\Page\Rules;

use App\Domains\Page\Services\PageRouteAvailabilityService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class AvailablePageSlug implements ValidationRule
{
    public function __construct(private readonly ?int $ignorePageId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $result = app(PageRouteAvailabilityService::class)->check($value, $this->ignorePageId);

        if (! $result->available) {
            $fail($result->message ?? 'URL tidak tersedia.');
        }
    }
}
