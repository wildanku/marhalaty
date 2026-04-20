<?php

namespace App\Domains\Alumni\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Illuminate\Database\Eloquent\Builder;

class DirectoryController extends Controller
{
    public function index(Request $request)
    {
        $users = QueryBuilder::for(User::class)
            ->allowedFilters([
                'city',
                'profession',
                'marhalah_year',
                AllowedFilter::callback('search', function (Builder $query, $value) {
                    $query->where('name', 'ILIKE', "%{$value}%")
                          ->orWhere('profession', 'ILIKE', "%{$value}%");
                }),
            ])
            ->where('privacy_setting', '!=', 'private')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Alumni/Index', [
            'users' => $users,
        ]);
    }

    public function show($slug, Request $request)
    {
        $user = User::where('slug', $slug)->firstOrFail();
        $visitor = $request->user();

        // Enforcement of granular privacy
        if ($user->privacy_setting === 'private') {
            abort(403, 'This profile is private.');
        }

        if ($user->privacy_setting === 'circle') {
            if (!$visitor || $visitor->marhalah_year !== $user->marhalah_year) {
                abort(403, 'This profile is limited to alumni from the same Marhalah.');
            }
        }

        // Payload Masking
        if (!$visitor || !$visitor->is_verified) {
            $user->phone_number = null; // Dynamically scrub phone number for this request
        }

        return Inertia::render('Alumni/Show', [
            'alumni' => $user,
        ]);
    }
}
