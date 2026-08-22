<?php

namespace App\Domains\Store\Support;

use App\Domains\Store\Models\Store;
use Illuminate\Http\Request;

class StoreManagementUrl
{
    public static function base(Request $request, Store $store): string
    {
        return $request->routeIs('god-mode.stores.manage.*')
            ? "/god-mode/stores/{$store->id}/manage"
            : "/my/stores/{$store->id}";
    }
}
