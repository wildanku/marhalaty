<?php

namespace App\Domains\Event\Controllers;

use App\Contracts\PaymentProviderInterface;
use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\IPaymuService;
use App\Jobs\SendEventRegistrationConfirmedEmail;
use App\Jobs\SendEventRegistrationPendingPaymentEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RsvpController extends Controller
{
    public function store(Request $request, $slug)
    {
        $event = Event::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'payment_provider'                    => 'required|in:manual,ipaymu',
            'payment_channel'                     => 'nullable|string|max:30',
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
            'purchased_addon_variants'            => 'nullable|array',
            'purchased_addon_variants.*'          => 'nullable|array',
            'purchased_addon_variants.*.*'        => 'nullable|array',
            'purchased_addon_variants.*.*.*'      => 'nullable|string|max:100',
            'included_addon_forms'                => 'nullable|array',
            'included_addon_forms.*'              => 'nullable|array',
            'included_addon_forms.*.*'            => 'nullable|array',
            'included_addon_forms.*.*.*'          => 'nullable|string|max:255',
            'purchased_addon_forms'               => 'nullable|array',
            'purchased_addon_forms.*'             => 'nullable|array',
            'purchased_addon_forms.*.*'           => 'nullable|array',
            'purchased_addon_forms.*.*.*'         => 'nullable|string|max:255',
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
                                
                // Validate available quota (booked only when payment confirmed)
                if (! $package->hasAvailableQuota()) {
                    throw ValidationException::withMessages(['event_package_id' => "Paket {$package->name} sudah penuh. Silakan pilih paket lain."]);
                }
                
                $packageAmount = $package->price;
            }

            $totalAmount = $packageAmount + $infakAmount;
            $addonSnapshot = [];

            // Handle Addons
            if (!empty($validated['addons'])) {
                $purchasedAddonVariants = $validated['purchased_addon_variants'] ?? [];
                $purchasedAddonForms = $validated['purchased_addon_forms'] ?? [];

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
                        'id'             => $addon->id,
                        'name'           => $addon->name,
                        'price'          => $addon->price,
                        'quantity'       => $purchasedAddon['quantity'],
                        'variant_slots'  => $purchasedAddonVariants[$purchasedAddon['id']] ?? null,
                        'form'           => $purchasedAddonForms[$purchasedAddon['id']] ?? null,
                        'total'          => $itemTotal,
                    ];
                }
            }

            // Handle included addon variant selections (no charge, no stock decrement)
            $includedAddonVariants = $validated['included_addon_variants'] ?? [];
            $includedAddonForms = $validated['included_addon_forms'] ?? [];
            $includedAddonIds = array_unique(array_merge(array_keys($includedAddonVariants), array_keys($includedAddonForms)));

            if (!empty($includedAddonIds) && !empty($validated['event_package_id'])) {
                $package = \App\Domains\Event\Models\EventPackage::with('includedAddons')
                    ->find($validated['event_package_id']);

                foreach ($includedAddonIds as $addonId) {
                    $includedAddon = $package?->includedAddons?->firstWhere('id', $addonId);
                    if (!$includedAddon) continue;

                    $addonSnapshot[] = [
                        'id'          => (int) $addonId,
                        'name'        => $includedAddon->name,
                        'price'       => 0,
                        'quantity'    => $includedAddon->pivot->included_quantity,
                        'variants'    => $includedAddonVariants[$addonId] ?? null,
                        'form'        => $includedAddonForms[$addonId] ?? null,
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
                'payment_channel'  => $validated['payment_channel'] ?? null,
                'status'           => 'pending',
            ]);

            // ── Send email notification ───────────────────────────────────
            $user = $request->user();

            if ($totalAmount <= 0) {
                // Free event: confirm immediately via Brevo API queue job
                SendEventRegistrationConfirmedEmail::dispatch($rsvp);
            } else {
                // Paid event: send pending payment instructions via Brevo API queue job
                SendEventRegistrationPendingPaymentEmail::dispatch($rsvp, $transaction);
            }

            // ── Initiate provider-specific payment ────────────────────────
            if ($provider === 'ipaymu') {
                $channel = $validated['payment_channel'] ?? 'qris';
                try {
                    $ipaymu = new IPaymuService();
                    $result = $ipaymu->initiateDirectPayment($transaction, $rsvp, $channel);

                    Log::debug('iPaymu direct payment response', [
                        'transaction_id' => $transaction->id,
                        'channel' => $channel,
                        'result' => $result,
                    ]);

                    $transaction->update([
                        'external_reference' => $result['external_reference'],
                        'va_number'          => $result['va_number'],
                        'metadata'           => array_merge(
                            $transaction->metadata ?? [],
                            [
                                'qr_string' => $result['qr_string'],
                                'ipaymu_initiated_at' => now()->toISOString(),
                            ]
                        ),
                    ]);

                    Log::info('iPaymu direct payment initiated successfully', [
                        'transaction_id' => $transaction->id,
                        'channel' => $channel,
                        'external_reference' => $result['external_reference'],
                    ]);
                } catch (\Exception $e) {
                    Log::error('iPaymu direct payment initiation failed', [
                        'transaction_id' => $transaction->id,
                        'channel' => $channel,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                    // Fallback to manual payment page so user is not stuck
                }
            }

            // Redirect to hash-based payment page
            return redirect('/payment/' . $transaction->payment_hash)
                ->with('success', 'RSVP berhasil! Silakan selesaikan pembayaran.');
        });
    }

    public function edit(Request $request, $id)
    {
        $rsvp = Rsvp::with([
            'event.addons',
            'event.packages.includedAddons'
        ])
        ->where('user_id', $request->user()->id)
        ->findOrFail($id);

        return Inertia::render('Rsvp/Edit', [
            'rsvp' => $rsvp,
        ]);
    }

    public function update(Request $request, $id)
    {
        $rsvp = Rsvp::where('user_id', $request->user()->id)
                    ->findOrFail($id);

        $validated = $request->validate([
            'custom_form_data'                    => 'nullable|array',
            'custom_form_data.*'                  => 'nullable|string|max:1000',
            'included_addon_variants'             => 'nullable|array',
            'included_addon_variants.*'           => 'nullable|array',
            'included_addon_variants.*.*'         => 'nullable|array',
            'included_addon_variants.*.*.*'       => 'nullable|string|max:100',
            'purchased_addon_variants'            => 'nullable|array',
            'purchased_addon_variants.*'          => 'nullable|array',
            'purchased_addon_variants.*.*'        => 'nullable|array',
            'purchased_addon_variants.*.*.*'      => 'nullable|string|max:100',
            'included_addon_forms'                => 'nullable|array',
            'included_addon_forms.*'              => 'nullable|array',
            'included_addon_forms.*.*'            => 'nullable|array',
            'included_addon_forms.*.*.*'          => 'nullable|string|max:255',
            'purchased_addon_forms'               => 'nullable|array',
            'purchased_addon_forms.*'             => 'nullable|array',
            'purchased_addon_forms.*.*'           => 'nullable|array',
            'purchased_addon_forms.*.*.*'         => 'nullable|string|max:255',
        ]);

        $snapshot = $rsvp->add_ons_snapshot ?? [];

        $purchasedAddonVariants = $validated['purchased_addon_variants'] ?? [];
        $purchasedAddonForms = $validated['purchased_addon_forms'] ?? [];
        $includedAddonVariants = $validated['included_addon_variants'] ?? [];
        $includedAddonForms = $validated['included_addon_forms'] ?? [];

        foreach ($snapshot as &$addon) {
            $addonId = $addon['id'];
            if (isset($addon['is_included']) && $addon['is_included']) {
                $addon['variants'] = $includedAddonVariants[$addonId] ?? null;
                $addon['form'] = $includedAddonForms[$addonId] ?? null;
            } else {
                $addon['variant_slots'] = $purchasedAddonVariants[$addonId] ?? null;
                $addon['form'] = $purchasedAddonForms[$addonId] ?? null;
            }
        }

        $rsvp->update([
            'custom_form_data' => $validated['custom_form_data'] ?? null,
            'add_ons_snapshot' => empty($snapshot) ? null : $snapshot,
        ]);

        return redirect()->route('dashboard')->with('success', 'RSVP details updated successfully.');
    }
}

