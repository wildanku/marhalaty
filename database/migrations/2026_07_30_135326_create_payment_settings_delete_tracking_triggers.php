<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_payment_gateways_delete ON payment_gateways CASCADE');

        DB::statement(<<<'SQL'
            CREATE TRIGGER tr_payment_gateways_delete
            BEFORE DELETE ON payment_gateways
            FOR EACH ROW
            EXECUTE FUNCTION log_deleted_item();
        SQL);

        DB::statement('DROP TRIGGER IF EXISTS tr_payment_manual_accounts_delete ON payment_manual_accounts CASCADE');

        DB::statement(<<<'SQL'
            CREATE TRIGGER tr_payment_manual_accounts_delete
            BEFORE DELETE ON payment_manual_accounts
            FOR EACH ROW
            EXECUTE FUNCTION log_deleted_item();
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS tr_payment_gateways_delete ON payment_gateways CASCADE');
        DB::statement('DROP TRIGGER IF EXISTS tr_payment_manual_accounts_delete ON payment_manual_accounts CASCADE');
    }
};
