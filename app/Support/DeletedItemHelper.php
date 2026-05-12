<?php

namespace App\Support;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * DeletedItemHelper
 * 
 * Helper class untuk tracking deletion context.
 * Bekerja dengan DeletedItemObserver dan database triggers.
 */
class DeletedItemHelper
{
    /**
     * Set deletion context untuk database trigger.
     * 
     * Panggil sebelum melakukan DELETE query (raw atau model).
     * 
     * Example:
     *   DeletedItemHelper::setContext();
     *   DB::table('events')->where('id', 1)->delete();
     * 
     *   Or:
     *   Event::find(1)->delete();
     */
    public static function setContext(): void
    {
        $deletedBy = self::getCurrentUser();
        
        // Set PostgreSQL variable untuk trigger function
        DB::statement("SET app.deleted_by = ?", [$deletedBy]);
        
        // Also set untuk observer
        app()->instance('deleted_by', $deletedBy);
    }

    /**
     * Get current authenticated user identifier.
     */
    private static function getCurrentUser(): string
    {
        if (Auth::check()) {
            $user = Auth::user();
            return $user->email ?? $user->name ?? "user_{$user->id}";
        }
        
        if (Auth::guard('admin')->check()) {
            $admin = Auth::guard('admin')->user();
            return $admin->email ?? $admin->name ?? "admin_{$admin->id}";
        }
        
        return 'system';
    }

    /**
     * Execute deletion with context tracking.
     * 
     * Wrapper yang handle context automatically.
     * 
     * Example:
     *   DeletedItemHelper::withContext(function() {
     *       DB::table('events')->where('id', 1)->delete();
     *       Event::find(2)->delete();
     *   });
     */
    public static function withContext(callable $callback): mixed
    {
        self::setContext();
        
        try {
            return $callback();
        } finally {
            // Reset context
            try {
                DB::statement("RESET app.deleted_by");
            } catch (\Exception $e) {
                // Ignore reset errors
            }
        }
    }

    /**
     * Bulk delete dengan context tracking.
     * 
     * Example:
     *   DeletedItemHelper::bulkDelete('events', [1, 2, 3]);
     */
    public static function bulkDelete(string $table, array $ids): int
    {
        return self::withContext(function () use ($table, $ids) {
            return DB::table($table)->whereIn('id', $ids)->delete();
        });
    }

    /**
     * Get deletion history untuk record tertentu.
     * 
     * Example:
     *   DeletedItemHelper::history('events', 5);
     */
    public static function history(string $table, int|string $recordId)
    {
        return \App\Models\DeletedItem::forTable($table)
            ->where('record_id', $recordId)
            ->latest()
            ->get();
    }

    /**
     * Get statistics deleted items.
     */
    public static function statistics()
    {
        return [
            'total_deleted' => \App\Models\DeletedItem::count(),
            'by_table'      => \App\Models\DeletedItem::countByTable(),
            'tables'        => \App\Models\DeletedItem::deletedTables(),
            'last_10'       => \App\Models\DeletedItem::latest()->limit(10)->get(),
        ];
    }
}
