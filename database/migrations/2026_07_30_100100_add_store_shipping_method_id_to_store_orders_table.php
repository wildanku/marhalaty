<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Traceability only — every display field (shipping_courier_name/service/cost) is already
     * snapshotted onto the order at checkout time, so this FK going null when a method is later
     * deleted (nullOnDelete) never affects how a past order renders.
     */
    public function up(): void
    {
        Schema::table('store_orders', function (Blueprint $table) {
            $table->foreignUlid('store_shipping_method_id')->nullable()->after('shipping_provider')
                ->constrained('store_shipping_methods')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('store_orders', function (Blueprint $table) {
            $table->dropForeign(['store_shipping_method_id']);
            $table->dropColumn('store_shipping_method_id');
        });
    }
};
