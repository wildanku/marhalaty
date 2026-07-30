<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Event\Models\Transaction;
use App\Http\Controllers\Controller;
use Inertia\Inertia;

/**
 * Hash-based public payment page for store orders — separate from `Pages/Payment/PaymentPage.tsx`
 * (the existing 778-line RSVP/iPaymu page). See docs/plan/mvp2/README.md decision D8.
 */
class StorePaymentPageController extends Controller
{
    public function show(string $hash)
    {
        $transaction = Transaction::with(['payable.items', 'payable.store'])
            ->where('payment_hash', $hash)
            ->where('payment_provider', 'satutera')
            ->firstOrFail();

        return Inertia::render('Store/PaymentPage', [
            'order' => $transaction->payable,
            'transaction' => $transaction,
            'checkoutToken' => $transaction->checkout_token,
            'expiresAt' => $transaction->expired_at,
            'satuteraWsUrl' => config('services.satutera.base_url'),
            'hash' => $hash,
        ]);
    }

    /**
     * GET /store/payment/{hash}/status — JSON polling fallback.
     */
    public function status(string $hash)
    {
        $transaction = Transaction::where('payment_hash', $hash)
            ->where('payment_provider', 'satutera')
            ->firstOrFail();

        return response()->json([
            'status' => $transaction->status,
            'paid_at' => $transaction->paid_at,
            'expires_at' => $transaction->expired_at,
        ]);
    }
}
