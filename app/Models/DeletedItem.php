<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * DeletedItem Model
 * 
 * Stores audit trail of all deleted items across the application.
 * Automatically populated by DeletedItemObserver when any model is deleted.
 */
class DeletedItem extends Model
{
    protected $fillable = [
        'table_name',
        'record_id',
        'data',
        'deleted_by',
    ];

    protected $casts = [
        'data' => 'json',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the admin who deleted this item (if available).
     */
    public function deletedByAdmin()
    {
        return $this->belongsTo(Admin::class, 'deleted_by');
    }

    /**
     * Retrieve deleted items for a specific table.
     */
    public static function forTable(string $tableName)
    {
        return static::where('table_name', $tableName);
    }

    /**
     * Retrieve deleted item for a specific record.
     */
    public static function forRecord(string $tableName, int|string $recordId)
    {
        return static::where('table_name', $tableName)
            ->where('record_id', $recordId)
            ->first();
    }

    /**
     * Get list of all tables with deleted items.
     */
    public static function deletedTables(): array
    {
        return static::distinct()
            ->pluck('table_name')
            ->sort()
            ->toArray();
    }

    /**
     * Count deleted items per table.
     */
    public static function countByTable(): array
    {
        return static::selectRaw('table_name, COUNT(*) as count')
            ->groupBy('table_name')
            ->pluck('count', 'table_name')
            ->toArray();
    }
}
