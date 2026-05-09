<?php

namespace App\Domains\Event\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\Rsvp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RsvpController extends Controller
{
    public function store(Request $request, $slug)
    {
        $event = Event::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'event_package_id'   => 'nullable|exists:event_packages,id',
            'infak_amount'       => 'nullable|numeric|min:0',
            'addons'             => 'array',
            'addons.*.id'        => 'required|exists:event_addons,id',
            'addons.*.quantity'  => 'required|integer|min:1',
            'addons.*.variants'  => 'nullable|array',
            'custom_form_data'   => 'nullable|array',
            'custom_form_data.*' => 'nullable|string|max:1000',
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

            Rsvp::create([
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

            return redirect()->route('dashboard')->with('success', 'RSVP created successfully!');
        });
    }
}
