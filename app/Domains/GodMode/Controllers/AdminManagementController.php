<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminManagementController extends Controller
{
    public function index()
    {
        $admins = Admin::orderBy('created_at', 'desc')->get();
        return Inertia::render('GodMode/Admins/Index', [
            'admin'  => auth('admin')->user(),
            'admins' => $admins,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|unique:admins,email',
            'name'  => 'required|string|max:255',
            'role'  => 'required|string|in:superadmin,admin',
        ]);

        Admin::create([
            'email' => $validated['email'],
            'name'  => $validated['name'],
            'role'  => $validated['role'],
        ]);

        return redirect()->back()->with('success', 'Admin berhasil ditambahkan.');
    }

    public function destroy($id)
    {
        $admin = Admin::findOrFail($id);

        if ($admin->id === auth('admin')->id()) {
            return redirect()->back()->withErrors(['error' => 'Anda tidak bisa menghapus diri sendiri.']);
        }

        $admin->delete();

        return redirect()->back()->with('success', 'Admin berhasil dihapus.');
    }
}
