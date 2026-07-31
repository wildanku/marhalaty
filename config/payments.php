<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Payment driver registry (Fase 7 — pengaturan pembayaran global)
    |--------------------------------------------------------------------------
    |
    | Code, not data: this declares what each driver's code is CAPABLE of. Whether it's actually
    | switched on for a given context is an admin decision stored in `payment_gateways` (see
    | App\Domains\Shared\Services\PaymentSettingsService). `contexts` here is a ceiling, not a
    | default — a driver can never be enabled for a context outside this list, no matter what an
    | admin picks in god-mode.
    |
    */

    'drivers' => [
        'satutera' => [
            'label' => 'Satutera',
            // 'event' added in fase 9 (docs/plan/mvp2/9-event-payment-satutera.md) once
            // RsvpController could actually initiate/receive Satutera payments — this is a ceiling
            // on what the code supports, not a default; whether it's actually switched on for
            // event registration is the `payment_gateways.contexts` admin decision.
            'contexts' => ['store', 'event'],
            'credential_fields' => ['client_id', 'client_secret', 'api_key', 'webhook_secret'],
            'requires_channel' => true,
        ],
        'ipaymu' => [
            'label' => 'iPaymu',
            'contexts' => ['event'],
            'credential_fields' => ['va', 'api_key'],
            'requires_channel' => true,
        ],
        'manual' => [
            'label' => 'Transfer Manual',
            'contexts' => ['store', 'event'],
            'credential_fields' => [],
            'requires_channel' => false,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Hidden in god-mode admin UI
    |--------------------------------------------------------------------------
    |
    | Temporary scope decision, not a removal: current focus is Satutera + manual transfer only
    | (fase 9 — event payments via Satutera is in progress). The driver, its DB row, and its
    | credentials are untouched — this only removes the card from
    | /god-mode/settings/payments so it isn't a visible surface to fiddle with meanwhile. Remove a
    | code from this list to bring its settings card back.
    |
    */

    'hidden_in_admin' => ['ipaymu'],

    /*
    |--------------------------------------------------------------------------
    | QRIS-only minimum (fase 9, D38)
    |--------------------------------------------------------------------------
    |
    | Below this amount (subtotal + shipping/registration total, excluding the payment channel
    | fee), only QRIS is offered — VA/retail channels enforce their own higher provider-side
    | minimums. This is a property of the Satutera *channel*, not of the store checkout flow, so
    | it lives here rather than in config/store.php now that event registration uses it too.
    |
    | `config/store.php`'s own `qris_only_below_amount` reads the exact same env var and is kept
    | as-is on purpose (deliberately NOT forwarded via a cross-file `config()` call at array-build
    | time — that depends on config-file load order, which Laravel does not guarantee is stable
    | across environments or `config:cache` runs). Existing store-checkout callers
    | (`CheckoutService`, `Pages/Store/Checkout.tsx`) are untouched by this fase and keep reading
    | `config('store.qris_only_below_amount')`.
    |
    */

    'qris_only_below_amount' => (int) env('STORE_QRIS_ONLY_BELOW_AMOUNT', 10000),

];
