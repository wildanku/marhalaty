<?php

namespace App\Domains\GodMode\Exports;

use App\Domains\Event\Models\Transaction;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Models\StoreOrderItem;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Complete store-order workbook. Keeping orders, items, and transactions on separate sheets
 * avoids flattening one order's many items/transaction attempts into an ambiguous single row.
 */
class StoreOrdersExport implements WithMultipleSheets
{
    use Exportable;

    /** @param Collection<int, StoreOrder> $orders */
    public function __construct(private Collection $orders) {}

    public function sheets(): array
    {
        return [
            new StoreOrdersSheet($this->orders),
            new StoreOrderItemsSheet($this->orders),
            new StoreOrderTransactionsSheet($this->orders),
        ];
    }
}

abstract class StoreOrderExportSheet implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    /** @param Collection<int, StoreOrder> $orders */
    public function __construct(protected Collection $orders) {}

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    protected function formatDate(mixed $date): string
    {
        return $date?->format('d/m/Y H:i') ?? '-';
    }

    /** @param array<string, mixed>|null $address */
    protected function formatAddress(?array $address): string
    {
        if (! $address) {
            return '-';
        }

        return collect([
            $address['full_address'] ?? $address['address_line'] ?? null,
            $address['postal_code'] ?? null,
        ])->filter()->implode(', ') ?: '-';
    }

    protected function latestTransaction(StoreOrder $order): ?Transaction
    {
        /** @var Transaction|null $transaction */
        $transaction = $order->transactions->sortByDesc('id')->first();

        return $transaction;
    }
}

class StoreOrdersSheet extends StoreOrderExportSheet
{
    public function title(): string
    {
        return 'Pesanan';
    }

    public function headings(): array
    {
        return [
            '#', 'No. Pesanan', 'Toko', 'Status Pesanan',
            'Pembeli', 'Email Pembeli', 'No. HP Pembeli', 'Catatan Pembeli',
            'Subtotal', 'Ongkir', 'Biaya Layanan', 'Total', 'Total Berat (gram)',
            'Butuh Pengiriman', 'Provider Pengiriman', 'Kurir', 'Layanan', 'Estimasi', 'No. Resi',
            'Penerima', 'No. HP Penerima', 'Alamat Tujuan',
            'Tanggal Dibuat', 'Kedaluwarsa', 'Tanggal Lunas', 'Tanggal Dikirim', 'Tanggal Selesai',
            'Tanggal Dibatalkan', 'Alasan Pembatalan',
            'Provider Pembayaran', 'Channel Pembayaran', 'Status Pembayaran', 'Referensi Transaksi',
        ];
    }

    public function collection(): Collection
    {
        return $this->orders->values()->map(function (StoreOrder $order, int $index): array {
            $transaction = $this->latestTransaction($order);
            $address = $order->shipping_address_snapshot;

            return [
                $index + 1,
                $order->order_number,
                $order->store?->name ?? '-',
                $order->status,
                $order->buyer?->name ?? '-',
                $order->buyer?->email ?? '-',
                $order->buyer?->phone_number ?? '-',
                $order->buyer_note ?? '-',
                (float) $order->subtotal,
                (float) $order->shipping_cost,
                (float) $order->payment_fee,
                (float) $order->total,
                $order->total_weight_grams,
                $order->requires_shipping ? 'Ya' : 'Tidak',
                $order->shipping_provider ?? '-',
                $order->shipping_courier_name ?? '-',
                $order->shipping_service ?? '-',
                $order->shipping_etd ?? '-',
                $order->tracking_number ?? '-',
                $address['recipient_name'] ?? '-',
                $address['phone'] ?? '-',
                $this->formatAddress($address),
                $this->formatDate($order->created_at),
                $this->formatDate($order->expires_at),
                $this->formatDate($order->paid_at),
                $this->formatDate($order->shipped_at),
                $this->formatDate($order->completed_at),
                $this->formatDate($order->cancelled_at),
                $order->cancellation_reason ?? '-',
                $transaction?->payment_provider ?? '-',
                $transaction?->payment_channel ?? '-',
                $transaction?->status ?? '-',
                $transaction?->external_reference ?? '-',
            ];
        });
    }
}

class StoreOrderItemsSheet extends StoreOrderExportSheet
{
    public function title(): string
    {
        return 'Detail Item';
    }

    public function headings(): array
    {
        return [
            '#', 'No. Pesanan', 'Toko', 'Pembeli', 'Status Pesanan',
            'ID Produk', 'Nama Produk', 'SKU', 'Tipe Produk', 'ID Varian', 'Varian',
            'Harga Satuan', 'Qty', 'Berat Satuan (gram)', 'Subtotal Item', 'Catatan Item',
            'Tanggal Pesanan',
        ];
    }

    public function collection(): Collection
    {
        $rows = [];
        $index = 1;

        foreach ($this->orders as $order) {
            foreach ($order->items as $item) {
                $rows[] = $this->itemRow($index++, $order, $item);
            }
        }

        return collect($rows);
    }

    /** @return array<int, string|int|float> */
    private function itemRow(int $index, StoreOrder $order, StoreOrderItem $item): array
    {
        return [
            $index,
            $order->order_number,
            $order->store?->name ?? '-',
            $order->buyer?->name ?? '-',
            $order->status,
            $item->product_id,
            $item->name_snapshot,
            $item->sku_snapshot ?? '-',
            $item->type_snapshot,
            $item->product_variant_id ?? '-',
            $item->variant_label_snapshot ?? '-',
            (float) $item->unit_price,
            $item->quantity,
            $item->weight_grams,
            (float) $item->subtotal,
            $item->note_snapshot ?? '-',
            $this->formatDate($order->created_at),
        ];
    }
}

class StoreOrderTransactionsSheet extends StoreOrderExportSheet
{
    public function title(): string
    {
        return 'Transaksi';
    }

    public function headings(): array
    {
        return [
            '#', 'ID Transaksi', 'No. Pesanan', 'Toko', 'Pembeli', 'Status Pesanan',
            'Provider Pembayaran', 'Channel Pembayaran', 'Status Pembayaran',
            'Nominal Transaksi', 'Biaya Pembayaran', 'Referensi Eksternal', 'Nomor VA',
            'Tanggal Dibuat', 'Tanggal Lunas', 'Kedaluwarsa',
        ];
    }

    public function collection(): Collection
    {
        $rows = [];
        $index = 1;

        foreach ($this->orders as $order) {
            foreach ($order->transactions as $transaction) {
                $rows[] = [
                    $index++,
                    $transaction->id,
                    $order->order_number,
                    $order->store?->name ?? '-',
                    $order->buyer?->name ?? '-',
                    $order->status,
                    $transaction->payment_provider,
                    $transaction->payment_channel ?? '-',
                    $transaction->status,
                    (float) $transaction->amount,
                    (float) $transaction->payment_fee,
                    $transaction->external_reference ?? '-',
                    $transaction->va_number ?? '-',
                    $this->formatDate($transaction->created_at),
                    $this->formatDate($transaction->paid_at),
                    $this->formatDate($transaction->expired_at),
                ];
            }
        }

        return collect($rows);
    }
}
