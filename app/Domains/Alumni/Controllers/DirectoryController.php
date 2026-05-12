<?php

namespace App\Domains\Alumni\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Option;
use App\Models\User;
use App\Domains\Shared\Models\IndonesiaCity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Illuminate\Database\Eloquent\Builder;

class DirectoryController extends Controller
{
    public function index(Request $request)
    {
        $filter = [
            'search' => $request->input('filter.search'),
            'city_id' => $request->input('filter.city_id'),
            'foreign_city' => $request->input('filter.foreign_city'),
            'profession_id' => $request->input('filter.profession_id'),
            'marhalah_year' => $request->input('filter.marhalah_year'),
        ];

        $users = QueryBuilder::for(User::with(['city', 'profession']))
            ->allowedFilters(
                AllowedFilter::exact('city_id'),
                AllowedFilter::exact('profession_id'),
                AllowedFilter::exact('marhalah_year'),
                AllowedFilter::callback('foreign_city', function (Builder $query, $value) {
                    $query->where('foreign_city', 'ILIKE', "%{$value}%");
                }),
                AllowedFilter::callback('search', function (Builder $query, $value) {
                    $query->where('name', 'ILIKE', "%{$value}%")
                          ->orWhereHas('profession', function($q) use ($value) {
                              $q->where('name', 'ILIKE', "%{$value}%");
                          });
                })
            )
            ->where('privacy_setting', '!=', 'private')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        $availableCityIds = User::query()
            ->where('privacy_setting', '!=', 'private')
            ->whereNotNull('city_id')
            ->distinct()
            ->pluck('city_id');

        $cities = IndonesiaCity::query()
            ->whereIn('id', $availableCityIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        $availableProfessionIds = User::query()
            ->where('privacy_setting', '!=', 'private')
            ->whereNotNull('profession_id')
            ->distinct()
            ->pluck('profession_id');

        $professions = Option::query()
            ->whereIn('id', $availableProfessionIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        $marhalahYears = User::query()
            ->where('privacy_setting', '!=', 'private')
            ->whereNotNull('marhalah_year')
            ->distinct()
            ->orderBy('marhalah_year', 'desc')
            ->pluck('marhalah_year');

        return Inertia::render('Alumni/Index', [
            'users' => $users,
            'filters' => $filter,
            'filterOptions' => [
                'cities' => $cities,
                'professions' => $professions,
                'marhalahYears' => $marhalahYears,
            ],
        ]);
    }

    public function show($slug, Request $request)
    {
        $user = User::with(['city', 'profession', 'campus'])->where('slug', $slug)->firstOrFail();
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
