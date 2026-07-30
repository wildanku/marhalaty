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

/**
 * Notifies every active member of a store (owner + admins) that a paid order needs processing.
 */
class SendStoreNewOrderEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private StoreOrder $order) {}

    public function handle(BrevoApiService $brevoApi): void
    {
        $this->order->loadMissing(['store', 'items']);
        $store = $this->order->store;

        if (! $store) {
            Log::warning('SendStoreNewOrderEmail: Missing store', ['order_id' => $this->order->id]);

            return;
        }

        $recipients = $store->members()
            ->where('status', 'active')
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter();

        if ($recipients->isEmpty()) {
            Log::warning('SendStoreNewOrderEmail: No active members to notify', ['store_id' => $store->id]);

            return;
        }

        $htmlContent = view('emails.store-new-order', [
            'order' => $this->order,
            'store' => $store,
        ])->render();

        foreach ($recipients as $recipient) {
            $result = $brevoApi->send(
                toEmail: $recipient->email,
                toName: $recipient->name,
                subject: "🛍️ Pesanan Baru – {$this->order->order_number}",
                htmlContent: $htmlContent,
            );

            if (! $result['success']) {
                Log::error('SendStoreNewOrderEmail: Brevo API error', [
                    'order_id' => $this->order->id,
                    'recipient' => $recipient->email,
                    'error' => $result['error'] ?? 'Unknown error',
                ]);
            }
        }
    }
}
