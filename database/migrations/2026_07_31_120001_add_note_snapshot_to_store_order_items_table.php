<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_order_items', function (Blueprint $table) {
            $table->string('note_snapshot', 250)->nullable()->after('variant_label_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('store_order_items', function (Blueprint $table) {
            $table->dropColumn('note_snapshot');
        });
    }
};
