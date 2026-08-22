<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\GodMode\Exports\AddonsSheet;
use App\Domains\GodMode\Exports\EventParticipantsExport;
use App\Domains\GodMode\Exports\InfakSheet;
use App\Domains\GodMode\Exports\ParticipantsSheet;
use App\Domains\Shared\Services\HtmlSanitizerService;
use App\Domains\Store\Models\ProductReservation;
use App\Domains\Store\Services\ProductStockService;
use App\Http\Controllers\Controller;
use App\Models\Scopes\MarhalahScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class EventController extends Controller
{
    public function __construct(private readonly HtmlSanitizerService $htmlSanitizer) {}

    public function index(Request $request)
    {
        $events = Event::with('packages')
            ->withCount('rsvps')
            ->withSum([
                'rsvps as total_revenue' => function ($q) {
                    $q->where('status', 'paid');
                },
            ], 'total_amount')
            ->orderBy('event_date', 'asc')
            ->get();

        return Inertia::render('GodMode/Events/Index', [
            'admin' => auth('admin')->user(),
            'events' => $events,
        ]);
    }

    public function show($id)
    {
        $event = Event::with(['addons', 'packages'])->findOrFail($id);

        $rsvps = Rsvp::with(['user:id,name', 'package.includedAddons', 'latestTransaction'])
            ->where('event_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        $manualPendingCount = $rsvps->filter(function ($r) {
            $tx = $r->latestTransaction;

            return $tx && $tx->payment_provider === 'manual' && $tx->status === 'pending';
        })->count();

        $paidRsvps = $rsvps->where('status', 'paid');

        $stats = [
            'total_registrants' => $rsvps->count(),
            'paid_count' => $paidRsvps->count(),
            'pending_count' => $rsvps->where('status', 'pending')->count(),
            'failed_count' => $rsvps->whereIn('status', ['failed', 'expired'])->count(),
            'total_revenue' => $paidRsvps->sum('total_amount'),
            'manual_pending' => $manualPendingCount,
            'total_infak' => $paidRsvps->sum('infak_amount'),
            'infak_count' => $paidRsvps->filter(fn ($r) => (float) $r->infak_amount > 0)->count(),
        ];

        // Package statistics
        $packageStats = $rsvps->whereNotNull('event_package_id')
            ->groupBy('event_package_id')
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'package_id' => $first->event_package_id,
                    'package_name' => optional($first->package)->name ?? 'Unknown',
                    'count' => $group->count(),
                    'paid_count' => $group->where('status', 'paid')->count(),
                    'revenue' => $group->where('status', 'paid')->sum('package_amount'),
                ];
            })->values();

        // Addon statistics — only from PAID RSVPs, including bundled addons not in snapshot
        $addonStats = [];

        foreach ($paidRsvps as $rsvp) {
            $snapshotIds = collect($rsvp->add_ons_snapshot ?? [])->pluck('id')->map(fn ($id) => (int) $id)->toArray();

            // From snapshot (both purchased and included-with-variants)
            foreach (($rsvp->add_ons_snapshot ?? []) as $addon) {
                $key = (int) $addon['id'];
                if (! isset($addonStats[$key])) {
                    $addonStats[$key] = [
                        'addon_id' => $key,
                        'addon_name' => $addon['name'],
                        'count' => 0,
                        'total_qty' => 0,
                        'revenue' => 0,
                    ];
                }
                $addonStats[$key]['count']++;
                $addonStats[$key]['total_qty'] += (int) ($addon['quantity'] ?? 1);
                $addonStats[$key]['revenue'] += (float) ($addon['total'] ?? 0);
            }

            // Bundled addons from package NOT in snapshot (no variant selection needed)
            if ($rsvp->event_package_id && $rsvp->package) {
                foreach ($rsvp->package->includedAddons as $bundledAddon) {
                    if (in_array($bundledAddon->id, $snapshotIds, true)) {
                        continue; // already counted from snapshot
                    }
                    $key = (int) $bundledAddon->id;
                    if (! isset($addonStats[$key])) {
                        $addonStats[$key] = [
                            'addon_id' => $key,
                            'addon_name' => $bundledAddon->name,
                            'count' => 0,
                            'total_qty' => 0,
                            'revenue' => 0,
                        ];
                    }
                    $addonStats[$key]['count']++;
                    $addonStats[$key]['total_qty'] += (int) ($bundledAddon->pivot->included_quantity ?? 1);
                    // revenue stays 0 as it's bundled
                }
            }
        }

        // Notes are stored on RSVP addon snapshots (rather than on the addon catalog) because
        // they belong to one participant's product pickup request. Only product-linked addons
        // can create this key; older/manual rows simply do not appear in this recap.
        $addonNotes = $paidRsvps
            ->flatMap(function (Rsvp $rsvp): array {
                return collect($rsvp->add_ons_snapshot ?? [])
                    ->filter(fn (array $addon): bool => trim((string) ($addon['note'] ?? '')) !== '')
                    ->map(fn (array $addon): array => [
                        'rsvp_id' => $rsvp->id,
                        'participant_name' => $rsvp->is_manual_entry
                            ? ($rsvp->guest_name ?? '—')
                            : ($rsvp->user?->name ?? '—'),
                        'addon_name' => $addon['name'] ?? '—',
                        'note' => $addon['note'],
                    ])
                    ->all();
            })
            ->values()
            ->all();

        return Inertia::render('GodMode/Events/Show', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'stats' => $stats,
            'package_stats' => $packageStats,
            'addon_stats' => array_values($addonStats),
            'addon_notes' => $addonNotes,
            'packages' => $event->packages,
        ]);
    }

    /**
     * API for paginated RSVPs list.
     */
    public function apiRsvps(Request $request, $id)
    {
        $query = Rsvp::with(['user.city.province', 'guestCity.province', 'package.includedAddons', 'latestTransaction.proof'])
            ->where('event_id', $id)
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('LOWER(email) LIKE ?', ["%{$search}%"]);
                })->orWhereRaw('LOWER(guest_name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(guest_email) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->boolean('has_infak')) {
            $query->where('status', 'paid')
                ->where('infak_amount', '>', 0);
        }

        $perPage = $request->input('per_page', 20);
        $paginator = $query->paginate($perPage);

        return response()->json($paginator);
    }

    /**
     * Participant detail page.
     */
    public function participantShow($eventId, $rsvpId)
    {
        $event = Event::findOrFail($eventId);

        $rsvp = Rsvp::with(['user.city.province', 'guestCity.province', 'package', 'latestTransaction.proof'])
            ->where('event_id', $eventId)
            ->findOrFail($rsvpId);

        return Inertia::render('GodMode/Events/Participants/Show', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'rsvp' => $rsvp,
        ]);
    }

    /**
     * Delete a participant RSVP.
     */
    public function participantDestroy($eventId, $rsvpId)
    {
        $event = Event::findOrFail($eventId);
        $rsvp = Rsvp::where('event_id', $eventId)->findOrFail($rsvpId);

        // Delete triggers RsvpObserver::deleted(): decrements package quota if paid, and releases
        // any product reservations this RSVP was holding (docs/plan/mvp2/8-event-product-integration.md).
        $userName = $rsvp->user?->name ?? 'Unknown';
        $rsvp->delete();

        return redirect()->route('god-mode.events.show', $eventId)
            ->with('success', "Peserta $userName berhasil dihapus dari acara.");
    }

    /**
     * Show manual registration page for God Mode.
     */
    public function createManualRegister($id)
    {
        $event = Event::with(['addons', 'packages.includedAddons'])->findOrFail($id);

        return Inertia::render('GodMode/Events/ManualRegister', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'image_url' => $event->getFirstMediaUrl('event-images'),
        ]);
    }

    /**
     * Manual registration for events via God Mode.
     */
    public function manualRegister(Request $request, $id)
    {
        $event = Event::findOrFail($id);

        $validated = $request->validate([
            'guest_name' => 'required|string|max:255',
            'guest_email' => 'nullable|email|max:255',
            'guest_phone' => 'nullable|string|max:255',
            'guest_country' => 'nullable|string|in:Indonesia,Luar Negeri',
            'guest_city_id' => 'nullable|required_if:guest_country,Indonesia|exists:indonesia_cities,id',
            'guest_foreign_city' => 'nullable|required_if:guest_country,Luar Negeri|string|max:255',
            'event_package_id' => 'required|exists:event_packages,id',
            'addons' => 'nullable|array',
            'addons.*.id' => 'required|exists:event_addons,id',
            'addons.*.quantity' => 'required|integer|min:1',
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
            'infak_amount' => 'nullable|numeric|min:0',
            'manual_entry_note' => 'nullable|string',
        ]);

        $package = $event->packages()->findOrFail($validated['event_package_id']);

        $addOnsSnapshot = [];
        $totalAddOnsAmount = 0;

        if (! empty($validated['addons'])) {
            $purchasedAddonVariants = $validated['purchased_addon_variants'] ?? [];
            $purchasedAddonForms = $validated['purchased_addon_forms'] ?? [];

            foreach ($validated['addons'] as $addonReq) {
                $addon = $event->addons()->find($addonReq['id']);
                if ($addon) {
                    $qty = (int) $addonReq['quantity'];
                    $amount = $addon->price * $qty;

                    if ($addon->stock_quantity < $qty) {
                        return redirect()->back()->withErrors(['addons' => "Not enough stock for {$addon->name}."])->withInput();
                    }

                    $addOnsSnapshot[] = [
                        'id' => $addon->id,
                        'name' => $addon->name,
                        'price' => $addon->price,
                        'quantity' => $qty,
                        'variant_slots' => $purchasedAddonVariants[$addon->id] ?? null,
                        'form' => $purchasedAddonForms[$addon->id] ?? null,
                        'total' => $amount,
                    ];
                    $totalAddOnsAmount += $amount;

                    $addon->decrement('stock_quantity', $qty);
                }
            }
        }

        // Handle included addon variant selections (no charge, no stock decrement)
        $includedAddonVariants = $validated['included_addon_variants'] ?? [];
        $includedAddonForms = $validated['included_addon_forms'] ?? [];
        $includedAddonIds = array_unique(array_merge(array_keys($includedAddonVariants), array_keys($includedAddonForms)));

        if (! empty($includedAddonIds) && ! empty($validated['event_package_id'])) {
            $packageWithAddons = $event->packages()->with('includedAddons')->find($validated['event_package_id']);

            foreach ($includedAddonIds as $addonId) {
                $includedAddon = $packageWithAddons?->includedAddons?->firstWhere('id', $addonId);
                if (! $includedAddon) {
                    continue;
                }

                $addOnsSnapshot[] = [
                    'id' => (int) $addonId,
                    'name' => $includedAddon->name,
                    'price' => 0,
                    'quantity' => $includedAddon->pivot->included_quantity,
                    'variants' => $includedAddonVariants[$addonId] ?? null,
                    'form' => $includedAddonForms[$addonId] ?? null,
                    'total' => 0,
                    'is_included' => true,
                ];
            }
        }

        $baseAmount = $package->price;
        $infakAmount = $validated['infak_amount'] ?? 0;
        $totalAmount = $baseAmount + $totalAddOnsAmount + $infakAmount;

        DB::transaction(function () use ($event, $package, $validated, $baseAmount, $infakAmount, $totalAmount, $addOnsSnapshot) {
            $rsvp = Rsvp::create([
                'event_id' => $event->id,
                'user_id' => null, // Manual entry has no user account
                'event_package_id' => $package->id,
                'package_amount' => $baseAmount,
                'infak_amount' => $infakAmount,
                'total_amount' => $totalAmount,
                'status' => 'paid', // Immediately paid
                'add_ons_snapshot' => empty($addOnsSnapshot) ? null : $addOnsSnapshot,
                'custom_form_data' => $validated['custom_form_data'] ?? null,
                'is_manual_entry' => true,
                'guest_name' => $validated['guest_name'],
                'guest_email' => $validated['guest_email'] ?? null,
                'guest_phone' => $validated['guest_phone'] ?? null,
                'guest_country' => $validated['guest_country'] ?? null,
                'guest_city_id' => $validated['guest_city_id'] ?? null,
                'guest_foreign_city' => $validated['guest_foreign_city'] ?? null,
                'manual_entry_note' => $validated['manual_entry_note'] ?? null,
                'admin_id' => auth('admin')->id(),
            ]);

            Transaction::create([
                'rsvp_id' => $rsvp->id,
                'user_id' => null,
                'amount' => $totalAmount,
                'payment_provider' => 'admin_manual',
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            $package->incrementBooked();
        });

        return redirect()->route('god-mode.events.show', $event->id)
            ->with('success', "Peserta {$validated['guest_name']} berhasil didaftarkan secara manual.");
    }

    /**
     * Export participants, addons, and infak to Excel (3 sheets).
     */
    public function exportExcel($id)
    {
        $event = Event::with(['addons', 'packages'])->findOrFail($id);

        $rsvps = Rsvp::with(['user.city.province', 'guestCity.province', 'package.includedAddons', 'latestTransaction.proof'])
            ->where('event_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        $filename = 'peserta-'.Str::slug($event->title).'-'.now()->format('Ymd').'.xlsx';

        return Excel::download(new EventParticipantsExport($event, $rsvps), $filename);
    }

    /**
     * Export participants, addons, or infak to CSV.
     */
    public function exportCsv($id, $type)
    {
        // Force autoload of the file containing the sheet classes
        class_exists(EventParticipantsExport::class);

        $event = Event::with(['addons', 'packages'])->findOrFail($id);

        $rsvps = Rsvp::with(['user.city.province', 'guestCity.province', 'package.includedAddons', 'latestTransaction.proof'])
            ->where('event_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        $filename = 'peserta-'.Str::slug($event->title).'-'.$type.'-'.now()->format('Ymd').'.csv';

        if ($type === 'peserta') {
            return Excel::download(new ParticipantsSheet($event, $rsvps), $filename, \Maatwebsite\Excel\Excel::CSV);
        } elseif ($type === 'addon') {
            return Excel::download(new AddonsSheet($event, $rsvps), $filename, \Maatwebsite\Excel\Excel::CSV);
        } elseif ($type === 'infak') {
            return Excel::download(new InfakSheet($event, $rsvps), $filename, \Maatwebsite\Excel\Excel::CSV);
        }

        abort(404);
    }

    public function create()
    {
        return Inertia::render('GodMode/Events/Create', [
            'admin' => auth('admin')->user(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:events,slug',
            'description' => 'required|string',
            'location' => 'required|string',
            'event_date' => 'required|date',
            'visibility_scope' => 'nullable|string',
            'infak_rules' => 'nullable|string',
            'metadata' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
        ]);

        // Same normalize-then-recheck pattern as update() — empty slug falls through to the
        // model's own HasSlug generation from `title` (getSlugOptions() only skips regeneration
        // on *update*, so create-time generation still happens automatically).
        if (! empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['slug']);

            if (Event::where('slug', $validated['slug'])->exists()) {
                return back()->withErrors(['slug' => 'Slug sudah digunakan oleh event lain.']);
            }
        }

        $infakRules = ! empty($validated['infak_rules']) ? json_decode($validated['infak_rules'], true) : null;
        $metadata = ! empty($validated['metadata']) ? json_decode($validated['metadata'], true) : null;

        $event = Event::create([
            'title' => $validated['title'],
            'slug' => $validated['slug'] ?? null,
            // description is rendered raw via dangerouslySetInnerHTML on the public Event page,
            // so it must go through the same HTMLPurifier allow-list as Store product descriptions
            // (RichTextEditor's toolbar is kept in lockstep with this allow-list).
            'description' => $this->htmlSanitizer->sanitize($validated['description']) ?? '',
            'location' => $validated['location'],
            'event_date' => $validated['event_date'],
            'visibility_scope' => $validated['visibility_scope'] ?? null,
            'infak_rules' => $infakRules,
            'metadata' => $metadata,
            'is_registration_enabled' => true,
        ]);

        if ($request->hasFile('image')) {
            $event->addMediaFromRequest('image')->toMediaCollection('event-images');
        }

        return redirect()->route('god-mode.events.show', $event->id)
            ->with('success', 'Event berhasil dibuat.');
    }

    public function edit($id)
    {
        $event = Event::findOrFail($id);

        return Inertia::render('GodMode/Events/Edit', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'current_image_url' => $event->getFirstMediaUrl('event-images'),
        ]);
    }

    public function update(Request $request, $id)
    {
        $event = Event::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:events,slug,'.$event->id,
            'description' => 'required|string',
            'location' => 'required|string',
            'event_date' => 'required|date',
            'visibility_scope' => 'nullable|string',
            'infak_rules' => 'nullable|string',
            'metadata' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
            'is_registration_enabled' => 'boolean',
        ]);

        // Normalize slug: lowercase, replace spaces with hyphens, remove special chars
        $validated['slug'] = Str::slug($validated['slug']);

        // Re-validate slug uniqueness after normalization
        $slugExists = Event::where('slug', $validated['slug'])
            ->where('id', '!=', $event->id)
            ->exists();

        if ($slugExists) {
            return back()->withErrors(['slug' => 'Slug sudah digunakan oleh event lain.']);
        }

        // Decode JSON fields if provided as strings
        $infakRules = $validated['infak_rules'] ? json_decode($validated['infak_rules'], true) : null;
        $metadata = $validated['metadata'] ? json_decode($validated['metadata'], true) : null;

        $event->update([
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'description' => $this->htmlSanitizer->sanitize($validated['description']) ?? '',
            'location' => $validated['location'],
            'event_date' => $validated['event_date'],
            'visibility_scope' => $validated['visibility_scope'],
            'infak_rules' => $infakRules,
            'metadata' => $metadata,
            'is_registration_enabled' => $validated['is_registration_enabled'] ?? true,
        ]);

        if ($request->hasFile('image')) {
            $event->clearMediaCollection('event-images');
            $event->addMediaFromRequest('image')->toMediaCollection('event-images');
        }

        // Flash message for successful update
        $request->session()->flash('success', 'Event updated successfully.');

    }

    public function toggleRegistration(Request $request, $id)
    {
        $event = Event::findOrFail($id);

        $validated = $request->validate([
            'is_registration_enabled' => 'required|boolean',
        ]);

        $event->update([
            'is_registration_enabled' => $validated['is_registration_enabled'],
        ]);

        return back()->with('success', 'Status pendaftaran event berhasil diubah.');
    }

    /**
     * "Barang yang harus disiapkan" recap (docs/plan/mvp2/8-event-product-integration.md §5.3) —
     * every product-linked addon reservation for this event, grouped by product/variant so an
     * admin (or the seller, via StoreEventReservationController's sibling endpoint) can answer
     * "how many size-L shirts do I need to bring" with one glance instead of parsing every RSVP's
     * add_ons_snapshot JSON.
     */
    public function apiProductReservations($eventId)
    {
        $event = Event::findOrFail($eventId);

        $addonIds = EventAddon::where('event_id', $event->id)
            ->where('stock_source', 'product')
            ->pluck('id');

        $reservations = ProductReservation::with(['product.store', 'variant'])
            ->whereIn('event_addon_id', $addonIds)
            ->get();

        // reservable_type is always Rsvp today (D27) — resolved as one extra query rather than
        // eager-loading through the polymorphic `reservable` relation, so the MarhalahScope on
        // User (README §7 risk) can be dropped explicitly instead of silently hiding participants
        // outside the pilot cohort from this recap.
        $rsvpIds = $reservations->pluck('reservable_id')->unique()->all();
        $rsvps = Rsvp::withoutGlobalScope(MarhalahScope::class)
            ->with(['user' => fn ($q) => $q->withoutGlobalScope(MarhalahScope::class)])
            ->whereIn('id', $rsvpIds)
            ->get()
            ->keyBy(fn ($rsvp) => (string) $rsvp->id);

        $rows = $reservations
            ->groupBy(fn ($r) => $r->product_id.'|'.($r->product_variant_id ?? 'none'))
            ->map(function ($group) use ($rsvps) {
                $first = $group->first();

                $reservedRows = $group->where('status', 'reserved');
                $pending = $reservedRows->filter(fn ($r) => ($rsvps->get($r->reservable_id)?->status) !== 'paid')->sum('quantity');
                $paid = $reservedRows->filter(fn ($r) => ($rsvps->get($r->reservable_id)?->status) === 'paid')->sum('quantity');
                $fulfilled = $group->where('status', 'fulfilled')->sum('quantity');

                return [
                    'product_id' => $first->product_id,
                    'product_name' => $first->product?->name,
                    'store_name' => $first->product?->store?->name,
                    'variant_label' => $first->variant?->label,
                    'pending' => $pending,
                    'paid' => $paid,
                    'fulfilled' => $fulfilled,
                    'items' => $reservedRows->values()->map(fn ($r) => [
                        'id' => $r->id,
                        'quantity' => $r->quantity,
                        'participant_name' => $rsvps->get($r->reservable_id)?->display_name,
                        'rsvp_status' => $rsvps->get($r->reservable_id)?->status,
                    ]),
                ];
            })
            ->values();

        return response()->json($rows);
    }

    /**
     * Mark one reservation as handed over at the event. Per-reservation rather than bulk — the
     * doc allows either, this is the minimum that makes the recap meaningful after the event.
     */
    public function fulfillProductReservation(ProductStockService $productStock, $eventId, $reservationId)
    {
        $addonIds = EventAddon::where('event_id', $eventId)->pluck('id');

        $reservation = ProductReservation::whereIn('event_addon_id', $addonIds)->findOrFail($reservationId);

        $productStock->fulfill($reservation);

        return back()->with('success', 'Item ditandai sudah diserahkan.');
    }
}
