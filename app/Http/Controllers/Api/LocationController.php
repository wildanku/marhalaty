<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Domains\Shared\Models\IndonesiaCity;

class LocationController extends Controller
{
    public function cities(Request $request)
    {
        $search = $request->get('search', '');
        
        $query = IndonesiaCity::with('province');
        
        if ($search) {
            $query->where('name', 'ilike', '%' . $search . '%');
        }

        $cities = $query->limit(50)->get()->map(function ($city) {
            return [
                'id' => $city->id,
                'label' => "{$city->name} - {$city->province->name}",
            ];
        });

        return response()->json($cities);
    }
}
