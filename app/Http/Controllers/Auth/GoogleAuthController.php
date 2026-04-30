<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function callback()
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        // Find existing user by google id or email
        $user = User::where('google_id', $googleUser->id)->orWhere('email', $googleUser->email)->first();

        if ($user) {
            // Update details just in case
            $user->update([
                'google_id' => $googleUser->id,
                'avatar_url' => $googleUser->avatar,
                'name' => $user->name, // retain existing name if already verified? Or update?
            ]);

            Auth::login($user);
            return redirect()->intended('/dashboard');
        }

        // New User -> Push to Temporary Session then Redirect to Onboarding
        session(['onboarding_google_user' => [
            'google_id' => $googleUser->id,
            'name' => $googleUser->name,
            'email' => $googleUser->email,
            'avatar_url' => $googleUser->avatar,
        ]]);

        return redirect()->intended('/onboarding');
    }
}
