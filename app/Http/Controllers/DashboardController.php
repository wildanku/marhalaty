<?php

namespace App\Http\Controllers;

use App\Domains\Event\Models\Rsvp;
use App\Domains\Shared\Services\PaymentSettingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request, PaymentSettingsService $paymentSettings)
    {
        $user = $request->user();

        $rsvps = Rsvp::with(['event', 'latestTransaction.proof'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Dashboard', [
            'rsvps' => $rsvps,
            'enabledPaymentProviders' => $paymentSettings->enabledCodesFor('event'),
            'qrisOnlyBelowAmount' => (int) config('payments.qris_only_below_amount'),
        ]);
    }
}
