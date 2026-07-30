<?php

namespace App\Domains\Store\Actions;

use App\Domains\Store\Models\Store;
use App\Jobs\SendStoreApprovedEmail;
use App\Models\Admin;
use App\Models\AdminActivityLog;
use Illuminate\Support\Facades\DB;

class ApproveStore
{
    public function execute(Store $store, Admin $admin): Store
    {
        DB::transaction(function () use ($store, $admin) {
            $store->update([
                'status' => 'approved',
                'verified_at' => now(),
                'verified_by' => $admin->id,
            ]);

            AdminActivityLog::create([
                'admin_id' => $admin->id,
                'action' => "approve_store:{$store->id}",
            ]);
        });

        SendStoreApprovedEmail::dispatch($store->fresh());

        return $store->fresh();
    }
}
