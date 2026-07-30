<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Extends the existing log_deleted_item() trigger function (created in
     * 2026_05_12_013000_create_delete_tracking_triggers.php) to the Store module tables.
     */
    private array $tables = [
        'stores',
        'store_members',
        'store_addresses',
        'products',
        'product_variants',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("DROP TRIGGER IF EXISTS tr_{$table}_delete ON {$table} CASCADE");

            DB::statement(<<<SQL
                CREATE TRIGGER tr_{$table}_delete
                BEFORE DELETE ON {$table}
                FOR EACH ROW
                EXECUTE FUNCTION log_deleted_item();
            SQL);
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("DROP TRIGGER IF EXISTS tr_{$table}_delete ON {$table} CASCADE");
        }
    }
};
