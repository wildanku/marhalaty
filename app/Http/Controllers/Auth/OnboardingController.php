<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OnboardingController extends Controller
{
    public function show(Request $request)
    {
        $googleUser = session('onboarding_google_user');

        if (!$googleUser) {
            return redirect('/');
        }

        return Inertia::render('Auth/Onboarding', [
            'googleUser' => $googleUser,
            'communityScope' => config('community.scope'),
            'targetMarhalah' => config('community.target_marhalah'),
        ]);
    }

    public function store(Request $request)
    {
        $googleUser = session('onboarding_google_user');

        if (!$googleUser) {
            return redirect()->route('welcome');
        }

        $validated = $request->validate([
            'marhalah' => 'required|integer',
            'kampus_asal' => 'required|string',
            'whatsapp' => 'required|string',
        ]);

        // Cast marhalah to integer for comparison
        $validated['marhalah'] = (int) $validated['marhalah'];

        // Security check for single marhalah scope
        if (config('community.scope') === 'single' && $validated['marhalah'] !== config('community.target_marhalah.year')) {
            abort(403, 'Invalid Marhalah Year for the current community scope.');
        }

        $user = User::create([
            'name' => $googleUser['name'],
            'email' => $googleUser['email'],
            'google_id' => $googleUser['google_id'],
            'avatar_url' => $googleUser['avatar_url'],
            'marhalah_year' => $validated['marhalah'],
            'phone_number' => $validated['whatsapp'],
            'is_verified' => false,
        ]);

        // Clear session and login
        $request->session()->forget('onboarding_google_user');
        Auth::login($user);

        return redirect()->intended('/dashboard');
    }
}
