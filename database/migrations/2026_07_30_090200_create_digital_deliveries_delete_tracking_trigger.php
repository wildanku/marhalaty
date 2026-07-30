<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_digital_deliveries_delete ON digital_deliveries CASCADE');

        DB::statement(<<<'SQL'
            CREATE TRIGGER tr_digital_deliveries_delete
            BEFORE DELETE ON digital_deliveries
            FOR EACH ROW
            EXECUTE FUNCTION log_deleted_item();
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_digital_deliveries_delete ON digital_deliveries CASCADE');
    }
};
