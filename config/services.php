<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'ipaymu' => [
        'va' => env('IPAYMU_VA', ''),
        'api_key' => env('IPAYMU_API_KEY', ''),
        'sandbox' => env('IPAYMU_SANDBOX', true),
    ],

    'manual_payment' => [
        'bank_name' => env('MANUAL_PAYMENT_BANK_NAME', 'BCA'),
        'account_number' => env('MANUAL_PAYMENT_ACCOUNT_NUMBER', ''),
        'account_holder' => env('MANUAL_PAYMENT_ACCOUNT_HOLDER', ''),
    ],

    'brevo' => [
        'api_key' => env('BREVO_API_KEY'),
    ],

    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN', ''),
        'notify_chat_id' => env('TELEGRAM_NOTIFY_CHAT_ID', ''),
    ],

    'satutera' => [
        'base_url' => env('SATUTERA_BASE_URL', 'https://payment.satutera.com'),
        'client_id' => env('SATUTERA_CLIENT_ID', ''),
        'client_secret' => env('SATUTERA_CLIENT_SECRET', ''),
        'api_key' => env('SATUTERA_API_KEY', ''),
        'webhook_secret' => env('SATUTERA_WEBHOOK_SECRET', ''),
    ],

    'rajaongkir' => [
        'base_url' => env('RAJAONGKIR_BASE_URL', 'https://rajaongkir.komerce.id/api/v1'),
        'api_key' => env('RAJAONGKIR_API_KEY', ''),
        'couriers' => env('RAJAONGKIR_COURIERS', 'jne:sicepat:jnt:pos:tiki'),
        'courier_separator' => env('RAJAONGKIR_COURIER_SEPARATOR', ':'),
        // Aligned to the provider's 100-requests-per-24h quota: an identical query is served from
        // the (database-backed) cache at most once per window instead of re-spending quota.
        'cache_ttl' => (int) env('RAJAONGKIR_CACHE_TTL', 86400),
        // Longer-lived backup copy served only when a fresh API call fails, so a fully-spent
        // quota degrades to "possibly stale rates" instead of a hard checkout failure.
        'stale_ttl' => (int) env('RAJAONGKIR_STALE_TTL', 604800),
    ],

    'shipping' => [
        'default' => env('SHIPPING_PROVIDER_DEFAULT', 'rajaongkir'),
    ],

];
