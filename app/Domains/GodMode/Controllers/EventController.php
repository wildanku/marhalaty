<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\GodMode\Exports\EventParticipantsExport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $events = Event::with('packages')
            ->withCount('rsvps')
            ->withSum([
                'rsvps as total_revenue' => function ($q) {
                    $q->where('status', 'paid');
                }
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

        $rsvps = Rsvp::with(['package.includedAddons', 'latestTransaction'])
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
            'infak_count' => $paidRsvps->filter(fn($r) => (float) $r->infak_amount > 0)->count(),
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
            $snapshotIds = collect($rsvp->add_ons_snapshot ?? [])->pluck('id')->map(fn($id) => (int) $id)->toArray();

            // From snapshot (both purchased and included-with-variants)
            foreach (($rsvp->add_ons_snapshot ?? []) as $addon) {
                $key = (int) $addon['id'];
                if (!isset($addonStats[$key])) {
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
                    if (!isset($addonStats[$key])) {
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

        return Inertia::render('GodMode/Events/Show', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'stats' => $stats,
            'package_stats' => $packageStats,
            'addon_stats' => array_values($addonStats),
            'packages' => $event->packages,
        ]);
    }

    /**
     * API for paginated RSVPs list.
     */
    public function apiRsvps(Request $request, $id)
    {
        $query = Rsvp::with(['user.city.province', 'package.includedAddons', 'latestTransaction.proof'])
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

        $rsvp = Rsvp::with(['user.city.province', 'package', 'latestTransaction.proof'])
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

        // Delete will trigger the observer to decrement package quota if paid
        $userName = $rsvp->user?->name ?? 'Unknown';
        $rsvp->delete();

        return redirect()->route('god-mode.events.show', $eventId)
            ->with('success', "Peserta $userName berhasil dihapus dari acara.");
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
            'event_package_id' => 'required|exists:event_packages,id',
            'add_ons' => 'nullable|array',
            'add_ons.*.id' => 'required|exists:event_addons,id',
            'add_ons.*.quantity' => 'required|integer|min:1',
            'add_ons.*.variant_slots' => 'nullable|array',
            'add_ons.*.form' => 'nullable|array',
            'manual_entry_note' => 'nullable|string',
        ]);

        $package = $event->packages()->findOrFail($validated['event_package_id']);
        
        $addOnsSnapshot = [];
        $totalAddOnsAmount = 0;

        if (!empty($validated['add_ons'])) {
            foreach ($validated['add_ons'] as $addonReq) {
                $addon = $event->addons()->find($addonReq['id']);
                if ($addon) {
                    $qty = (int) $addonReq['quantity'];
                    $amount = $addon->price * $qty;
                    $addOnsSnapshot[] = [
                        'id' => $addon->id,
                        'name' => $addon->name,
                        'price' => $addon->price,
                        'quantity' => $qty,
                        'variant_slots' => $addonReq['variant_slots'] ?? null,
                        'form' => $addonReq['form'] ?? null,
                        'total' => $amount,
                    ];
                    $totalAddOnsAmount += $amount;
                    
                    if ($addon->stock_quantity >= $qty) {
                        $addon->decrement('stock_quantity', $qty);
                    }
                }
            }
        }

        $baseAmount = $package->price;
        $totalAmount = $baseAmount + $totalAddOnsAmount;

        DB::transaction(function () use ($event, $package, $validated, $baseAmount, $totalAmount, $addOnsSnapshot) {
            $rsvp = Rsvp::create([
                'event_id' => $event->id,
                'user_id' => null, // Manual entry has no user account
                'event_package_id' => $package->id,
                'package_amount' => $baseAmount,
                'infak_amount' => 0,
                'total_amount' => $totalAmount,
                'status' => 'paid', // Immediately paid
                'add_ons_snapshot' => $addOnsSnapshot,
                'is_manual_entry' => true,
                'guest_name' => $validated['guest_name'],
                'guest_email' => $validated['guest_email'] ?? null,
                'guest_phone' => $validated['guest_phone'] ?? null,
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

        $rsvps = Rsvp::with(['user.city.province', 'package.includedAddons', 'latestTransaction.proof'])
            ->where('event_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        $filename = 'peserta-' . Str::slug($event->title) . '-' . now()->format('Ymd') . '.xlsx';

        return Excel::download(new EventParticipantsExport($event, $rsvps), $filename);
    }

    /**
     * Export participants, addons, or infak to CSV.
     */
    public function exportCsv($id, $type)
    {
        // Force autoload of the file containing the sheet classes
        class_exists(\App\Domains\GodMode\Exports\EventParticipantsExport::class);

        $event = Event::with(['addons', 'packages'])->findOrFail($id);

        $rsvps = Rsvp::with(['user.city.province', 'package.includedAddons', 'latestTransaction.proof'])
            ->where('event_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        $filename = 'peserta-' . Str::slug($event->title) . '-' . $type . '-' . now()->format('Ymd') . '.csv';

        if ($type === 'peserta') {
            return Excel::download(new \App\Domains\GodMode\Exports\ParticipantsSheet($event, $rsvps), $filename, \Maatwebsite\Excel\Excel::CSV);
        } elseif ($type === 'addon') {
            return Excel::download(new \App\Domains\GodMode\Exports\AddonsSheet($event, $rsvps), $filename, \Maatwebsite\Excel\Excel::CSV);
        } elseif ($type === 'infak') {
            return Excel::download(new \App\Domains\GodMode\Exports\InfakSheet($event, $rsvps), $filename, \Maatwebsite\Excel\Excel::CSV);
        }

        abort(404);
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
            'slug' => 'required|string|max:255|unique:events,slug,' . $event->id,
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
            'description' => $validated['description'],
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
}
