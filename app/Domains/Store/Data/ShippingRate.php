<?php

namespace App\Domains\Store\Data;

class ShippingRate
{
    public function __construct(
        public readonly string $courierCode,
        public readonly string $courierName,
        public readonly string $service,
        public readonly ?string $description,
        public readonly int $cost,
        public readonly ?string $etd,
    ) {}

    /**
     * @return array{courier_code: string, courier_name: string, service: string, description: string|null, cost: int, etd: string|null}
     */
    public function toArray(): array
    {
        return [
            'courier_code' => $this->courierCode,
            'courier_name' => $this->courierName,
            'service' => $this->service,
            'description' => $this->description,
            'cost' => $this->cost,
            'etd' => $this->etd,
        ];
    }

    public function matches(string $courierCode, string $service): bool
    {
        return $this->courierCode === $courierCode && $this->service === $service;
    }
}
