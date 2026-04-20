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
            'base_amount' => 'required|numeric|min:0',
            'addons' => 'array',
            'addons.*.id' => 'required|exists:event_addons,id',
            'addons.*.quantity' => 'required|integer|min:1',
            'addons.*.variant' => 'nullable|string',
        ]);

        // Dynamic Pricing Rules Validation
        if ($event->payment_type === 'fixed') {
            $expectedPrice = $event->pricing_rules['amount'] ?? 0;
            if ($validated['base_amount'] != $expectedPrice) {
                throw ValidationException::withMessages(['base_amount' => "Invalid ticket price. Expected {$expectedPrice}."]);
            }
        } elseif ($event->payment_type === 'flexible') {
            $minCustom = $event->pricing_rules['min_custom'] ?? 0;
            if ($validated['base_amount'] < $minCustom) {
                 throw ValidationException::withMessages(['base_amount' => "Minimum contribution is {$minCustom}."]);
            }
        } elseif ($event->payment_type === 'free') {
             if ($validated['base_amount'] > 0) {
                  throw ValidationException::withMessages(['base_amount' => 'This event is free.']);
             }
        }

        return DB::transaction(function () use ($request, $event, $validated) {
            $totalAmount = $validated['base_amount'];
            $addonSnapshot = [];

            if (!empty($validated['addons'])) {
                foreach ($validated['addons'] as $purchasedAddon) {
                    // Lock the row for update to prevent race conditions on stock quantity decreases
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
                        'id' => $addon->id,
                        'name' => $addon->name,
                        'price' => $addon->price,
                        'quantity' => $purchasedAddon['quantity'],
                        'variant' => $purchasedAddon['variant'] ?? null,
                        'total' => $itemTotal,
                    ];
                }
            }

            $rsvp = Rsvp::create([
                'user_id' => $request->user()->id,
                'event_id' => $event->id,
                'base_amount' => $validated['base_amount'],
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'add_ons_snapshot' => empty($addonSnapshot) ? null : $addonSnapshot,
            ]);

            return redirect()->route('dashboard')->with('success', 'RSVP created successfully!');
        });
    }
}
