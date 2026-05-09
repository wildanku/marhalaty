<?php

namespace App\Domains\Shared\Services;

use App\Contracts\PaymentProviderInterface;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * iPaymu v2 Redirect Payment integration.
 *
 * Docs: https://documenter.getpostman.com/view/7508325/SzmcZJ79
 *
 * Signature algorithm (per iPaymu spec):
 *   stringToSign = "POST:{va}:{sha256(json_body)}:{api_key}"
 *   signature    = hash_hmac('sha256', stringToSign, api_key)
 */
class IPaymuService implements PaymentProviderInterface
{
    private string $va;
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->va      = config('services.ipaymu.va');
        $this->apiKey  = config('services.ipaymu.api_key');
        $this->baseUrl = config('services.ipaymu.sandbox')
            ? 'https://sandbox.ipaymu.com/api/v2'
            : 'https://my.ipaymu.com/api/v2';
    }

    /**
     * Create a redirect payment session on iPaymu and return payment URL.
     */
    public function initiatePayment(Transaction $transaction, Rsvp $rsvp): array
    {
        $rsvp->loadMissing(['event', 'user']);

        $body = [
            'product'       => [$rsvp->event->title],
            'qty'           => [1],
            'price'         => [(int) round((float) $transaction->amount)],
            'description'   => ["RSVP #{$rsvp->id} - {$rsvp->event->title}"],
            'referenceId'   => (string) $transaction->id,
            'notifyUrl'     => route('payments.ipaymu.webhook'),
            'returnUrl'     => route('payments.show', $transaction->id),
            'cancelUrl'     => route('events.show', $rsvp->event->slug),
            'buyerName'     => $rsvp->user->name,
            'buyerEmail'    => $rsvp->user->email,
            'buyerPhone'    => $rsvp->user->phone_number ?? '08000000000',
            'paymentMethod' => 'redirect',
        ];

        $signature = $this->buildSignature($body);
        $timestamp = now()->format('YmdHis');

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'va'           => $this->va,
            'signature'    => $signature,
            'timestamp'    => $timestamp,
        ])->post($this->baseUrl . '/payment', $body);

        $data = $response->json();

        if (($data['Status'] ?? null) !== 200) {
            Log::error('iPaymu payment initiation failed', [
                'transaction_id' => $transaction->id,
                'response'       => $data,
            ]);
            throw new \Exception('iPaymu Error: ' . ($data['Message'] ?? 'Unknown error'));
        }

        return [
            'payment_url'        => $data['Data']['Url'],
            'external_reference' => (string) $data['Data']['SessionID'],
            'va_number'          => null,
        ];
    }

    /**
     * Parse incoming iPaymu webhook payload into a normalised format.
     *
     * iPaymu webhook fields (POST form-urlencoded):
     *   - referenceId  → our transaction ID
     *   - sid          → session ID (external_reference)
     *   - status_code  → "1" = paid, "2" = failed, "3" = expired
     *   - status       → "berhasil" | "gagal" | "kadaluarsa"
     *   - trx_id       → iPaymu internal transaction ID
     */
    public function parseWebhook(Request $request): array
    {
        $statusMap = [
            'berhasil'   => 'paid',
            'paid'       => 'paid',
            '1'          => 'paid',
            'gagal'      => 'failed',
            'failed'     => 'failed',
            '2'          => 'failed',
            'kadaluarsa' => 'expired',
            'expired'    => 'expired',
            '3'          => 'expired',
        ];

        $rawStatus     = strtolower((string) $request->input('status', ''));
        $rawStatusCode = (string) $request->input('status_code', '');
        $mappedStatus  = $statusMap[$rawStatus] ?? $statusMap[$rawStatusCode] ?? 'pending';

        return [
            'external_reference' => (string) $request->input('sid', ''),
            'reference_id'       => (string) $request->input('referenceId', ''), // our transaction ID
            'status'             => $mappedStatus,
            'trx_id'             => $request->input('trx_id'),
        ];
    }

    /**
     * Basic verification: check required webhook fields are present.
     *
     * iPaymu does not send an HMAC signature header on webhooks by default,
     * so we rely on IP whitelisting at the infrastructure level.
     */
    public function verifyWebhook(Request $request): bool
    {
        return $request->has('referenceId') && $request->has('status');
    }

    // ─── Private ─────────────────────────────────────────────────────

    /**
     * Build HMAC-SHA256 signature required by iPaymu v2 API.
     */
    private function buildSignature(array $body): string
    {
        $bodyHash    = hash('sha256', json_encode($body));
        $stringSign  = 'POST:' . $this->va . ':' . $bodyHash . ':' . $this->apiKey;
        return hash_hmac('sha256', $stringSign, $this->apiKey);
    }
}
