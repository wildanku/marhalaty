<?php

namespace App\Domains\Store\Actions;

use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreMember;
use App\Jobs\SendStoreInvitationEmail;
use App\Models\Scopes\MarhalahScope;
use App\Models\User;
use App\Models\Admin;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InviteStoreMember
{
    public function execute(Store $store, User|Admin $inviter, string $email): StoreMember
    {
        // MarhalahScope filters users by marhalah_year when COMMUNITY_SCOPE=single. Store
        // membership must be invitable across cohorts, so this lookup deliberately bypasses it.
        $invitee = User::withoutGlobalScope(MarhalahScope::class)
            ->where('email', $email)
            ->first();

        if (! $invitee) {
            throw ValidationException::withMessages([
                'email' => 'Tidak ada user terdaftar dengan email tersebut.',
            ]);
        }

        if (! $invitee->is_verified) {
            throw ValidationException::withMessages([
                'email' => 'User tersebut belum terverifikasi sebagai alumni.',
            ]);
        }

        $alreadyActive = StoreMember::where('store_id', $store->id)
            ->where('user_id', $invitee->id)
            ->where('status', 'active')
            ->exists();

        if ($alreadyActive) {
            throw ValidationException::withMessages([
                'email' => 'User tersebut sudah menjadi anggota aktif toko ini.',
            ]);
        }

        $member = StoreMember::updateOrCreate(
            ['store_id' => $store->id, 'user_id' => $invitee->id],
            [
                'role' => 'admin',
                'status' => 'invited',
                'invited_by_user_id' => $inviter instanceof User ? $inviter->id : null,
                'invitation_token' => Str::random(64),
                'invitation_expires_at' => now()->addDays(7),
                'accepted_at' => null,
                'revoked_at' => null,
            ]
        );

        SendStoreInvitationEmail::dispatch($member->fresh(['store', 'user']));

        return $member;
    }
}
