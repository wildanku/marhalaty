<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates database triggers for all important tables to automatically
     * log deletions to deleted_items table, capturing both model deletes
     * and raw query deletes.
     */
    public function up(): void
    {
        // Drop existing triggers if they exist (for re-running migrations)
        $triggers = [
            'tr_events_delete',
            'tr_event_packages_delete',
            'tr_event_addons_delete',
            'tr_rsvps_delete',
            'tr_transactions_delete',
            'tr_payment_proofs_delete',
            'tr_campaigns_delete',
            'tr_campaign_updates_delete',
            'tr_donations_delete',
            'tr_funds_delete',
            'tr_users_delete',
            'tr_admins_delete',
            'tr_consulates_delete',
            'tr_consulate_cities_delete',
            'tr_options_delete',
            'tr_settings_delete',
            'tr_telegram_whitelists_delete',
        ];

        foreach ($triggers as $trigger) {
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.events CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.event_packages CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.event_addons CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.rsvps CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.transactions CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.payment_proofs CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.campaigns CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.campaign_updates CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.donations CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.funds CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.users CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.admins CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.consulates CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.consulate_cities CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.options CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.settings CASCADE");
            DB::statement("DROP TRIGGER IF EXISTS $trigger ON public.telegram_whitelists CASCADE");
        }

        // Create trigger function
        DB::statement(<<<SQL
            CREATE OR REPLACE FUNCTION log_deleted_item()
            RETURNS TRIGGER AS \$\$
            BEGIN
                INSERT INTO deleted_items (
                    table_name,
                    record_id,
                    data,
                    deleted_by,
                    created_at,
                    updated_at
                ) VALUES (
                    TG_TABLE_NAME,
                    OLD.id,
                    row_to_json(OLD),
                    COALESCE(current_setting('app.deleted_by', true), 'system'),
                    NOW(),
                    NOW()
                );
                RETURN OLD;
            END;
            \$\$ LANGUAGE plpgsql;
        SQL);

        // Create triggers for each table
        $tables = [
            'events',
            'event_packages',
            'event_addons',
            'rsvps',
            'transactions',
            'payment_proofs',
            'campaigns',
            'campaign_updates',
            'donations',
            'funds',
            'users',
            'admins',
            'consulates',
            'consulate_cities',
            'options',
            'settings',
            'telegram_whitelists',
        ];

        foreach ($tables as $table) {
            DB::statement(<<<SQL
                CREATE TRIGGER tr_{$table}_delete
                BEFORE DELETE ON {$table}
                FOR EACH ROW
                EXECUTE FUNCTION log_deleted_item();
            SQL);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'events',
            'event_packages',
            'event_addons',
            'rsvps',
            'transactions',
            'payment_proofs',
            'campaigns',
            'campaign_updates',
            'donations',
            'funds',
            'users',
            'admins',
            'consulates',
            'consulate_cities',
            'options',
            'settings',
            'telegram_whitelists',
        ];

        foreach ($tables as $table) {
            DB::statement("DROP TRIGGER IF EXISTS tr_{$table}_delete ON {$table} CASCADE");
        }

        DB::statement("DROP FUNCTION IF EXISTS log_deleted_item() CASCADE");
    }
};
