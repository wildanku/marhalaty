<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_featured_products_delete ON featured_products CASCADE');

        DB::statement(<<<'SQL'
            CREATE TRIGGER tr_featured_products_delete
            BEFORE DELETE ON featured_products
            FOR EACH ROW
            EXECUTE FUNCTION log_deleted_item();
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_featured_products_delete ON featured_products CASCADE');
    }
};
