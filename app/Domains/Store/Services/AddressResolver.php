<?php

namespace App\Domains\Store\Services;

use App\Contracts\ShippingProviderInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * Resolves a local address (village_id + postal_code) to a shipping provider's destination id.
 * Works against `StoreAddress` and `UserAddress` alike — both share the same
 * village_id/postal_code/rajaongkir_destination_id/destination_resolved_at shape.
 */
class AddressResolver
{
    public function __construct(private ShippingProviderInterface $shipping) {}

    /**
     * @return array{resolved: bool, destination_id: string|null, candidates: array}
     */
    public function resolve(Model $address): array
    {
        if ($address->rajaongkir_destination_id) {
            return ['resolved' => true, 'destination_id' => (string) $address->rajaongkir_destination_id, 'candidates' => []];
        }

        $address->loadMissing('village.district');
        $village = $address->village;

        $destinationId = $this->shipping->resolveDestinationId(
            $address->postal_code,
            $village?->name,
            $village?->district?->name,
        );

        if ($destinationId !== null) {
            $this->confirmDestination($address, $destinationId);

            return ['resolved' => true, 'destination_id' => $destinationId, 'candidates' => []];
        }

        return [
            'resolved' => false,
            'destination_id' => null,
            'candidates' => $this->shipping->searchDestination($address->postal_code, 20),
        ];
    }

    /**
     * Persist the destination the user explicitly picked among ambiguous candidates.
     */
    public function confirmDestination(Model $address, string $destinationId): void
    {
        $address->forceFill([
            'rajaongkir_destination_id' => (int) $destinationId,
            'destination_resolved_at' => now(),
        ])->save();
    }
}
