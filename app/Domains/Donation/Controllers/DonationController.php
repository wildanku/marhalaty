<?php

namespace App\Domains\Donation\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Donation\Models\Donation;
use App\Domains\Donation\Models\Campaign;
use App\Domains\Donation\Models\Fund;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DonationController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:10000',
            'is_anonymous' => 'boolean',
            'donatable_type' => 'required|string',
            'donatable_id' => 'required|integer',
        ]);

        // Security check for polymorphic bounds mapping strictly to classes
        if (!in_array($validated['donatable_type'], ['campaign', 'fund'])) {
             throw ValidationException::withMessages(['donatable_type' => 'Invalid ledger target.']);
        }

        $typeClass = $validated['donatable_type'] === 'campaign' ? Campaign::class : Fund::class;
        $target = $typeClass::findOrFail($validated['donatable_id']);

        $donation = Donation::create([
            'user_id' => $request->user()->id,
            'amount' => $validated['amount'],
            'is_anonymous' => $validated['is_anonymous'] ?? false,
            'status' => 'pending',
            'donatable_type' => $typeClass,
            'donatable_id' => $target->id,
        ]);

        return redirect()->route('dashboard')->with('success', 'Thank you! Redirecting to payment...');
    }
}
