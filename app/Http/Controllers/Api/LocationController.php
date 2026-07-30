<?php

namespace App\Http\Controllers\Api;

use App\Domains\Shared\Models\IndonesiaCity;
use App\Domains\Shared\Models\IndonesiaDistrict;
use App\Domains\Shared\Models\IndonesiaProvince;
use App\Domains\Shared\Models\IndonesiaVillage;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function provinces(Request $request)
    {
        $search = $request->get('search', '');

        $query = IndonesiaProvince::query();

        if ($search) {
            $query->where('name', 'ilike', '%'.$search.'%');
        }

        $provinces = $query->orderBy('name')->limit(100)->get()->map(fn ($province) => [
            'id' => $province->id,
            'label' => $province->name,
        ]);

        return response()->json($provinces);
    }

    public function cities(Request $request)
    {
        $search = $request->get('search', '');
        $provinceId = $request->get('province_id');

        $query = IndonesiaCity::with('province');

        if ($provinceId) {
            $query->where('province_id', $provinceId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', '%'.$search.'%')
                    ->orWhereHas('province', function ($provinceQuery) use ($search) {
                        $provinceQuery->where('name', 'ilike', '%'.$search.'%');
                    });
            });
        }

        $limit = $provinceId ? 100 : 50;

        $cities = $query->orderBy('name')->limit($limit)->get()->map(function ($city) {
            return [
                'id' => $city->id,
                'label' => "{$city->name} - {$city->province->name}",
            ];
        });

        return response()->json($cities);
    }

    public function districts(Request $request)
    {
        $search = $request->get('search', '');
        $cityId = $request->get('city_id');

        $query = IndonesiaDistrict::query();

        if ($cityId) {
            $query->where('city_id', $cityId);
        }

        if ($search) {
            $query->where('name', 'ilike', '%'.$search.'%');
        }

        $districts = $query->orderBy('name')->limit(100)->get()->map(fn ($district) => [
            'id' => $district->id,
            'label' => $district->name,
        ]);

        return response()->json($districts);
    }

    public function villages(Request $request)
    {
        $search = $request->get('search', '');
        $districtId = $request->get('district_id');

        $query = IndonesiaVillage::query();

        if ($districtId) {
            $query->where('district_id', $districtId);
        }

        if ($search) {
            $query->where('name', 'ilike', '%'.$search.'%');
        }

        $villages = $query->orderBy('name')->limit(100)->get()->map(fn ($village) => [
            'id' => $village->id,
            'label' => $village->name,
            'postal_code' => $village->postal_code,
        ]);

        return response()->json($villages);
    }

    public function foreignCities(Request $request)
    {
        $search = $request->get('search', '');

        $query = User::query()
            ->where('privacy_setting', '!=', 'private')
            ->where(function ($q) {
                $q->whereNull('country')
                    ->orWhere('country', '!=', 'Indonesia');
            })
            ->whereNotNull('foreign_city')
            ->where('foreign_city', '!=', '');

        if ($search) {
            $query->where('foreign_city', 'ilike', '%'.$search.'%');
        }

        $cities = $query
            ->select('foreign_city')
            ->distinct()
            ->orderBy('foreign_city')
            ->limit(50)
            ->get()
            ->map(function ($row) {
                return [
                    'id' => $row->foreign_city,
                    'label' => $row->foreign_city,
                ];
            });

        return response()->json($cities);
    }
}
