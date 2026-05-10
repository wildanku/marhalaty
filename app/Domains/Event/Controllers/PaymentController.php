<?php

namespace App\Domains\Event\Controllers;

use App\Contracts\PaymentProviderInterface;
use App\Domains\Event\Models\Transaction;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PaymentController extends Controller
{
    /**
     * Show the payment status / instructions page for a transaction.
     */
    public function show(Request $request, int $id)
    {
        $transaction = Transaction::with(['rsvp.event', 'proof'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $bankAccounts = Setting::get('bank_account_manual_transfer', []);

        return Inertia::render('Payment/Show', [
            'transaction'  => $transaction,
            'rsvp'         => $transaction->rsvp,
            'event'        => $transaction->rsvp->event,
            'bankAccounts' => $bankAccounts,
        ]);
    }

    /**
     * Handle iPaymu payment webhook (POST).
     * Route is exempt from CSRF; called by iPaymu server.
     */
    public function ipaymuWebhook(Request $request)
    {
        $provider = app(PaymentProviderInterface::class);

        if (!$provider->verifyWebhook($request)) {
            Log::warning('iPaymu webhook verification failed', $request->all());
            return response()->json(['message' => 'Invalid webhook'], 400);
        }

        $payload = $provider->parseWebhook($request);
        $transactionId = (int) $payload['reference_id'];

        if (!$transactionId) {
            Log::warning('iPaymu webhook missing referenceId', $request->all());
            return response()->json(['message' => 'Missing referenceId'], 400);
        }

        DB::transaction(function () use ($payload, $transactionId, $request) {
            $transaction = Transaction::with('rsvp')
                ->where('id', $transactionId)
                ->where('payment_provider', 'ipaymu')
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                Log::warning('iPaymu webhook: transaction not found', ['id' => $transactionId]);
                return;
            }

            // Idempotency: skip if already processed
            if ($transaction->status === 'paid') {
                return;
            }

            $newStatus = $payload['status'];

            $transaction->update([
                'status'             => $newStatus,
                'external_reference' => $payload['external_reference'] ?: $transaction->external_reference,
                'paid_at'            => $newStatus === 'paid' ? now() : null,
                'metadata'           => array_merge(
                    $transaction->metadata ?? [],
                    ['webhook_payload' => $request->all(), 'processed_at' => now()->toISOString()]
                ),
            ]);

            // Mirror status to the parent RSVP
            if ($transaction->rsvp) {
                $rsvpStatus = match ($newStatus) {
                    'paid'    => 'paid',
                    'failed'  => 'failed',
                    'expired' => 'expired',
                    default   => 'pending',
                };
                $transaction->rsvp->update(['status' => $rsvpStatus]);
            }

            Log::info('iPaymu webhook processed', [
                'transaction_id' => $transactionId,
                'new_status'     => $newStatus,
            ]);
        });

        return response()->json(['message' => 'OK'], 200);
    }

    /**
     * Handle iPaymu return URL redirect (GET) after user completes payment.
     * iPaymu returns the user here after payment is attempted.
     */
    public function ipaymuReturn(Request $request)
    {
        $transactionId = (int) $request->input('reference_id');

        if ($transactionId) {
            return redirect()->route('payments.show', $transactionId);
        }

        return redirect()->route('dashboard')->with('info', 'Pembayaran selesai. Silakan cek status transaksi di dashboard.');
    }

    /**
     * Debug endpoint: Check iPaymu configuration and connectivity.
     * Only available in debug mode. Route: GET /api/debug/ipaymu-config
     */
    public function debugIPaymuConfig()
    {
        if (!config('app.debug')) {
            return response()->json(['error' => 'Not available in production'], 403);
        }

        $va = config('services.ipaymu.va');
        $apiKey = config('services.ipaymu.api_key');
        $sandbox = config('services.ipaymu.sandbox');

        $configStatus = [
            'va' => [
                'set' => !empty($va),
                'value' => $va ? substr($va, 0, 3) . '***' : 'NOT SET',
            ],
            'api_key' => [
                'set' => !empty($apiKey),
                'value' => $apiKey ? substr($apiKey, 0, 3) . '***' . substr($apiKey, -3) : 'NOT SET',
            ],
            'sandbox' => $sandbox,
            'base_url' => $sandbox
                ? 'https://sandbox.ipaymu.com/api/v2'
                : 'https://my.ipaymu.com/api/v2',
        ];

        if (!$va || !$apiKey) {
            return response()->json([
                'status' => 'ERROR',
                'message' => 'iPaymu credentials not configured. Please set IPAYMU_VA and IPAYMU_API_KEY in .env',
                'config' => $configStatus,
            ], 400);
        }

        return response()->json([
            'status' => 'OK',
            'message' => 'iPaymu configuration is set',
            'config' => $configStatus,
        ]);
    }
}
