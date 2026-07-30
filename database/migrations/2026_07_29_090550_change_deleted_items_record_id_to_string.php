<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Store module tables (`stores`, `products`, `product_variants`) use ULID primary keys, so
     * the delete-tracking trigger's OLID.id no longer always fits `unsignedBigInteger`. Widen the
     * column so both legacy bigint ids and new ULID ids can be captured.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE deleted_items ALTER COLUMN record_id TYPE VARCHAR(255) USING record_id::varchar');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE deleted_items ALTER COLUMN record_id TYPE BIGINT USING record_id::bigint');
    }
};
