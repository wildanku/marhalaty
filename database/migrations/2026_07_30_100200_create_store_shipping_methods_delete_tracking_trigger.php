<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_store_shipping_methods_delete ON store_shipping_methods CASCADE');

        DB::statement(<<<'SQL'
            CREATE TRIGGER tr_store_shipping_methods_delete
            BEFORE DELETE ON store_shipping_methods
            FOR EACH ROW
            EXECUTE FUNCTION log_deleted_item();
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_store_shipping_methods_delete ON store_shipping_methods CASCADE');
    }
};
