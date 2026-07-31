<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Adds `event` to the satutera gateway's `contexts` (fase 9,
     * docs/plan/mvp2/9-event-payment-satutera.md D40 — "dijalankan setelah kodenya mendarat, bukan
     * sebelum"). `RsvpController` can now actually initiate/receive Satutera payments, so this is
     * safe to flip. `is_enabled` and `credentials` are left untouched — an admin may already have
     * satutera configured for store checkout, and this must not disturb that.
     */
    public function up(): void
    {
        $row = DB::table('payment_gateways')->where('code', 'satutera')->first();

        if (! $row) {
            return;
        }

        $contexts = json_decode($row->contexts ?? '[]', true) ?: [];

        if (! in_array('event', $contexts, true)) {
            $contexts[] = 'event';
        }

        DB::table('payment_gateways')
            ->where('code', 'satutera')
            ->update(['contexts' => json_encode($contexts)]);
    }

    /**
     * Deliberately a no-op — same as the fase 7a data migration this mirrors. Blindly overwriting
     * `contexts` back to `['store']` on rollback risks discarding an admin's own later choices.
     */
    public function down(): void {}
};
