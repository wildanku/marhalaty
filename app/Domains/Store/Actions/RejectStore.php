<?php

namespace App\Domains\Store\Actions;

use App\Domains\Store\Models\Store;
use App\Jobs\SendStoreRejectedEmail;
use App\Models\Admin;
use App\Models\AdminActivityLog;
use Illuminate\Support\Facades\DB;

class RejectStore
{
    public function execute(Store $store, Admin $admin, string $reason): Store
    {
        DB::transaction(function () use ($store, $admin, $reason) {
            $store->update([
                'status' => 'rejected',
                'rejection_reason' => $reason,
            ]);

            AdminActivityLog::create([
                'admin_id' => $admin->id,
                'action' => "reject_store:{$store->id}",
            ]);
        });

        SendStoreRejectedEmail::dispatch($store->fresh());

        return $store->fresh();
    }
}
