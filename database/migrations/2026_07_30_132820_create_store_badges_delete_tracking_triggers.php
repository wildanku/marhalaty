<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_store_badges_delete ON store_badges CASCADE');

        DB::statement(<<<'SQL'
            CREATE TRIGGER tr_store_badges_delete
            BEFORE DELETE ON store_badges
            FOR EACH ROW
            EXECUTE FUNCTION log_deleted_item();
        SQL);

        DB::statement('DROP TRIGGER IF EXISTS tr_store_badge_assignments_delete ON store_badge_assignments CASCADE');

        DB::statement(<<<'SQL'
            CREATE TRIGGER tr_store_badge_assignments_delete
            BEFORE DELETE ON store_badge_assignments
            FOR EACH ROW
            EXECUTE FUNCTION log_deleted_item();
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_store_badges_delete ON store_badges CASCADE');
        DB::statement('DROP TRIGGER IF EXISTS tr_store_badge_assignments_delete ON store_badge_assignments CASCADE');
    }
};
