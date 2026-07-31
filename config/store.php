<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Store module business rules
    |--------------------------------------------------------------------------
    */

    'order_expiry_minutes' => (int) env('STORE_ORDER_EXPIRY_MINUTES', 1440),

    'digital_download_max' => (int) env('STORE_DIGITAL_DOWNLOAD_MAX', 5),

    // Below this amount (subtotal + shipping, excluding the payment channel fee), only QRIS is
    // offered — VA/retail channels enforce their own higher provider-side minimums. Kept here for
    // existing store-checkout callers; the canonical home for this rule is now
    // config('payments.qris_only_below_amount') (fase 9, D38) — same env var, same value.
    'qris_only_below_amount' => (int) env('STORE_QRIS_ONLY_BELOW_AMOUNT', 10000),

    'max_variant_option_groups' => 2,

    // Allowlists for store badges (Fase 6) — kept small and explicit so a typo never produces a
    // blank icon or a color class Tailwind never generated at build time.
    'badge_icons' => ['verified', 'trophy', 'shield_person', 'workspace_premium', 'local_fire_department', 'star'],

    'badge_colors' => ['primary', 'secondary', 'tertiary', 'error', 'neutral'],

    // Fase 10 (docs/plan/mvp2/10-storefront-frontside-ux.md, D43) — homepage "Produk Pilihan"
    // section slot limit, kept intentionally small so the section stays curated.
    'max_homepage_highlights' => (int) env('STORE_MAX_HOMEPAGE_HIGHLIGHTS', 8),

];
