<?php

namespace App\Domains\GodMode\Exports;

use App\Domains\Store\Models\StoreOrder;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StoreOrdersExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles
{
    use Exportable;

    /** @param Collection<int, StoreOrder> $orders */
    public function __construct(private Collection $orders) {}

    public function headings(): array
    {
        return [
            '#', 'No. Order', 'Toko', 'Pembeli', 'Email Pembeli', 'Status',
            'Subtotal', 'Ongkir', 'Biaya Layanan', 'Total', 'Kurir', 'No. Resi',
            'Tanggal Dibuat', 'Tanggal Lunas', 'Tanggal Dikirim', 'Tanggal Selesai',
        ];
    }

    public function collection(): Collection
    {
        return $this->orders->values()->map(function (StoreOrder $order, int $i) {
            return [
                $i + 1,
                $order->order_number,
                $order->store?->name ?? '-',
                $order->buyer?->name ?? '-',
                $order->buyer?->email ?? '-',
                $order->status,
                (float) $order->subtotal,
                (float) $order->shipping_cost,
                (float) $order->payment_fee,
                (float) $order->total,
                $order->shipping_courier_name ? "{$order->shipping_courier_name} {$order->shipping_service}" : '-',
                $order->tracking_number ?? '-',
                $order->created_at->format('d/m/Y H:i'),
                $order->paid_at?->format('d/m/Y H:i') ?? '-',
                $order->shipped_at?->format('d/m/Y H:i') ?? '-',
                $order->completed_at?->format('d/m/Y H:i') ?? '-',
            ];
        });
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
