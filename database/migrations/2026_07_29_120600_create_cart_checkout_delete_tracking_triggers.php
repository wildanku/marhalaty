<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Extends log_deleted_item() to the buyer-address and order tables. `carts`/`cart_items` and
     * `shipping_destinations` are intentionally excluded — ephemeral shopping-cart state and a
     * provider-lookup cache have no audit value and would add trigger overhead to routine
     * add-to-cart churn.
     */
    private array $tables = [
        'user_addresses',
        'store_orders',
        'store_order_items',
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
