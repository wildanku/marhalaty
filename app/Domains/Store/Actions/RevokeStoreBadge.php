<?php

namespace App\Domains\Store\Actions;

use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreBadge;
use App\Models\Admin;
use App\Models\AdminActivityLog;
use Illuminate\Support\Facades\DB;

class RevokeStoreBadge
{
    public function execute(Store $store, StoreBadge $badge, Admin $admin): void
    {
        DB::transaction(function () use ($store, $badge, $admin) {
            $store->badges()->detach($badge->id);

            AdminActivityLog::create([
                'admin_id' => $admin->id,
                'action' => "revoke_store_badge:{$store->id}:{$badge->code}",
            ]);
        });
    }
}
