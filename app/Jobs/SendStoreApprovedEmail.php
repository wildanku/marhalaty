<?php

namespace App\Jobs;

use App\Domains\Shared\Services\BrevoApiService;
use App\Domains\Store\Models\Store;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendStoreApprovedEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private Store $store) {}

    public function handle(BrevoApiService $brevoApi): void
    {
        $this->store->loadMissing('owner');
        $owner = $this->store->owner;

        if (! $owner) {
            Log::warning('SendStoreApprovedEmail: Missing owner', ['store_id' => $this->store->id]);

            return;
        }

        $htmlContent = view('emails.store-approved', [
            'store' => $this->store,
            'owner' => $owner,
        ])->render();

        $result = $brevoApi->send(
            toEmail: $owner->email,
            toName: $owner->name,
            subject: "✅ Toko \"{$this->store->name}\" Disetujui",
            htmlContent: $htmlContent,
        );

        if (! $result['success']) {
            Log::error('SendStoreApprovedEmail: Brevo API error', [
                'store_id' => $this->store->id,
                'error' => $result['error'] ?? 'Unknown error',
            ]);
            throw new \Exception($result['error'] ?? 'Brevo API error');
        }
    }
}
