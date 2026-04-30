<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Domains\Event\Models\Rsvp;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::withoutGlobalScopes()
            ->with(['city', 'profession', 'campus'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('verified')) {
            $query->where('is_verified', $request->verified === 'true');
        }

        $users = $query->paginate(20)->withQueryString();

        return Inertia::render('GodMode/Users/Index', [
            'admin'   => auth('admin')->user(),
            'users'   => $users,
            'filters' => $request->only(['search', 'verified']),
        ]);
    }

    public function show($id)
    {
        $user = User::withoutGlobalScopes()
            ->with(['city', 'profession', 'campus'])
            ->findOrFail($id);

        $rsvps = Rsvp::with('event')
            ->where('user_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('GodMode/Users/Show', [
            'admin' => auth('admin')->user(),
            'user'  => $user,
            'rsvps' => $rsvps,
        ]);
    }

    public function toggleVerify($id)
    {
        $user = User::withoutGlobalScopes()->findOrFail($id);
        $user->update(['is_verified' => !$user->is_verified]);

        return back()->with('success', $user->is_verified ? 'User berhasil diverifikasi.' : 'Verifikasi user dicabut.');
    }
}
