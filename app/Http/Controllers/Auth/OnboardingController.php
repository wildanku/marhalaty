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

        $campuses = \App\Models\Option::where('key', 'campus')->get();
        $professions = \App\Models\Option::where('key', 'profession')->get();

        return Inertia::render('Auth/Onboarding', [
            'googleUser' => $googleUser,
            'communityScope' => config('community.scope'),
            'targetMarhalah' => config('community.target_marhalah'),
            'campuses' => $campuses,
            'professions' => $professions,
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
            'domisili' => 'required|in:indonesia,luar_negeri',
            'city_id' => 'required_if:domisili,indonesia|nullable|string|exists:indonesia_cities,id',
            'foreign_city' => 'required_if:domisili,luar_negeri|nullable|string',
            'campus_id' => 'required|exists:options,id',
            'profession_id' => 'required|exists:options,id',
            'whatsapp' => 'required|string',
            'instagram' => 'nullable|string',
            'tiktok' => 'nullable|string',
            'linkedin' => 'nullable|string',
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
            'country' => $validated['domisili'] === 'indonesia' ? 'Indonesia' : 'Luar Negeri',
            'city_id' => $validated['domisili'] === 'indonesia' ? $validated['city_id'] : null,
            'foreign_city' => $validated['domisili'] === 'luar_negeri' ? $validated['foreign_city'] : null,
            'campus_id' => $validated['campus_id'],
            'profession_id' => $validated['profession_id'],
            'social_media' => [
                'instagram' => $validated['instagram'] ?? null,
                'tiktok' => $validated['tiktok'] ?? null,
                'linkedin' => $validated['linkedin'] ?? null,
            ],
        ]);

        // Clear session and login
        $request->session()->forget('onboarding_google_user');
        Auth::login($user);

        return redirect()->intended('/dashboard');
    }
}
