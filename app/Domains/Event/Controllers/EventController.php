<?php

namespace App\Domains\Event\Controllers;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Shared\Services\IPaymuService;
use App\Domains\Shared\Services\PaymentSettingsService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Event::query()->orderBy('event_date', 'asc');

        if ($request->has('scope') && $request->scope === 'marhalah') {
            $query->where('visibility_scope', $user->marhalah_year);
        } elseif ($request->has('scope') && $request->scope === 'global') {
            $query->where(function ($q) {
                $q->whereNull('visibility_scope')
                    ->orWhere('visibility_scope', 'global');
            });
        } else {
            // All accessible events logic
            $query->where(function ($q) use ($user) {
                $q->whereNull('visibility_scope')
                    ->orWhere('visibility_scope', 'global')
                    ->orWhere('visibility_scope', $user->marhalah_year);
            });
        }

        return Inertia::render('Event/Index', [
            'events' => $query->get(),
            'currentScope' => $request->scope ?? 'all',
        ]);
    }

    public function show($slug, Request $request, PaymentSettingsService $paymentSettings)
    {
        // Avoids N+1 on EventAddon's `available_stock`/`variant_options`/`display_price` accessors
        // (fase 8 risk table) — every addon would otherwise lazy-load its product/variant/variants
        // individually. `product`/`variant` still needed for `available_stock` (D25); `variants`
        // (EventAddonVariant, own per-combination pricing) is the new source for options + price.
        $event = Event::with(['addons.product', 'addons.variant', 'addons.variants', 'packages.includedAddons.product', 'packages.includedAddons.variant', 'packages.includedAddons.variants'])->where('slug', $slug)->firstOrFail();
        $user = $request->user();

        // If event visibility is restricted, require authentication and match marhalah_year
        if ($event->visibility_scope && $event->visibility_scope !== 'global') {
            if (! $user || $event->visibility_scope != $user->marhalah_year) {
                abort(403, 'This event is restricted to a specific Marhalah.');
            }
        }

        $existingRsvp = null;
        if ($user) {
            $existingRsvp = Rsvp::where('event_id', $event->id)
                ->where('user_id', $user->id)
                ->first();
        }

        return Inertia::render('Event/Show', [
            'event' => $event,
            'existingRsvp' => $existingRsvp,
            'image_url' => $event->getFirstMediaUrl('event-images'),
            'enabledPaymentProviders' => $paymentSettings->enabledCodesFor('event'),
            'paymentGateways' => $paymentSettings->gatewaysFor('event'),
            // Fase 9, D38 — below this amount, only QRIS is offered for Satutera (payments.php).
            'qrisOnlyBelowAmount' => (int) config('payments.qris_only_below_amount'),
        ]);
    }

    /**
     * Get available payment channels for iPaymu (for frontend to render payment method selection).
     */
    public function paymentChannels()
    {
        $ipaymuService = app(IPaymuService::class);

        return response()->json($ipaymuService->getPaymentChannels());
    }
}
