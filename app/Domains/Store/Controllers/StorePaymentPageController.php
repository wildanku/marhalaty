<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\PaymentSettingsService;
use App\Domains\Store\Services\CheckoutService;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * Hash-based public payment page for store orders — separate from `Pages/Payment/PaymentPage.tsx`
 * (the existing 778-line RSVP/iPaymu page). See docs/plan/mvp2/README.md decision D8.
 */
class StorePaymentPageController extends Controller
{
    public function show(string $hash, CheckoutService $checkout, PaymentSettingsService $paymentSettings)
    {
        $transaction = Transaction::with(['payable.items', 'payable.store', 'proof'])
            ->where('payment_hash', $hash)
            ->whereIn('payment_provider', ['satutera', 'manual'])
            ->firstOrFail();

        $order = $transaction->payable;

        // Payment creation can fail at checkout time (Satutera unreachable, timeout, ...), leaving
        // the transaction without a checkout_token. Retry it here so opening/refreshing the
        // payment page is enough to recover, instead of stranding the buyer with no way forward.
        // No-ops for manual transactions (no `payment_request` in metadata to retry).
        if ($order) {
            $checkout->retryPaymentInitiation($order, $transaction);
            $transaction->refresh()->load('proof');
        }

        return Inertia::render('Store/PaymentPage', [
            'order' => $order,
            'transaction' => $transaction,
            'checkoutToken' => $transaction->checkout_token,
            'expiresAt' => $transaction->expired_at,
            'satuteraWsUrl' => config('services.satutera.base_url'),
            'manualAccounts' => $transaction->payment_provider === 'manual' ? $paymentSettings->manualAccounts() : [],
            'hash' => $hash,
        ]);
    }

    /**
     * GET /store/payment/{hash}/status — JSON polling fallback.
     */
    public function status(string $hash)
    {
        $transaction = Transaction::where('payment_hash', $hash)
            ->whereIn('payment_provider', ['satutera', 'manual'])
            ->firstOrFail();

        return response()->json([
            'status' => $transaction->status,
            'paid_at' => $transaction->paid_at,
            'expires_at' => $transaction->expired_at,
        ]);
    }

    /**
     * Serve a proof through the payment hash, which is the public payment page's access token.
     */
    public function proof(string $hash)
    {
        $transaction = Transaction::with('proof')
            ->where('payment_hash', $hash)
            ->where('payment_provider', 'manual')
            ->firstOrFail();

        $proof = $transaction->proof;

        abort_unless($proof && Storage::disk('public')->exists($proof->file_path), 404);

        return Storage::disk('public')->response(
            $proof->file_path,
            $proof->original_name,
            [],
            'inline',
        );
    }
}
