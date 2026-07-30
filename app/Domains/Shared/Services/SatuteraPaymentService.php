<?php

namespace App\Domains\Shared\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Satutera Payment Service client.
 *
 * Standalone service — deliberately does not implement `App\Contracts\PaymentProviderInterface`,
 * which is shaped around `Rsvp`/`Transaction` for the existing event payment flow. See
 * docs/plan/mvp2/4-payment-satutera.md §1.
 */
class SatuteraPaymentService
{
    private string $baseUrl;

    private string $clientId;

    private string $clientSecret;

    private string $apiKey;

    private string $webhookSecret;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.satutera.base_url'), '/');
        $this->clientId = config('services.satutera.client_id', '');
        $this->clientSecret = config('services.satutera.client_secret', '');
        $this->apiKey = config('services.satutera.api_key', '');
        $this->webhookSecret = config('services.satutera.webhook_secret', '');
    }

    /**
     * GET /api/v1/payment-channels — public, no auth. Cached 15 minutes. Only channels that
     * support `response_mode: raw_detail` are returned, since MVP2 shows VA/QRIS on our own page
     * rather than redirecting to a Satutera-hosted checkout.
     *
     * @return array<int, array{provider:string, method:string, code:string, name:string, fee:int, image:?string, metadata:array}>
     */
    public function getPaymentChannels(?string $method = null, ?string $provider = null): array
    {
        $cacheKey = 'satutera:payment-channels:'.($method ?? 'all').':'.($provider ?? 'all');

        return Cache::remember($cacheKey, now()->addMinutes(15), function () use ($method, $provider) {
            try {
                $response = Http::timeout(10)
                    ->retry(2, 200)
                    ->get("{$this->baseUrl}/api/v1/payment-channels", array_filter([
                        'method' => $method,
                        'provider' => $provider,
                        'limit' => 100,
                    ]));

                if (! $response->successful()) {
                    Log::error('Satutera getPaymentChannels failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);

                    return [];
                }
                
                return collect($response->json('data', []))
                    ->filter(fn (array $channel) => $channel['supports_direct_detail'] ?? false)
                    ->values()
                    ->all();
            } catch (\Throwable $e) {
                Log::error('Satutera getPaymentChannels exception', ['error' => $e->getMessage()]);

                return [];
            }
        });
    }

    /**
     * A channel's identity is the (provider, method, code) triple, not `code` alone (guidance §2).
     */
    public function findChannel(string $provider, string $method, string $code): ?array
    {
        foreach ($this->getPaymentChannels($method, $provider) as $channel) {
            if (($channel['provider'] ?? null) === $provider
                && ($channel['method'] ?? null) === $method
                && ($channel['code'] ?? null) === $code) {
                return $channel;
            }
        }

        return null;
    }

    /**
     * POST /api/v1/payments with response_mode=raw_detail.
     *
     * @throws \RuntimeException on provider error or connection failure
     */
    public function createPayment(array $payload, string $idempotencyKey): array
    {
        $path = '/api/v1/payments';
        // Signed body must be byte-identical to the sent body — build the raw JSON once, sign it,
        // then send that exact string. Never let Http::post($url, $array) re-encode the array,
        // since its encoding/escaping can differ from what was hashed and the server replies 401.
        $rawBody = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $headers = $this->signedHeaders('POST', $path, $rawBody);
        $headers['Idempotency-Key'] = $idempotencyKey;

        try {
            $response = Http::withHeaders($headers)
                ->withBody($rawBody, 'application/json')
                ->timeout(15)
                ->post("{$this->baseUrl}{$path}");

            if (! $response->successful()) {
                Log::error('Satutera createPayment failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'payload' => $payload,
                ]);
                throw new \RuntimeException('Satutera createPayment error: '.($response->json('message') ?? $response->body()));
            }

            return $response->json('data', []);
        } catch (ConnectionException $e) {
            Log::error('Satutera createPayment connection exception', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Tidak bisa terhubung ke layanan pembayaran. Coba lagi.', previous: $e);
        }
    }

    /**
     * GET /api/v1/payments/{paymentId}/status — HMAC, for server-to-server polling.
     */
    public function getPaymentStatus(string $paymentId): array
    {
        $path = "/api/v1/payments/{$paymentId}/status";
        $headers = $this->signedHeaders('GET', $path, '');

        try {
            $response = Http::withHeaders($headers)->timeout(10)->retry(2, 200)->get("{$this->baseUrl}{$path}");

            if (! $response->successful()) {
                Log::warning('Satutera getPaymentStatus failed', [
                    'payment_id' => $paymentId,
                    'status' => $response->status(),
                ]);

                return [];
            }

            return $response->json();
        } catch (\Throwable $e) {
            Log::error('Satutera getPaymentStatus exception', ['payment_id' => $paymentId, 'error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Verify an incoming callback's signature: HMAC_SHA256(webhook_secret, timestamp . rawBody).
     */
    public function verifyCallbackSignature(string $rawBody, ?string $timestamp, ?string $signature): bool
    {
        if (empty($this->webhookSecret) || empty($timestamp) || empty($signature)) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.$rawBody, $this->webhookSecret);

        return hash_equals($expected, $signature);
    }

    private function signedHeaders(string $method, string $path, string $rawBody): array
    {
        $timestamp = now()->toIso8601String();
        $payload = $timestamp.strtoupper($method).$path.hash('sha256', $rawBody);

        return [
            'X-Client-Id' => $this->clientId,
            'X-Api-Key' => $this->apiKey,
            'X-Timestamp' => $timestamp,
            'X-Signature' => hash_hmac('sha256', $payload, $this->clientSecret),
            'Content-Type' => 'application/json',
        ];
    }
}
