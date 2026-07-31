<?php

namespace App\Domains\Store\Actions;

use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreBadge;
use App\Domains\Store\Models\StoreBadgeAssignment;
use App\Models\Admin;
use App\Models\AdminActivityLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AssignStoreBadge
{
    public function execute(Store $store, StoreBadge $badge, Admin $admin, ?Carbon $expiresAt = null, ?string $note = null): StoreBadgeAssignment
    {
        return DB::transaction(function () use ($store, $badge, $admin, $expiresAt, $note) {
            $assignment = StoreBadgeAssignment::updateOrCreate(
                ['store_id' => $store->id, 'store_badge_id' => $badge->id],
                [
                    'assigned_by' => $admin->id,
                    'assigned_at' => now(),
                    'expires_at' => $expiresAt,
                    'note' => $note,
                ]
            );

            AdminActivityLog::create([
                'admin_id' => $admin->id,
                'action' => "assign_store_badge:{$store->id}:{$badge->code}",
            ]);

            return $assignment;
        });
    }
}
