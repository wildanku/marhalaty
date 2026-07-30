<?php

namespace App\Jobs;

use App\Domains\Event\Models\Transaction;
use App\Domains\Shared\Services\BrevoApiService;
use App\Domains\Store\Models\StoreOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendStoreOrderCreatedEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private StoreOrder $order, private Transaction $transaction) {}

    public function handle(BrevoApiService $brevoApi): void
    {
        $this->order->loadMissing(['buyer', 'store', 'items']);
        $buyer = $this->order->buyer;

        if (! $buyer) {
            Log::warning('SendStoreOrderCreatedEmail: Missing buyer', ['order_id' => $this->order->id]);

            return;
        }

        $htmlContent = view('emails.store-order-created', [
            'order' => $this->order,
            'buyer' => $buyer,
            'paymentUrl' => config('app.url').'/store/payment/'.$this->transaction->payment_hash,
        ])->render();

        $result = $brevoApi->send(
            toEmail: $buyer->email,
            toName: $buyer->name,
            subject: "🧾 Pesanan Dibuat – {$this->order->order_number}",
            htmlContent: $htmlContent,
        );

        if (! $result['success']) {
            Log::error('SendStoreOrderCreatedEmail: Brevo API error', [
                'order_id' => $this->order->id,
                'error' => $result['error'] ?? 'Unknown error',
            ]);
            throw new \Exception($result['error'] ?? 'Brevo API error');
        }
    }
}
