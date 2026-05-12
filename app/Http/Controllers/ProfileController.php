<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Option;

class ProfileController extends Controller
{
    public function edit(Request $request)
    {
        $user = $request->user();
        $user->load(['city.province', 'profession', 'campus', 'pendidikanTerakhir']);

        $campuses = Option::where('key', 'campus')->get();
        $professions = Option::where('key', 'profession')->get();
        $educations = Option::where('key', 'education')->get();

        return Inertia::render('Profile/Edit', [
            'user' => $user,
            'campuses' => $campuses,
            'professions' => $professions,
            'educations' => $educations,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'no_stambuk' => 'nullable|string|max:50',
            'pendidikan_terakhir_id' => 'nullable|exists:options,id',
            'domisili' => 'required|in:indonesia,luar_negeri',
            'city_id' => 'required_if:domisili,indonesia|nullable|string|exists:indonesia_cities,id',
            'foreign_city' => 'required_if:domisili,luar_negeri|nullable|string',
            'campus_id' => 'required|exists:options,id',
            'profession_id' => 'required|exists:options,id',
            'whatsapp' => 'required|string',
            'instagram' => 'nullable|string',
            'tiktok' => 'nullable|string',
            'linkedin' => 'nullable|string',
            'privacy_setting' => 'required|in:public,circle,private',
            'business_showcase_url' => 'nullable|url|max:255',
        ]);

        $user->update([
            'no_stambuk' => $validated['no_stambuk'] ?? null,
            'pendidikan_terakhir_id' => $validated['pendidikan_terakhir_id'] ?? null,
            'phone_number' => $validated['whatsapp'],
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
            'privacy_setting' => $validated['privacy_setting'],
            'business_showcase_url' => $validated['business_showcase_url'],
        ]);

        return redirect()->route('profile.edit')->with('status', 'Profile successfully updated!');
    }
}
