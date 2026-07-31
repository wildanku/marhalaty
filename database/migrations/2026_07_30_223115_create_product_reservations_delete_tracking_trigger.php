<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_product_reservations_delete ON product_reservations CASCADE');

        DB::statement(<<<'SQL'
            CREATE TRIGGER tr_product_reservations_delete
            BEFORE DELETE ON product_reservations
            FOR EACH ROW
            EXECUTE FUNCTION log_deleted_item();
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_product_reservations_delete ON product_reservations CASCADE');
    }
};
