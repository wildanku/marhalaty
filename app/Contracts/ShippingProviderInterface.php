<?php

namespace App\Contracts;

use App\Domains\Store\Data\ShippingRate;

interface ShippingProviderInterface
{
    /**
     * @return array<int, array{id: string, label: string, zip_code: string|null, subdistrict_name: string|null, district_name: string|null, city_name: string|null, province_name: string|null}>
     */
    public function searchDestination(string $query, int $limit = 10): array;

    /**
     * Resolve a local address (village + postal code) to this provider's destination id.
     * Returns null when the match is ambiguous or not found — caller must not guess.
     */
    public function resolveDestinationId(
        string $postalCode,
        ?string $villageName = null,
        ?string $districtName = null,
    ): ?string;

    /**
     * @param  array<int, string>  $couriers
     * @return array<int, ShippingRate>
     */
    public function calculateCost(
        string $originId,
        string $destinationId,
        int $weightGrams,
        array $couriers = [],
    ): array;

    public function providerCode(): string;
}
