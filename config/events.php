<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Event module business rules
    |--------------------------------------------------------------------------
    */

    // How long an unpaid RSVP stays `pending` before `events:expire-unpaid-rsvps` expires it and
    // releases any product reservations it holds. Same default as store.order_expiry_minutes.
    'rsvp_expiry_minutes' => (int) env('EVENT_RSVP_EXPIRY_MINUTES', 1440),

];
