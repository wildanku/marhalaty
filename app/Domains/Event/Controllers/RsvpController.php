<?php

namespace App\Domains\Event\Controllers;

use App\Contracts\PaymentProviderInterface;
use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\IPaymuService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class RsvpController extends Controller
{
    public function store(Request $request, $slug)
    {
        $event = Event::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'payment_provider'                    => 'required|in:manual,ipaymu',
            'event_package_id'                    => 'nullable|exists:event_packages,id',
            'infak_amount'                        => 'nullable|numeric|min:0',
            'addons'                              => 'array',
            'addons.*.id'                         => 'required|exists:event_addons,id',
            'addons.*.quantity'                   => 'required|integer|min:1',
            'addons.*.variants'                   => 'nullable|array',
            'custom_form_data'                    => 'nullable|array',
            'custom_form_data.*'                  => 'nullable|string|max:1000',
            'included_addon_variants'             => 'nullable|array',
            'included_addon_variants.*'           => 'nullable|array',
            'included_addon_variants.*.*'         => 'nullable|array',
            'included_addon_variants.*.*.*'       => 'nullable|string|max:100',
        ]);

        $infakAmount = $validated['infak_amount'] ?? 0;
        
        // Validate Infak if it exists
        if ($infakAmount > 0 && isset($event->infak_rules['enabled']) && $event->infak_rules['enabled']) {
            $rules = $event->infak_rules;
            if (!($rules['allow_custom'] ?? false)) {
                $options = $rules['options'] ?? [];
                if (!in_array($infakAmount, $options)) {
                    throw ValidationException::withMessages(['infak_amount' => 'Invalid infak amount.']);
                }
            } else {
                $minCustom = $rules['min_custom'] ?? 0;
                if ($infakAmount < $minCustom && !in_array($infakAmount, $rules['options'] ?? [])) {
                    throw ValidationException::withMessages(['infak_amount' => "Minimum infak is {$minCustom}."]);
                }
            }
        } elseif ($infakAmount > 0) {
            // Infak is not enabled for this event but user sent an amount
            throw ValidationException::withMessages(['infak_amount' => 'Infak is not enabled for this event.']);
        }

        return DB::transaction(function () use ($request, $event, $validated, $infakAmount) {
            $packageAmount = 0;
            
            // Handle Package Selection
            if (!empty($validated['event_package_id'])) {
                $package = \App\Domains\Event\Models\EventPackage::where('id', $validated['event_package_id'])
                                ->where('event_id', $event->id)
                                ->lockForUpdate()
                                ->firstOrFail();
                                
                if ($package->stock_quantity !== null) {
                    if ($package->stock_quantity < 1) {
                        throw ValidationException::withMessages(['event_package_id' => "Package {$package->name} is sold out."]);
                    }
                    $package->decrement('stock_quantity', 1);
                }
                $packageAmount = $package->price;
            }

            $totalAmount = $packageAmount + $infakAmount;
            $addonSnapshot = [];

            // Handle Addons
            if (!empty($validated['addons'])) {
                foreach ($validated['addons'] as $purchasedAddon) {
                    $addon = EventAddon::where('id', $purchasedAddon['id'])
                                        ->where('event_id', $event->id)
                                        ->lockForUpdate()
                                        ->firstOrFail();

                    if ($addon->stock_quantity < $purchasedAddon['quantity']) {
                        throw ValidationException::withMessages(['addons' => "Not enough stock for {$addon->name}."]);
                    }

                    $addon->decrement('stock_quantity', $purchasedAddon['quantity']);
                    $itemTotal = $addon->price * $purchasedAddon['quantity'];
                    $totalAmount += $itemTotal;

                    $addonSnapshot[] = [
                        'id'       => $addon->id,
                        'name'     => $addon->name,
                        'price'    => $addon->price,
                        'quantity' => $purchasedAddon['quantity'],
                        'variants' => $purchasedAddon['variants'] ?? null,
                        'total'    => $itemTotal,
                    ];
                }
            }

            // Handle included addon variant selections (no charge, no stock decrement)
            $includedAddonVariants = $validated['included_addon_variants'] ?? [];
            if (!empty($includedAddonVariants) && !empty($validated['event_package_id'])) {
                $package = \App\Domains\Event\Models\EventPackage::with('includedAddons')
                    ->find($validated['event_package_id']);

                foreach ($includedAddonVariants as $addonId => $variantSelections) {
                    $includedAddon = $package?->includedAddons?->firstWhere('id', $addonId);
                    if (!$includedAddon) continue;

                    $addonSnapshot[] = [
                        'id'          => (int) $addonId,
                        'name'        => $includedAddon->name,
                        'price'       => 0,
                        'quantity'    => $includedAddon->pivot->included_quantity,
                        'variants'    => $variantSelections,
                        'total'       => 0,
                        'is_included' => true,
                    ];
                }
            }

            $rsvp = Rsvp::create([
                'user_id'          => $request->user()->id,
                'event_id'         => $event->id,
                'event_package_id' => $validated['event_package_id'] ?? null,
                'package_amount'   => $packageAmount,
                'infak_amount'     => $infakAmount,
                'total_amount'     => $totalAmount,
                'status'           => 'pending',
                'add_ons_snapshot' => empty($addonSnapshot) ? null : $addonSnapshot,
                'custom_form_data' => $validated['custom_form_data'] ?? null,
            ]);

            // ── Create Transaction ────────────────────────────────────────
            $provider = $validated['payment_provider'];

            $transaction = Transaction::create([
                'rsvp_id'          => $rsvp->id,
                'user_id'          => $request->user()->id,
                'amount'           => $totalAmount,
                'payment_provider' => $provider,
                'status'           => 'pending',
            ]);

            // ── Initiate provider-specific payment ────────────────────────
            if ($provider === 'ipaymu') {
                try {
                    $ipaymu = new IPaymuService();
                    $result = $ipaymu->initiatePayment($transaction, $rsvp);

                    $transaction->update([
                        'external_reference' => $result['external_reference'],
                        'payment_url'        => $result['payment_url'],
                        'va_number'          => $result['va_number'],
                    ]);

                    // Redirect user to iPaymu payment page
                    return redirect()->away($result['payment_url']);
                } catch (\Exception $e) {
                    Log::error('iPaymu initiation failed', [
                        'transaction_id' => $transaction->id,
                        'error'          => $e->getMessage(),
                    ]);

                    // Fallback: send to payment page where user can retry or switch to manual
                    return redirect()
                        ->route('payments.show', $transaction->id)
                        ->with('error', 'Gagal menghubungi iPaymu. Silakan coba lagi atau gunakan transfer manual.');
                }
            }

            // Manual payment: redirect to payment instructions page
            return redirect()
                ->route('payments.show', $transaction->id)
                ->with('success', 'RSVP berhasil! Silakan selesaikan pembayaran transfer manual.');
        });
    }
}
