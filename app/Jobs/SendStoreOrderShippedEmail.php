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

class SendStoreOrderShippedEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private StoreOrder $order) {}

    public function handle(BrevoApiService $brevoApi): void
    {
        $this->order->loadMissing(['buyer', 'store']);
        $buyer = $this->order->buyer;

        if (! $buyer) {
            Log::warning('SendStoreOrderShippedEmail: Missing buyer', ['order_id' => $this->order->id]);

            return;
        }

        $htmlContent = view('emails.store-order-shipped', [
            'order' => $this->order,
            'buyer' => $buyer,
        ])->render();

        $result = $brevoApi->send(
            toEmail: $buyer->email,
            toName: $buyer->name,
            subject: "📦 Pesanan Dikirim – {$this->order->order_number}",
            htmlContent: $htmlContent,
        );

        if (! $result['success']) {
            Log::error('SendStoreOrderShippedEmail: Brevo API error', [
                'order_id' => $this->order->id,
                'error' => $result['error'] ?? 'Unknown error',
            ]);
            throw new \Exception($result['error'] ?? 'Brevo API error');
        }
    }
}
