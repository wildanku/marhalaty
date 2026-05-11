<?php

namespace App\Domains\Event\Observers;

use App\Domains\Event\Models\Rsvp;

/**
 * Observes RSVP model state changes.
 *
 * Handles quota booking when RSVP payment status changes:
 * - Increment package booked_count when RSVP → 'paid'
 * - Decrement package booked_count when RSVP → not 'paid'
 */
class RsvpObserver
{
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
    }

    /**
     * Handle the RSVP "deleted" event – if it was paid, decrement booked count.
     */
    public function deleted(Rsvp $rsvp): void
    {
        if ($rsvp->status === 'paid' && $rsvp->event_package_id) {
            $rsvp->package?->decrementBooked();
        }
    }
}
