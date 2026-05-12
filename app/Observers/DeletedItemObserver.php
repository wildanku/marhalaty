<?php

namespace App\Observers;

use App\Models\DeletedItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * DeletedItemObserver
 * 
 * Automatically tracks all deleted models by storing their data
 * in the deleted_items table before they are removed from the database.
 * 
 * Apply to models with: protected $observables = ['deleting'];
 * Or boot the observer in AppServiceProvider.
 */
class DeletedItemObserver
{
    /**
     * Handle the model "deleting" event.
     * 
     * This fires BEFORE the model is actually deleted, so we can capture all data.
     */
    public function deleting(Model $model): void
    {
        try {
            // Get the authenticated user (admin or user)
            // First check if context was set by DeletedItemHelper
            $deletedBy = app()->get('deleted_by');
            
            if (! $deletedBy) {
                if (Auth::check()) {
                    $user = Auth::user();
                    $deletedBy = $user->email ?? $user->name ?? ($user->id ?? null);
                } elseif (Auth::guard('admin')->check()) {
                    $admin = Auth::guard('admin')->user();
                    $deletedBy = $admin->email ?? $admin->name ?? ($admin->id ?? null);
                } else {
                    $deletedBy = 'system';
                }
            }

            // Store the deleted item
            DeletedItem::create([
                'table_name' => $model->getTable(),
                'record_id'  => $model->getKey(),
                'data'       => $model->toArray(),
                'deleted_by' => $deletedBy,
            ]);

            \Illuminate\Support\Facades\Log::info('🗑️ Item tracked for deletion', [
                'table' => $model->getTable(),
                'id'    => $model->getKey(),
                'deleted_by' => $deletedBy,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('❌ Failed to track deleted item', [
                'table' => $model->getTable() ?? 'unknown',
                'error' => $e->getMessage(),
            ]);
        }
    }
}
