<?php

namespace App\Domains\Store\Data;

class CartSummary
{
    /**
     * @param  array<int, array{cart_item_id: int, type: string, message: string}>  $issues
     */
    public function __construct(
        public readonly float $subtotal,
        public readonly int $totalWeightGrams,
        public readonly bool $requiresShipping,
        public readonly array $issues,
    ) {}

    public function hasBlockingIssues(): bool
    {
        return ! empty($this->issues);
    }
}
