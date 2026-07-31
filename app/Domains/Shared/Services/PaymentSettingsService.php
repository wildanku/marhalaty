<?php

namespace App\Domains\Shared\Services;

use App\Models\PaymentGateway;
use App\Models\PaymentManualAccount;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Single source of truth for "which payment gateway is switched on where" and "which rekening do
 * we show for transfer manual" — Fase 7 (docs/plan/mvp2/7-payment-settings.md).
 *
 * Credential resolution order (plan §2 D20): DB (`payment_gateways.credentials`) wins when set; an
 * empty value falls back to `.env` via `config('services.*')`, so an existing deployment keeps
 * working unchanged the moment this ships — nobody has to touch god-mode first.
 */
class PaymentSettingsService
{
    private const CACHE_VERSION = 'v1';

    /** Maps a driver code to the config('services.*') prefix used as its .env fallback. */
    private const ENV_FALLBACK_PREFIX = [
        'satutera' => 'services.satutera',
        'ipaymu' => 'services.ipaymu',
    ];

    /**
     * Public descriptors for a context — safe to expose to the frontend, never includes
     * credentials.
     *
     * @return array<int, array{code:string,label:string,description:?string,requires_channel:bool}>
     */
    public function gatewaysFor(string $context): array
    {
        return collect($this->gatewayRows())
            ->filter(fn (array $g) => $g['is_enabled']
                // Admin turned it on for this context...
                && in_array($context, $g['contexts'], true)
                // ...and the driver's code actually supports it (a stale DB row can't grant a
                // context the code was never built for).
                && in_array($context, config("payments.drivers.{$g['code']}.contexts", []), true))
            ->sortBy('sort_order')
            ->map(fn (array $g) => [
                'code' => $g['code'],
                'label' => $g['label'],
                'description' => $g['description'],
                'requires_channel' => (bool) config("payments.drivers.{$g['code']}.requires_channel", false),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    public function enabledCodesFor(string $context): array
    {
        return collect($this->gatewaysFor($context))->pluck('code')->all();
    }

    public function isEnabled(string $code, string $context): bool
    {
        return in_array($code, $this->enabledCodesFor($context), true);
    }

    /**
     * @return array<string, string>
     */
    public function credentials(string $code): array
    {
        $fields = config("payments.drivers.{$code}.credential_fields", []);
        $stored = $this->storedCredentials($code);
        $envPrefix = self::ENV_FALLBACK_PREFIX[$code] ?? null;

        $result = [];
        foreach ($fields as $field) {
            $value = $stored[$field] ?? null;
            if ($value === null || $value === '') {
                $value = $envPrefix ? config("{$envPrefix}.{$field}", '') : '';
            }
            $result[$field] = (string) $value;
        }

        return $result;
    }

    /**
     * @return array<int, array{id:int,bank_name:string,account_number:string,account_holder:string,branch:?string,instructions:?string}>
     */
    public function manualAccounts(): array
    {
        return Cache::remember($this->cacheKey('manual_accounts'), now()->addMinutes(15), function () {
            return PaymentManualAccount::active()
                ->orderBy('sort_order')
                ->get(['id', 'bank_name', 'account_number', 'account_holder', 'branch', 'instructions'])
                ->toArray();
        });
    }

    /**
     * Call after any admin write (gateway toggle/credentials, manual account CRUD) — reads must
     * see the change on the very next request, not after a TTL.
     */
    public function flush(): void
    {
        Cache::forget($this->cacheKey('gateways'));
        Cache::forget($this->cacheKey('manual_accounts'));
    }

    /**
     * Plain-array projection, deliberately excluding `credentials` — caching raw Eloquent models
     * through the `database` cache store does not round-trip cleanly in this environment (a bare
     * model collection comes back as `__PHP_Incomplete_Class` on the next request), and secrets
     * have no business sitting in the cache table anyway.
     *
     * @return array<int, array{code:string,label:string,description:?string,is_enabled:bool,contexts:array<int,string>,sort_order:int}>
     */
    private function gatewayRows(): array
    {
        return Cache::remember($this->cacheKey('gateways'), now()->addMinutes(15), function () {
            return PaymentGateway::all()->map(fn (PaymentGateway $g) => [
                'code' => $g->code,
                'label' => $g->label,
                'description' => $g->description,
                'is_enabled' => $g->is_enabled,
                'contexts' => $g->contexts ?? [],
                'sort_order' => $g->sort_order,
            ])->all();
        });
    }

    /**
     * Bypasses the cache entirely and reads straight from the database — this is the only place
     * a gateway's decrypted `credentials` ever exist, and it's called rarely enough (payment
     * channel lookups, payment creation) that caching it isn't worth the security trade-off.
     *
     * @return array<string, mixed>
     */
    private function storedCredentials(string $code): array
    {
        $gateway = PaymentGateway::where('code', $code)->first();

        if (! $gateway) {
            return [];
        }

        try {
            return $gateway->credentials ?? [];
        } catch (DecryptException $e) {
            // Happens when APP_KEY was rotated after credentials were saved. Fail open to the
            // .env fallback rather than 500ing every checkout — an admin needs to re-enter
            // credentials in god-mode, but that's a config error, not a reason to take payments down.
            Log::error('PaymentGateway credentials failed to decrypt — APP_KEY likely rotated', ['code' => $code]);

            return [];
        }
    }

    private function cacheKey(string $suffix): string
    {
        return 'payments:settings:'.self::CACHE_VERSION.':'.$suffix;
    }
}
