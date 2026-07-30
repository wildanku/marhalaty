<?php

namespace App\Jobs;

use App\Domains\Shared\Services\BrevoApiService;
use App\Domains\Store\Models\StoreOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendStoreOrderPaidEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private StoreOrder $order) {}

    public function handle(BrevoApiService $brevoApi): void
    {
        $this->order->loadMissing(['buyer', 'store', 'items.digitalDeliveries']);
        $buyer = $this->order->buyer;

        if (! $buyer) {
            Log::warning('SendStoreOrderPaidEmail: Missing buyer', ['order_id' => $this->order->id]);

            return;
        }

        $downloadLinks = $this->order->items
            ->flatMap(fn ($item) => $item->digitalDeliveries->map(fn ($delivery) => [
                'name' => $item->name_snapshot,
                'url' => route('store.downloads.show', $delivery->download_token),
            ]))
            ->all();

        $htmlContent = view('emails.store-order-paid', [
            'order' => $this->order,
            'buyer' => $buyer,
            'downloadLinks' => $downloadLinks,
        ])->render();

        $result = $brevoApi->send(
            toEmail: $buyer->email,
            toName: $buyer->name,
            subject: "✅ Pembayaran Diterima – {$this->order->order_number}",
            htmlContent: $htmlContent,
        );

        if (! $result['success']) {
            Log::error('SendStoreOrderPaidEmail: Brevo API error', [
                'order_id' => $this->order->id,
                'error' => $result['error'] ?? 'Unknown error',
            ]);
            throw new \Exception($result['error'] ?? 'Brevo API error');
        }
    }
}
