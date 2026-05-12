<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\Rsvp;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $events = Event::with('packages')
            ->withCount('rsvps')
            ->withSum(['rsvps as total_revenue' => function ($q) {
                $q->where('status', 'paid');
            }], 'total_amount')
            ->orderBy('event_date', 'asc')
            ->get();

        return Inertia::render('GodMode/Events/Index', [
            'admin'  => auth('admin')->user(),
            'events' => $events,
        ]);
    }

    public function show($id)
    {
        $event = Event::with(['addons', 'packages'])->findOrFail($id);

        $rsvps = Rsvp::with(['user', 'package', 'latestTransaction.proof'])
            ->where('event_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        $manualPendingCount = $rsvps->filter(function ($r) {
            $tx = $r->latestTransaction;
            return $tx && $tx->payment_provider === 'manual' && $tx->status === 'pending';
        })->count();

        $stats = [
            'total_registrants' => $rsvps->count(),
            'paid_count'        => $rsvps->where('status', 'paid')->count(),
            'pending_count'     => $rsvps->where('status', 'pending')->count(),
            'failed_count'      => $rsvps->whereIn('status', ['failed', 'expired'])->count(),
            'total_revenue'     => $rsvps->where('status', 'paid')->sum('total_amount'),
            'manual_pending'    => $manualPendingCount,
        ];

        // Package statistics
        $packageStats = $rsvps->whereNotNull('event_package_id')
            ->groupBy('event_package_id')
            ->map(function ($group) {
                $first = $group->first();
                return [
                    'package_id'   => $first->event_package_id,
                    'package_name' => optional($first->package)->name ?? 'Unknown',
                    'count'        => $group->count(),
                    'paid_count'   => $group->where('status', 'paid')->count(),
                    'revenue'      => $group->where('status', 'paid')->sum('package_amount'),
                ];
            })->values();

        // Addon statistics from snapshots
        $addonStats = [];
        foreach ($rsvps as $rsvp) {
            foreach (($rsvp->add_ons_snapshot ?? []) as $addon) {
                $key = $addon['id'];
                if (!isset($addonStats[$key])) {
                    $addonStats[$key] = [
                        'addon_id'   => $addon['id'],
                        'addon_name' => $addon['name'],
                        'count'      => 0,
                        'total_qty'  => 0,
                        'revenue'    => 0,
                    ];
                }
                $addonStats[$key]['count']++;
                $addonStats[$key]['total_qty'] += (int) ($addon['quantity'] ?? 1);
                $addonStats[$key]['revenue'] += $rsvp->status === 'paid' ? (float) ($addon['total'] ?? 0) : 0;
            }
        }

        return Inertia::render('GodMode/Events/Show', [
            'admin'         => auth('admin')->user(),
            'event'         => $event,
            'rsvps'         => $rsvps,
            'stats'         => $stats,
            'package_stats' => $packageStats,
            'addon_stats'   => array_values($addonStats),
        ]);
    }

    /**
     * Participant detail page.
     */
    public function participantShow($eventId, $rsvpId)
    {
        $event = Event::findOrFail($eventId);

        $rsvp = Rsvp::with(['user', 'package', 'latestTransaction.proof'])
            ->where('event_id', $eventId)
            ->findOrFail($rsvpId);

        return Inertia::render('GodMode/Events/Participants/Show', [
            'admin' => auth('admin')->user(),
            'event' => $event,
            'rsvp'  => $rsvp,
        ]);
    }

    /**
     * Export participants to CSV.
     */
    public function exportCsv($id)
    {
        $event = Event::findOrFail($id);

        $rsvps = Rsvp::with(['user', 'package', 'latestTransaction.proof'])
            ->where('event_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        $filename = 'peserta-' . Str::slug($event->title) . '-' . now()->format('Ymd') . '.csv';

        $streamHeaders = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-store, no-cache',
        ];

        $customForms = $event->metadata['custom_forms'] ?? [];

        $callback = function () use ($rsvps, $customForms) {
            $handle = fopen('php://output', 'w');
            // UTF-8 BOM for Excel
            fputs($handle, "\xEF\xBB\xBF");

            $headers = [
                '#', 'Nama', 'Email', 'Marhalah', 'Tanggal Daftar',
                'Paket', 'Harga Paket', 'Addon', 'Infak', 'Total',
                'Status RSVP', 'Metode Bayar', 'Channel', 'Status Bayar',
                'Tanggal Bayar', 'Bukti Upload',
            ];
            foreach ($customForms as $field) {
                $headers[] = $field['label'] ?? 'Formulir';
            }
            fputcsv($handle, $headers);

            foreach ($rsvps as $i => $rsvp) {
                $tx = $rsvp->latestTransaction;

                $addons = collect($rsvp->add_ons_snapshot ?? [])->map(function ($a) {
                    $varStr = '';
                    if (!empty($a['variants'])) {
                        $varStr = ' (' . collect($a['variants'])
                            ->map(fn($v, $k) => "{$k}: {$v}")
                            ->implode(', ') . ')';
                    }
                    return "{$a['name']}{$varStr} x{$a['quantity']}";
                })->implode(' | ');

                $row = [
                    $i + 1,
                    optional($rsvp->user)->name ?? '-',
                    optional($rsvp->user)->email ?? '-',
                    optional($rsvp->user)->marhalah_year ?? '-',
                    $rsvp->created_at->format('d/m/Y H:i'),
                    optional($rsvp->package)->name ?? '-',
                    number_format((float) $rsvp->package_amount, 0, ',', '.'),
                    $addons,
                    number_format((float) $rsvp->infak_amount, 0, ',', '.'),
                    number_format((float) $rsvp->total_amount, 0, ',', '.'),
                    $rsvp->status,
                    $tx ? $tx->payment_provider : '-',
                    $tx ? ($tx->payment_channel ?? '-') : '-',
                    $tx ? $tx->status : '-',
                    $tx && $tx->paid_at ? $tx->paid_at->format('d/m/Y H:i') : '-',
                    ($tx && $tx->proof) ? 'Ya' : 'Tidak',
                ];

                foreach ($customForms as $field) {
                    $fieldKey = $field['id'] ?? '';
                    $row[] = $rsvp->custom_form_data[$fieldKey] ?? '';
                }

                fputcsv($handle, $row);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $streamHeaders);
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
        ]);

        if ($request->hasFile('image')) {
            $event->clearMediaCollection('event-images');
            $event->addMediaFromRequest('image')->toMediaCollection('event-images');
        }

        // Flash message for successful update
        $request->session()->flash('success', 'Event updated successfully.');

        return redirect()->route('god-mode.events.show', $event->id);
    }
}
