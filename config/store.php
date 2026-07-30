<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Store module business rules
    |--------------------------------------------------------------------------
    */

    'order_expiry_minutes' => (int) env('STORE_ORDER_EXPIRY_MINUTES', 1440),

    'digital_download_max' => (int) env('STORE_DIGITAL_DOWNLOAD_MAX', 5),

    'max_variant_option_groups' => 2,

];
