<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Actions\InviteStoreMember;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreMember;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StoreMemberController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $this->authorize('manageMembers', $store);

        $store->load('members.user');

        return Inertia::render('Store/Manage/Members', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
        ]);
    }

    public function invite(Request $request, Store $store, InviteStoreMember $action)
    {
        $this->authorize('manageMembers', $store);

        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $action->execute($store, $request->user(), $validated['email']);

        return redirect()->back()->with('success', 'Undangan berhasil dikirim.');
    }

    public function revoke(Request $request, Store $store, StoreMember $member)
    {
        $this->authorize('manageMembers', $store);

        abort_unless($member->store_id === $store->id, 404);

        if ($member->isOwner()) {
            abort(422, 'Owner toko tidak bisa dicabut.');
        }

        $member->update([
            'status' => 'revoked',
            'revoked_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Anggota berhasil dicabut.');
    }

    public function invitationShow(string $token)
    {
        $member = StoreMember::with('store')
            ->where('invitation_token', $token)
            ->where('status', 'invited')
            ->first();

        return Inertia::render('Store/InvitationAccept', [
            'member' => $member,
            'token' => $token,
            'expired' => $member?->isExpired() ?? false,
        ]);
    }

    public function invitationAccept(Request $request, string $token)
    {
        $member = StoreMember::where('invitation_token', $token)
            ->where('status', 'invited')
            ->first();

        if (! $member) {
            throw ValidationException::withMessages(['token' => 'Undangan tidak ditemukan atau sudah digunakan.']);
        }

        if ($member->isExpired()) {
            throw ValidationException::withMessages(['token' => 'Undangan ini sudah kedaluwarsa. Minta owner toko mengirim undangan baru.']);
        }

        if ($member->user_id !== $request->user()->id) {
            abort(403, 'Undangan ini bukan untuk akun kamu.');
        }

        $member->update([
            'status' => 'active',
            'accepted_at' => now(),
        ]);

        return redirect()->route('stores.manage', $member->store_id)
            ->with('success', 'Undangan diterima. Selamat bergabung mengelola toko!');
    }
}
