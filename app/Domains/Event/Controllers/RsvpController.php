<?php

namespace App\Domains\Event\Controllers;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventPackage;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Event\Services\RsvpAddonResolver;
use App\Domains\Shared\Services\IPaymuService;
use App\Domains\Shared\Services\PaymentSettingsService;
use App\Domains\Shared\Services\SatuteraPaymentInitiator;
use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Http\Controllers\Controller;
use App\Jobs\SendEventRegistrationConfirmedEmail;
use App\Jobs\SendEventRegistrationPendingPaymentEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RsvpController extends Controller
{
    public function store(
        Request $request,
        $slug,
        PaymentSettingsService $paymentSettings,
        RsvpAddonResolver $addonResolver,
        SatuteraPaymentService $satutera,
        SatuteraPaymentInitiator $satuteraInitiator,
    ) {
        $event = Event::where('slug', $slug)->firstOrFail();

        if (! $event->is_registration_enabled) {
            return redirect()->back()->withErrors(['error' => 'Maaf, pendaftaran untuk event ini sudah ditutup. Jika ada pertanyaan atau butuh bantuan, silakan hubungi Admin melalui WhatsApp ya! 😊']);
        }

        $enabledPaymentProviders = $paymentSettings->enabledCodesFor('event');

        if (empty($enabledPaymentProviders)) {
            return redirect()->back()->withErrors(['payment_provider' => 'Belum ada metode pembayaran yang aktif untuk event ini. Hubungi admin.']);
        }

        $validated = $request->validate([
            'payment_provider' => ['required', Rule::in($enabledPaymentProviders)],
            // Satutera-only (fase 9, D35): `payment_provider` above already means "which gateway"
            // (manual/ipaymu/satutera) — these three name Satutera's own channel triple, kept
            // distinct from that field on purpose so the existing manual/ipaymu contract never
            // shifts meaning. Mirrors Store\CheckoutController's payment_provider/payment_method/
            // payment_channel fields, just renamed at the top level to avoid the collision.
            'channel_provider' => 'required_if:payment_provider,satutera|nullable|string|max:30',
            'payment_method' => 'required_if:payment_provider,satutera|nullable|string|max:20',
            'payment_channel' => 'required_if:payment_provider,satutera|nullable|string|max:30',
            'event_package_id' => 'nullable|exists:event_packages,id',
            'infak_amount' => 'nullable|numeric|min:0',
            'addons' => 'array',
            'addons.*.id' => 'required|exists:event_addons,id',
            'addons.*.quantity' => 'required|integer|min:1',
            'addons.*.variants' => 'nullable|array',
            'custom_form_data' => 'nullable|array',
            'custom_form_data.*' => 'nullable|string|max:1000',
            'included_addon_variants' => 'nullable|array',
            'included_addon_variants.*' => 'nullable|array',
            'included_addon_variants.*.*' => 'nullable|array',
            'included_addon_variants.*.*.*' => 'nullable|string|max:100',
            'purchased_addon_variants' => 'nullable|array',
            'purchased_addon_variants.*' => 'nullable|array',
            'purchased_addon_variants.*.*' => 'nullable|array',
            'purchased_addon_variants.*.*.*' => 'nullable|string|max:100',
            'included_addon_forms' => 'nullable|array',
            'included_addon_forms.*' => 'nullable|array',
            'included_addon_forms.*.*' => 'nullable|array',
            'included_addon_forms.*.*.*' => 'nullable|string|max:255',
            'purchased_addon_forms' => 'nullable|array',
            'purchased_addon_forms.*' => 'nullable|array',
            'purchased_addon_forms.*.*' => 'nullable|array',
            'purchased_addon_forms.*.*.*' => 'nullable|string|max:255',
            'included_addon_notes' => 'nullable|array',
            'included_addon_notes.*' => 'nullable|string|max:250',
            'purchased_addon_notes' => 'nullable|array',
            'purchased_addon_notes.*' => 'nullable|string|max:250',
        ]);

        $infakAmount = $validated['infak_amount'] ?? 0;

        // Validate Infak if it exists
        if ($infakAmount > 0 && isset($event->infak_rules['enabled']) && $event->infak_rules['enabled']) {
            $rules = $event->infak_rules;
            if (! ($rules['allow_custom'] ?? false)) {
                $options = $rules['options'] ?? [];
                if (! in_array($infakAmount, $options)) {
                    throw ValidationException::withMessages(['infak_amount' => 'Invalid infak amount.']);
                }
            } else {
                $minCustom = $rules['min_custom'] ?? 0;
                if ($infakAmount < $minCustom && ! in_array($infakAmount, $rules['options'] ?? [])) {
                    throw ValidationException::withMessages(['infak_amount' => "Minimum infak is {$minCustom}."]);
                }
            }
        } elseif ($infakAmount > 0) {
            // Infak is not enabled for this event but user sent an amount
            throw ValidationException::withMessages(['infak_amount' => 'Infak is not enabled for this event.']);
        }

        return DB::transaction(function () use ($request, $event, $validated, $infakAmount, $addonResolver, $satutera, $satuteraInitiator) {
            $packageAmount = 0;
            $package = null;

            // Handle Package Selection
            if (! empty($validated['event_package_id'])) {
                $package = EventPackage::where('id', $validated['event_package_id'])
                    ->where('event_id', $event->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                // Validate available quota (booked only when payment confirmed)
                if (! $package->hasAvailableQuota()) {
                    throw ValidationException::withMessages(['event_package_id' => "Paket {$package->name} sudah penuh. Silakan pilih paket lain."]);
                }

                $packageAmount = $package->price;
            }

            // Addon resolution (purchased + included) happens after the RSVP row exists — see
            // below — since product-linked addons need `$rsvp->id` for `product_reservations`
            // (fase 8, D24-D32). Compute the pre-addon total first so the RSVP can be created.
            $totalAmount = $packageAmount + $infakAmount;

            $rsvp = Rsvp::create([
                'user_id' => $request->user()->id,
                'event_id' => $event->id,
                'event_package_id' => $validated['event_package_id'] ?? null,
                'package_amount' => $packageAmount,
                'infak_amount' => $infakAmount,
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'add_ons_snapshot' => null,
                'custom_form_data' => $validated['custom_form_data'] ?? null,
            ]);

            // Addons: locks/validates each one, decrements event-local stock for non-linked addons,
            // and reserves product/variant stock for product-linked addons via ProductStockService
            // (fase 8, D24-D32 — docs/plan/mvp2/8-event-product-integration.md). Runs inside this
            // same DB::transaction() so a stock shortfall rolls back the RSVP too.
            [$addonSnapshot, $addonTotal, $productReservations] = $addonResolver->resolve($rsvp, $event, $validated, $package);

            $totalAmount += $addonTotal;

            if (! empty($addonSnapshot)) {
                $rsvp->update([
                    'total_amount' => $totalAmount,
                    'add_ons_snapshot' => $addonSnapshot,
                ]);
            }

            // ── Create Transaction ────────────────────────────────────────
            $provider = $validated['payment_provider'];
            $user = $request->user();

            $paymentFee = 0;

            if ($provider === 'satutera') {
                $channel = $satutera->findChannel(
                    $validated['channel_provider'],
                    $validated['payment_method'],
                    $validated['payment_channel'],
                );

                if (! $channel) {
                    throw ValidationException::withMessages(['payment_channel' => 'Metode pembayaran tidak tersedia. Pilih ulang.']);
                }

                // Never trust the client's channel filtering — re-check server-side against the
                // same pre-fee amount Satutera will actually receive as `amount` (fase 9, D38).
                $qrisOnlyBelowAmount = (int) config('payments.qris_only_below_amount');

                if ($totalAmount > 0 && $totalAmount < $qrisOnlyBelowAmount && $channel['method'] !== 'qris') {
                    throw ValidationException::withMessages([
                        'payment_channel' => 'Untuk transaksi di bawah Rp'.number_format($qrisOnlyBelowAmount, 0, ',', '.').', hanya QRIS yang tersedia.',
                    ]);
                }

                $paymentFee = $satutera->resolveFee($channel, $totalAmount);
            }

            // D36: `transactions.amount` carries the channel fee on top of the registration total;
            // `rsvps.total_amount` never does — panitia reports/exports must keep reading a number
            // that means "what the registration itself costs", not "what happened to be charged
            // because of the payment method someone picked".
            $transactionAmount = $totalAmount + $paymentFee;

            $transaction = Transaction::create(array_merge([
                'rsvp_id' => $rsvp->id,
                'user_id' => $user->id,
                'amount' => $transactionAmount,
                'payment_fee' => $paymentFee,
                'payment_provider' => $provider,
                'payment_channel' => $validated['payment_channel'] ?? null,
                'status' => 'pending',
            ], $provider === 'satutera' ? [
                // D33: fill both `rsvp_id` (above, untouched — every existing reader keeps working)
                // and `payable_*`, so the shared Satutera webhook router (fase 9, D34) can dispatch
                // this to `RsvpPaymentService` the same way it dispatches store orders to
                // `OrderFulfillmentService`. Manual/iPaymu transactions deliberately do NOT get
                // `payable_*` filled — `GodMode\Payments\Index.tsx` (fase 7c) already treats a
                // non-null `payable` as "this is a store order" for manual-review transactions,
                // and satutera transactions never appear on that manual-review page anyway (it's
                // filtered to `payment_provider = manual`), so this is safe.
                'payable_type' => Rsvp::class,
                'payable_id' => $rsvp->id,
            ] : []));

            // ── Send email notification ───────────────────────────────────
            if ($transactionAmount <= 0) {
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
                    $ipaymu = app(IPaymuService::class);
                    $result = $ipaymu->initiateDirectPayment($transaction, $rsvp, $channel);

                    Log::debug('iPaymu direct payment response', [
                        'transaction_id' => $transaction->id,
                        'channel' => $channel,
                        'result' => $result,
                    ]);

                    $transaction->update([
                        'external_reference' => $result['external_reference'],
                        'va_number' => $result['va_number'],
                        'metadata' => array_merge(
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
            } elseif ($provider === 'satutera') {
                $items = [];

                if ($packageAmount > 0) {
                    $items[] = ['name' => $package->name, 'price' => (int) $packageAmount, 'quantity' => 1];
                }
                if ($infakAmount > 0) {
                    $items[] = ['name' => 'Infak', 'price' => (int) $infakAmount, 'quantity' => 1];
                }
                foreach ($addonSnapshot as $addonRow) {
                    if (($addonRow['total'] ?? 0) > 0) {
                        $items[] = [
                            'name' => $addonRow['name'],
                            'price' => (int) $addonRow['price'],
                            'quantity' => $addonRow['quantity'],
                        ];
                    }
                }
                if (empty($items)) {
                    $items[] = ['name' => "Pendaftaran {$event->title}", 'price' => (int) $totalAmount, 'quantity' => 1];
                }

                // Kept so a later retry (RsvpPaymentService::retryPaymentInitiation, invoked from
                // PaymentPageController@show) can rebuild the exact same create-payment request if
                // Satutera was unreachable/erroring at registration time — mirrors
                // CheckoutService::place()'s `metadata.payment_request` for store orders.
                $transaction->update([
                    'metadata' => array_merge($transaction->metadata ?? [], [
                        'payment_request' => [
                            'channel_provider' => $validated['channel_provider'],
                            'payment_method' => $validated['payment_method'],
                            'payment_channel' => $validated['payment_channel'],
                            'items' => $items,
                        ],
                    ]),
                ]);

                $satuteraInitiator->initiate($transaction, [
                    'client_transaction_id' => "rsvp-{$rsvp->id}",
                    'idempotency_key' => "rsvp-{$rsvp->id}-{$transaction->id}",
                    'provider' => $validated['channel_provider'],
                    'payment_method' => $validated['payment_method'],
                    'payment_channel' => $validated['payment_channel'],
                    'customer' => [
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone_number,
                    ],
                    'items' => $items,
                    'client_redirect' => [
                        'success_url' => route('payment.show', $transaction->payment_hash),
                        'failed_url' => route('payment.show', $transaction->payment_hash),
                        'expired_url' => route('payment.show', $transaction->payment_hash),
                    ],
                    'metadata' => ['rsvp_id' => $rsvp->id, 'event_id' => $event->id],
                ]);
            }

            // Redirect to hash-based payment page
            return redirect('/payment/'.$transaction->payment_hash)
                ->with('success', 'RSVP berhasil! Silakan selesaikan pembayaran.');
        });
    }

    public function edit(Request $request, $id)
    {
        $rsvp = Rsvp::with([
            'event.addons',
            'event.packages.includedAddons',
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
            'custom_form_data' => 'nullable|array',
            'custom_form_data.*' => 'nullable|string|max:1000',
            'included_addon_variants' => 'nullable|array',
            'included_addon_variants.*' => 'nullable|array',
            'included_addon_variants.*.*' => 'nullable|array',
            'included_addon_variants.*.*.*' => 'nullable|string|max:100',
            'purchased_addon_variants' => 'nullable|array',
            'purchased_addon_variants.*' => 'nullable|array',
            'purchased_addon_variants.*.*' => 'nullable|array',
            'purchased_addon_variants.*.*.*' => 'nullable|string|max:100',
            'included_addon_forms' => 'nullable|array',
            'included_addon_forms.*' => 'nullable|array',
            'included_addon_forms.*.*' => 'nullable|array',
            'included_addon_forms.*.*.*' => 'nullable|string|max:255',
            'purchased_addon_forms' => 'nullable|array',
            'purchased_addon_forms.*' => 'nullable|array',
            'purchased_addon_forms.*.*' => 'nullable|array',
            'purchased_addon_forms.*.*.*' => 'nullable|string|max:255',
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
