<?php

namespace App\Domains\GodMode\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\AdminActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (auth('admin')->check()) {
            return redirect()->route('god-mode.dashboard');
        }

        return Inertia::render('GodMode/Auth/Login');
    }

    public function redirectToGoogle()
    {
        return Socialite::driver('google')
            ->redirectUrl(route('god-mode.auth.google.callback'))
            ->stateless()
            ->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        try {
            $googleUser = Socialite::driver('google')
                ->redirectUrl(route('god-mode.auth.google.callback'))
                ->stateless()
                ->user();
        } catch (\Exception $e) {
            return redirect()->route('god-mode.login')->withErrors(['email' => 'Gagal autentikasi dengan Google.']);
        }

        // Check if the admin email exists in the database
        $admin = Admin::where('email', $googleUser->email)->first();

        if (!$admin) {
            // Email not found in admins table, deny access
            return redirect()->route('god-mode.login')->withErrors(['email' => 'Akses ditolak. Email tidak terdaftar sebagai admin.']);
        }

        // Update admin details from Google
        $admin->update([
            'google_id'  => $googleUser->id,
            'name'       => $googleUser->name, // Optional: update name or keep existing
            'avatar_url' => $googleUser->avatar,
        ]);

        // Authenticate the admin
        Auth::guard('admin')->login($admin);
        $request->session()->regenerate();

        // Log the activity
        AdminActivityLog::create([
            'admin_id'   => $admin->id,
            'action'     => 'login_google',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('god-mode.dashboard');
    }

    public function logout(Request $request)
    {
        if (auth('admin')->check()) {
            AdminActivityLog::create([
                'admin_id'   => auth('admin')->id(),
                'action'     => 'logout',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }

        Auth::guard('admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('god-mode.login');
    }
}
