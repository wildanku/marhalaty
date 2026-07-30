<?php

namespace App\Domains\Shared\Services;

use App\Contracts\ShippingProviderInterface;
use App\Domains\Shared\Models\ShippingDestination;
use App\Domains\Store\Data\ShippingRate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * RajaOngkir (Komerce V2) shipping cost provider.
 *
 * Docs: docs/plan/mvp2/3-cart-checkout-shipping.md §2.
 */
class RajaOngkirService implements ShippingProviderInterface
{
    private string $baseUrl;

    private string $apiKey;

    private string $courierSeparator;

    private int $cacheTtl;

    private int $staleTtl;

    public function __construct()
    {
        $this->baseUrl = config('services.rajaongkir.base_url');
        $this->apiKey = config('services.rajaongkir.api_key', '');
        $this->courierSeparator = config('services.rajaongkir.courier_separator', ':');
        $this->cacheTtl = (int) config('services.rajaongkir.cache_ttl', 86400);
        $this->staleTtl = (int) config('services.rajaongkir.stale_ttl', 604800);
    }

    public function providerCode(): string
    {
        return 'rajaongkir';
    }

    public function searchDestination(string $query, int $limit = 10): array
    {
        $cacheKey = "ship:{$this->providerCode()}:search:".md5(strtolower(trim($query))).":{$limit}";

        return $this->rememberWithFallback($cacheKey, function () use ($query, $limit) {
            $response = Http::withHeaders(['key' => $this->apiKey])
                ->timeout(10)
                ->retry(2, 200)
                ->get("{$this->baseUrl}/destination/domestic-destination", [
                    'search' => $query,
                    'limit' => $limit,
                ]);

            if (! $response->successful()) {
                Log::warning('RajaOngkir searchDestination failed', [
                    'query' => $query,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [];
            }

            $rows = $response->json('data', []);

            return collect($rows)->map(fn (array $row) => [
                'id' => (string) $row['id'],
                'label' => trim(implode(', ', array_filter([
                    $row['subdistrict_name'] ?? null,
                    $row['district_name'] ?? null,
                    $row['city_name'] ?? null,
                    $row['province_name'] ?? null,
                    $row['zip_code'] ?? null,
                ]))),
                'zip_code' => $row['zip_code'] ?? null,
                'subdistrict_name' => $row['subdistrict_name'] ?? null,
                'district_name' => $row['district_name'] ?? null,
                'city_name' => $row['city_name'] ?? null,
                'province_name' => $row['province_name'] ?? null,
            ])->all();
        }, ['query' => $query]);
    }

    /**
     * Resolve a local address to a RajaOngkir destination_id, caching the result. Returns null
     * (never a guess) when the postal code maps to more than one plausible kecamatan/kelurahan —
     * callers must surface the candidates to the user instead.
     */
    public function resolveDestinationId(
        string $postalCode,
        ?string $villageName = null,
        ?string $districtName = null,
    ): ?string {
        $cached = ShippingDestination::where('provider', $this->providerCode())
            ->where('zip_code', $postalCode)
            ->when($villageName, fn ($q) => $q->where('subdistrict_name', 'ilike', $villageName))
            ->first();

        if ($cached) {
            return $cached->destination_id;
        }

        $candidates = $this->searchDestination($postalCode, 20);

        if (empty($candidates)) {
            return null;
        }

        if (count($candidates) === 1) {
            return $this->cacheDestination($candidates[0]);
        }

        if ($villageName === null && $districtName === null) {
            return null;
        }

        $targetVillageVariants = $this->areaNameVariants($villageName);
        $targetDistrictVariants = $this->areaNameVariants($districtName);

        $scored = collect($candidates)->map(function (array $candidate) use ($targetVillageVariants, $targetDistrictVariants) {
            $villageTier = $this->areaMatchTier($targetVillageVariants, $this->areaNameVariants($candidate['subdistrict_name']));
            $districtTier = $this->areaMatchTier($targetDistrictVariants, $this->areaNameVariants($candidate['district_name']));

            // Village weighted far above district (×10) so an exact village match always outranks
            // every other candidate regardless of district tier — district alone (max tier 2) can
            // never close a 10-point village gap. This matters because RajaOngkir's district name
            // is often identical across every candidate for a given postal code (e.g. multiple
            // kelurahan all under "Denpasar Barat"), so district alone can't disambiguate them.
            $score = ($villageTier * 10) + $districtTier;

            return ['candidate' => $candidate, 'score' => $score];
        })->sortByDesc('score')->values();

        $best = $scored->first();
        $secondBest = $scored->get(1);

        // Only auto-resolve when there's a clear, unambiguous winner.
        if ($best && $best['score'] > 0 && (! $secondBest || $secondBest['score'] < $best['score'])) {
            return $this->cacheDestination($best['candidate']);
        }

        return null;
    }

    /**
     * Normalizes an area name for comparison and splits it into alternate-spelling variants.
     * Strips "kel./kec./desa" prefixes and every character that isn't a letter, digit, or `/` —
     * the `/` is kept as a separator since RajaOngkir sometimes records dual spellings for the
     * same kelurahan (e.g. "PADANGSAMBIAN KLOD/KELOD"), and stripping spaces/punctuation avoids
     * false mismatches between data sources with different formatting for the same name (e.g.
     * local "Padang Sambian Kaja" vs RajaOngkir "PADANGSAMBIAN KAJA").
     *
     * @return array<int, string>
     */
    private function areaNameVariants(?string $name): array
    {
        if ($name === null) {
            return [];
        }

        $name = strtolower($name);
        $name = preg_replace('/\b(kel\.?|kec\.?|desa)\b/i', '', $name);
        $name = preg_replace('/[^a-z0-9\/]/', '', $name);

        return $name === '' ? [] : explode('/', $name);
    }

    /**
     * 2 = exact match on at least one variant, 1 = one variant contains (or is contained by)
     * another, 0 = no relation. Exact match must win over every partial match — see the ×10
     * weighting where this is used.
     *
     * @param  array<int, string>  $targetVariants
     * @param  array<int, string>  $candidateVariants
     */
    private function areaMatchTier(array $targetVariants, array $candidateVariants): int
    {
        if (empty($targetVariants) || empty($candidateVariants)) {
            return 0;
        }

        if (array_intersect($targetVariants, $candidateVariants) !== []) {
            return 2;
        }

        foreach ($targetVariants as $target) {
            foreach ($candidateVariants as $candidate) {
                if (str_contains($candidate, $target) || str_contains($target, $candidate)) {
                    return 1;
                }
            }
        }

        return 0;
    }

    private function cacheDestination(array $candidate): string
    {
        $destination = ShippingDestination::updateOrCreate(
            ['provider' => $this->providerCode(), 'destination_id' => $candidate['id']],
            [
                'label' => $candidate['label'],
                'subdistrict_name' => $candidate['subdistrict_name'],
                'district_name' => $candidate['district_name'],
                'city_name' => $candidate['city_name'],
                'province_name' => $candidate['province_name'],
                'zip_code' => $candidate['zip_code'],
                'synced_at' => now(),
            ]
        );

        return $destination->destination_id;
    }

    public function calculateCost(
        string $originId,
        string $destinationId,
        int $weightGrams,
        array $couriers = [],
    ): array {
        $couriers = ! empty($couriers) ? $couriers : explode(':', config('services.rajaongkir.couriers', 'jne'));
        $cacheKey = "ship:{$this->providerCode()}:cost:{$originId}:{$destinationId}:{$weightGrams}:".implode(',', $couriers);

        // rememberWithFallback caches plain arrays, never ShippingRate objects: Laravel's cache
        // config has `serializable_classes => false` (a default hardening against gadget-chain
        // attacks), which silently turns any cached object back into a useless
        // __PHP_Incomplete_Class on retrieval instead of throwing — objects are rebuilt fresh
        // from the cached rows below on every call instead.
        $rows = $this->rememberWithFallback($cacheKey, function () use ($originId, $destinationId, $weightGrams, $couriers) {
            $response = Http::withHeaders(['key' => $this->apiKey])
                ->asForm()
                ->timeout(10)
                ->retry(2, 200)
                ->post("{$this->baseUrl}/calculate/domestic-cost", [
                    'origin' => $originId,
                    'destination' => $destinationId,
                    'weight' => max($weightGrams, 1000),
                    'courier' => implode($this->courierSeparator, $couriers),
                    'price' => 'lowest',
                ]);

            if (! $response->successful()) {
                Log::error('RajaOngkir calculateCost failed', [
                    'origin' => $originId,
                    'destination' => $destinationId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [];
            }

            $rows = $response->json('data', []);

            return collect($rows)->map(fn (array $row) => [
                'courier_code' => (string) ($row['code'] ?? ''),
                'courier_name' => (string) ($row['name'] ?? ''),
                'service' => (string) ($row['service'] ?? ''),
                'description' => $row['description'] ?? null,
                'cost' => (int) ($row['cost'] ?? 0),
                'etd' => $row['etd'] ?? null,
            ])->all();
        }, ['origin' => $originId, 'destination' => $destinationId]);

        return array_map(fn (array $row) => new ShippingRate(
            courierCode: $row['courier_code'],
            courierName: $row['courier_name'],
            service: $row['service'],
            description: $row['description'],
            cost: $row['cost'],
            etd: $row['etd'],
        ), $rows);
    }

    /**
     * Shared caching strategy for every RajaOngkir lookup, since the account is capped at 100
     * requests/24h: serve the fresh cache entry when present; otherwise call the API. A
     * successful, non-empty result refreshes both the fresh (cache_ttl) and stale (stale_ttl)
     * copies. Only successful lookups are ever cached — a transient failure must not be
     * remembered as "no results" for the full TTL. If the live call fails (exception, non-2xx, or
     * empty body — including a spent quota returning 429) and a stale backup copy still exists,
     * that is served instead of failing the request outright.
     *
     * @param  array<string, mixed>  $logContext
     */
    private function rememberWithFallback(string $cacheKey, \Closure $fetch, array $logContext = []): array
    {
        $fresh = Cache::get($cacheKey);
        if ($fresh !== null) {
            return $fresh;
        }

        try {
            $result = $fetch();
        } catch (\Throwable $e) {
            Log::error('RajaOngkir request exception', [...$logContext, 'error' => $e->getMessage()]);
            $result = [];
        }

        if (! empty($result)) {
            Cache::put($cacheKey, $result, $this->cacheTtl);
            Cache::put("{$cacheKey}:stale", $result, $this->staleTtl);

            return $result;
        }

        $stale = Cache::get("{$cacheKey}:stale");
        if ($stale !== null) {
            Log::warning('RajaOngkir serving stale cache after fetch failure', $logContext);

            return $stale;
        }

        return [];
    }
}
