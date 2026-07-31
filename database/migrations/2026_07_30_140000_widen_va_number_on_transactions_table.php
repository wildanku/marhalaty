<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * `va_number` also stores the Satutera/iPaymu QRIS payload (the full EMV QR string,
     * ~250-300 chars) for `payment_method = qris`, not just short VA account numbers — the
     * original `varchar(255)` was sized for VA only and truncates/errors on QRIS.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE transactions ALTER COLUMN va_number TYPE text');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE transactions ALTER COLUMN va_number TYPE varchar(255)');
    }
};
