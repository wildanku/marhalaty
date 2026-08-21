<?php

namespace App\Domains\Page\Data;

final readonly class PageRouteAvailability
{
    public function __construct(
        public bool $available,
        public ?string $message = null,
    ) {}
}
