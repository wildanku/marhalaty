<?php

namespace App\Jobs;

use App\Domains\Shared\Services\BrevoApiService;
use App\Domains\Store\Models\StoreMember;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendStoreInvitationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private StoreMember $member) {}

    public function handle(BrevoApiService $brevoApi): void
    {
        $this->member->loadMissing(['store', 'user']);
        $store = $this->member->store;
        $invitee = $this->member->user;

        if (! $store || ! $invitee) {
            Log::warning('SendStoreInvitationEmail: Missing store or user', ['member_id' => $this->member->id]);

            return;
        }

        $htmlContent = view('emails.store-invitation', [
            'store' => $store,
            'invitee' => $invitee,
            'acceptUrl' => config('app.url').'/store-invitations/'.$this->member->invitation_token,
        ])->render();

        $result = $brevoApi->send(
            toEmail: $invitee->email,
            toName: $invitee->name,
            subject: "Undangan Mengelola Toko \"{$store->name}\"",
            htmlContent: $htmlContent,
        );

        if (! $result['success']) {
            Log::error('SendStoreInvitationEmail: Brevo API error', [
                'member_id' => $this->member->id,
                'error' => $result['error'] ?? 'Unknown error',
            ]);
            throw new \Exception($result['error'] ?? 'Brevo API error');
        }
    }
}
