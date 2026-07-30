<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PaymentChannelController extends Controller
{
    public function __construct(private SatuteraPaymentService $satutera) {}

    /**
     * GET /api/store/payment-channels — cached, credential-free response safe to expose publicly.
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
