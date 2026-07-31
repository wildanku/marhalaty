<?php

namespace App\Domains\Event\Observers;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Store\Services\ProductStockService;

/**
 * Observes RSVP model state changes.
 *
 * Handles quota booking when RSVP payment status changes:
 * - Increment package booked_count when RSVP → 'paid'
 * - Decrement package booked_count when RSVP → not 'paid'
 *
 * Also releases any product reservations (docs/plan/mvp2/8-event-product-integration.md) when an
 * RSVP stops being payable — `paid` never touches reservations (merchandise stays reserved until
 * physically handed over at the event, D25).
 */
class RsvpObserver
{
    public function __construct(private ProductStockService $productStock) {}

    /**
     * Handle the RSVP "updating" event – before save, check for status change.
     */
    public function updating(Rsvp $rsvp): void
    {
        $oldStatus = $rsvp->getOriginal('status');
        $newStatus = $rsvp->getAttribute('status');

        // Status changed from something other than 'paid' → 'paid'
        if ($oldStatus !== 'paid' && $newStatus === 'paid' && $rsvp->event_package_id) {
            $rsvp->package?->incrementBooked();
        }

        // Status changed from 'paid' → something else
        if ($oldStatus === 'paid' && $newStatus !== 'paid' && $rsvp->event_package_id) {
            $rsvp->package?->decrementBooked();
        }

        if ($oldStatus !== $newStatus && in_array($newStatus, ['expired', 'failed'], true)) {
            $this->productStock->releaseFor($rsvp);
        }
    }

    /**
     * Handle the RSVP "deleted" event – if it was paid, decrement booked count.
     */
    public function deleted(Rsvp $rsvp): void
    {
        if ($rsvp->status === 'paid' && $rsvp->event_package_id) {
            $rsvp->package?->decrementBooked();
        }

        $this->productStock->releaseFor($rsvp);
    }
}
