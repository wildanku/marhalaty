<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `media.model_id` is `unsignedBigInteger` by default (spatie/laravel-medialibrary's
     * `$table->morphs('model')`), which fits the existing bigint-keyed models (Event,
     * EventAddon, ...). The Store module's `Store` and `Product` models use ULID primary keys,
     * so the polymorphic column needs to hold either representation.
     */
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropIndex(['model_type', 'model_id']);
        });

        DB::statement('ALTER TABLE media ALTER COLUMN model_id TYPE VARCHAR(255) USING model_id::varchar');

        Schema::table('media', function (Blueprint $table) {
            $table->index(['model_type', 'model_id']);
        });
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropIndex(['model_type', 'model_id']);
        });

        DB::statement('ALTER TABLE media ALTER COLUMN model_id TYPE BIGINT USING model_id::bigint');

        Schema::table('media', function (Blueprint $table) {
            $table->index(['model_type', 'model_id']);
        });
    }
};
