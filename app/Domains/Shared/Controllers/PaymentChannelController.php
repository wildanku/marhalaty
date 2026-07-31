<?php

namespace App\Domains\Shared\Controllers;

use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Moved from `App\Domains\Store\Controllers` (fase 9, D40) — channel data isn't store-specific,
 * only the driver (`satutera`) is. There's a `gateway` query param reserved for a future
 * channel-based driver besides `satutera`, but `index()` doesn't read it yet — it would have
 * nothing to branch on today, and adding an unused parameter read felt more misleading than
 * useful. Whoever adds the second channel-based driver should read it here.
 */
class PaymentChannelController extends Controller
{
    public function __construct(private SatuteraPaymentService $satutera) {}

    /**
     * GET /api/payment/channels — cached, credential-free response safe to expose publicly.
     * GET /api/store/payment-channels — same handler, kept as an alias (D40) so
     * `Pages/Store/Checkout.tsx` doesn't need to change in this release.
     */
    public function index(Request $request)
    {
        $channels = $this->satutera->getPaymentChannels(
            method: $request->get('method'),
            provider: $request->get('provider'),
        );

        return response()->json(['data' => $channels]);
    }
}
