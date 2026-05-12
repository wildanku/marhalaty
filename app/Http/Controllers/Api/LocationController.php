<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use App\Domains\Shared\Models\IndonesiaCity;

class LocationController extends Controller
{
    public function cities(Request $request)
    {
        $search = $request->get('search', '');
        
        $query = IndonesiaCity::with('province');
        
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', '%' . $search . '%')
                  ->orWhereHas('province', function ($provinceQuery) use ($search) {
                      $provinceQuery->where('name', 'ilike', '%' . $search . '%');
                  });
            });
        }

        $cities = $query->limit(50)->get()->map(function ($city) {
            return [
                'id' => $city->id,
                'label' => "{$city->name} - {$city->province->name}",
            ];
        });

        return response()->json($cities);
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
            $query->where('foreign_city', 'ilike', '%' . $search . '%');
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
