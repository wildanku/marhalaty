<?php

return [
    'scope' => env('COMMUNITY_SCOPE', 'global'),
    'target_marhalah' => [
        'year' => (int) env('TARGET_MARHALAH_YEAR', 2013),
        'name' => env('TARGET_MARHALAH_NAME', 'Dynamic Generation'),
    ],
];
