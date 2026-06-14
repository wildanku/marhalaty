<?php

namespace App\Domains\GodMode\Exports;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\Rsvp;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EventParticipantsExport implements WithMultipleSheets
{
    use Exportable;

    public function __construct(private Event $event, private Collection $rsvps) {}

    public function sheets(): array
    {
        return [
            new ParticipantsSheet($this->event, $this->rsvps),
            new AddonsSheet($this->event, $this->rsvps),
            new InfakSheet($this->event, $this->rsvps),
        ];
    }
}

// ─── Sheet 1: Peserta ────────────────────────────────────────────────────────

class ParticipantsSheet implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    public function __construct(private Event $event, private Collection $rsvps) {}

    private function resolveParticipantDomicile(Rsvp $rsvp): string
    {
        if ($rsvp->is_manual_entry) {
            $cityName = $rsvp->guestCity?->name;
            $provinceName = $rsvp->guestCity?->province?->name;

            if ($cityName && $provinceName) {
                return $cityName.', '.$provinceName;
            }

            if ($cityName) {
                return $cityName;
            }

            if ($rsvp->guest_foreign_city && $rsvp->guest_country) {
                return $rsvp->guest_foreign_city.', '.$rsvp->guest_country;
            }

            if ($rsvp->guest_foreign_city) {
                return $rsvp->guest_foreign_city;
            }

            return $rsvp->guest_country ?? '-';
        }

        $user = $rsvp->user;
        $cityName = $user?->city?->name;
        $provinceName = $user?->city?->province?->name;

        if ($cityName && $provinceName) {
            return $cityName.', '.$provinceName;
        }

        if ($cityName) {
            return $cityName;
        }

        if ($user?->foreign_city && $user?->country) {
            return $user->foreign_city.', '.$user->country;
        }

        if ($user?->foreign_city) {
            return $user->foreign_city;
        }

        return $user?->country ?? '-';
    }

    public function title(): string
    {
        return 'List Peserta';
    }

    public function headings(): array
    {
        $customForms = $this->event->metadata['custom_forms'] ?? [];
        $base = [
            '#', 'Nama', 'Email', 'No. HP', 'Domisili', 'Marhalah', 'Tanggal Daftar',
            'Paket', 'Harga Paket', 'Total Addon', 'Infak', 'Total Bayar',
            'Status RSVP', 'Metode Bayar', 'Channel', 'Status Bayar',
            'Tanggal Bayar', 'Bukti Upload',
        ];
        foreach ($customForms as $field) {
            $base[] = $field['label'] ?? 'Formulir';
        }

        return $base;
    }

    public function collection(): Collection
    {
        $customForms = $this->event->metadata['custom_forms'] ?? [];
        $rows = [];

        foreach ($this->rsvps as $i => $rsvp) {
            $tx = $rsvp->latestTransaction;

            $addonTotal = collect($rsvp->add_ons_snapshot ?? [])
                ->sum(fn ($a) => (float) ($a['total'] ?? 0));

            $row = [
                $i + 1,
                $rsvp->is_manual_entry ? $rsvp->guest_name : (optional($rsvp->user)->name ?? '-'),
                $rsvp->is_manual_entry ? ($rsvp->guest_email ?? '-') : (optional($rsvp->user)->email ?? '-'),
                $rsvp->is_manual_entry ? ($rsvp->guest_phone ?? '-') : (optional($rsvp->user)->phone_number ?? '-'),
                $this->resolveParticipantDomicile($rsvp),
                $rsvp->is_manual_entry ? 'Manual' : (optional($rsvp->user)->marhalah_year ?? '-'),
                $rsvp->created_at->format('d/m/Y H:i'),
                optional($rsvp->package)->name ?? '-',
                (float) $rsvp->package_amount,
                $addonTotal,
                (float) $rsvp->infak_amount,
                (float) $rsvp->total_amount,
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

            $rows[] = $row;
        }

        return collect($rows);
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}

// ─── Sheet 2: Addon ──────────────────────────────────────────────────────────

class AddonsSheet implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    public function __construct(private Event $event, private Collection $rsvps) {}

    private function resolveParticipantDomicile(Rsvp $rsvp): string
    {
        if ($rsvp->is_manual_entry) {
            $cityName = $rsvp->guestCity?->name;
            $provinceName = $rsvp->guestCity?->province?->name;

            if ($cityName && $provinceName) {
                return $cityName.', '.$provinceName;
            }

            if ($cityName) {
                return $cityName;
            }

            if ($rsvp->guest_foreign_city && $rsvp->guest_country) {
                return $rsvp->guest_foreign_city.', '.$rsvp->guest_country;
            }

            if ($rsvp->guest_foreign_city) {
                return $rsvp->guest_foreign_city;
            }

            return $rsvp->guest_country ?? '-';
        }

        $user = $rsvp->user;
        $cityName = $user?->city?->name;
        $provinceName = $user?->city?->province?->name;

        if ($cityName && $provinceName) {
            return $cityName.', '.$provinceName;
        }

        if ($cityName) {
            return $cityName;
        }

        if ($user?->foreign_city && $user?->country) {
            return $user->foreign_city.', '.$user->country;
        }

        if ($user?->foreign_city) {
            return $user->foreign_city;
        }

        return $user?->country ?? '-';
    }

    public function title(): string
    {
        return 'List Addon';
    }

    public function headings(): array
    {
        return [
            '#', 'Nama Peserta', 'Email', 'Domisili', 'Paket', 'Nama Addon', 'Qty',
            'Harga Satuan', 'Total', 'Tipe', 'Varian', 'Status RSVP',
        ];
    }

    public function collection(): Collection
    {
        // Only paid RSVPs
        $paidRsvps = $this->rsvps->where('status', 'paid');

        // Load all packages with their includedAddons for bundled addon detection
        $packageIncludedAddons = [];
        foreach ($paidRsvps as $rsvp) {
            if ($rsvp->package && ! isset($packageIncludedAddons[$rsvp->event_package_id])) {
                $pkg = $rsvp->package->loadMissing('includedAddons');
                $packageIncludedAddons[$rsvp->event_package_id] = $pkg->includedAddons ?? collect();
            }
        }

        $rows = [];
        $idx = 1;

        foreach ($paidRsvps as $rsvp) {
            $snapshot = collect($rsvp->add_ons_snapshot ?? []);
            $snapshotIds = $snapshot->pluck('id')->map(fn ($id) => (int) $id)->toArray();

            // Addons from snapshot
            foreach ($snapshot as $addon) {
                $combinedVars = array_merge(
                    $addon['variants'] ?? [],
                    $addon['variant_slots'] ?? [],
                    $addon['form'] ?? []
                );

                $varStr = '';
                if (! empty($combinedVars)) {
                    $varStr = collect($combinedVars)
                        ->flatMap(fn ($v, $k) => is_array($v)
                            ? collect($v)->map(fn ($vv, $kk) => "{$kk}: {$vv}")
                            : ["{$k}: {$v}"]
                        )
                        ->implode(', ');
                }
                $rows[] = [
                    $idx++,
                    $rsvp->is_manual_entry ? $rsvp->guest_name : (optional($rsvp->user)->name ?? '-'),
                    $rsvp->is_manual_entry ? ($rsvp->guest_email ?? '-') : (optional($rsvp->user)->email ?? '-'),
                    $this->resolveParticipantDomicile($rsvp),
                    optional($rsvp->package)->name ?? '-',
                    $addon['name'] ?? '-',
                    (int) ($addon['quantity'] ?? 1),
                    (float) ($addon['price'] ?? 0),
                    (float) ($addon['total'] ?? 0),
                    isset($addon['is_included']) && $addon['is_included'] ? 'Bundled' : 'Beli',
                    $varStr ?: '-',
                    $rsvp->status,
                ];
            }

            // Bundled addons NOT in snapshot (no variants selected, so not tracked)
            if ($rsvp->event_package_id && isset($packageIncludedAddons[$rsvp->event_package_id])) {
                $included = $packageIncludedAddons[$rsvp->event_package_id];
                foreach ($included as $bundledAddon) {
                    if (in_array($bundledAddon->id, $snapshotIds, true)) {
                        continue; // Already in snapshot
                    }
                    $rows[] = [
                        $idx++,
                        $rsvp->is_manual_entry ? $rsvp->guest_name : (optional($rsvp->user)->name ?? '-'),
                        $rsvp->is_manual_entry ? ($rsvp->guest_email ?? '-') : (optional($rsvp->user)->email ?? '-'),
                        $this->resolveParticipantDomicile($rsvp),
                        optional($rsvp->package)->name ?? '-',
                        $bundledAddon->name,
                        (int) ($bundledAddon->pivot->included_quantity ?? 1),
                        0,
                        0,
                        'Bundled',
                        '-',
                        $rsvp->status,
                    ];
                }
            }
        }

        return collect($rows);
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}

// ─── Sheet 3: Infak ──────────────────────────────────────────────────────────

class InfakSheet implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    public function __construct(private Event $event, private Collection $rsvps) {}

    private function resolveParticipantDomicile(Rsvp $rsvp): string
    {
        $user = $rsvp->user;
        $cityName = $user?->city?->name;
        $provinceName = $user?->city?->province?->name;

        if ($cityName && $provinceName) {
            return $cityName.', '.$provinceName;
        }

        if ($cityName) {
            return $cityName;
        }

        if ($user?->foreign_city && $user?->country) {
            return $user->foreign_city.', '.$user->country;
        }

        if ($user?->foreign_city) {
            return $user->foreign_city;
        }

        return $user?->country ?? '-';
    }

    public function title(): string
    {
        return 'List Donasi Infak';
    }

    public function headings(): array
    {
        return [
            '#', 'Nama Peserta', 'Email', 'No. HP', 'Domisili', 'Marhalah',
            'Paket', 'Jumlah Infak', 'Status RSVP', 'Tanggal Bayar',
        ];
    }

    public function collection(): Collection
    {
        // Only paid RSVPs with infak > 0
        $infakRsvps = $this->rsvps
            ->where('status', 'paid')
            ->filter(fn ($r) => (float) $r->infak_amount > 0);

        $rows = [];
        $idx = 1;

        foreach ($infakRsvps as $rsvp) {
            $tx = $rsvp->latestTransaction;
            $rows[] = [
                $idx++,
                $rsvp->is_manual_entry ? $rsvp->guest_name : (optional($rsvp->user)->name ?? '-'),
                $rsvp->is_manual_entry ? ($rsvp->guest_email ?? '-') : (optional($rsvp->user)->email ?? '-'),
                $rsvp->is_manual_entry ? ($rsvp->guest_phone ?? '-') : (optional($rsvp->user)->phone_number ?? '-'),
                $this->resolveParticipantDomicile($rsvp),
                $rsvp->is_manual_entry ? 'Manual' : (optional($rsvp->user)->marhalah_year ?? '-'),
                optional($rsvp->package)->name ?? '-',
                (float) $rsvp->infak_amount,
                $rsvp->status,
                $tx && $tx->paid_at ? $tx->paid_at->format('d/m/Y H:i') : '-',
            ];
        }

        return collect($rows);
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
