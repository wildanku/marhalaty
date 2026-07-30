<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_orders', function (Blueprint $table) {
            $table->text('cancellation_reason')->nullable()->after('buyer_note');
            // Guards releaseStock() against double-crediting stock when the expiry command and a
            // late webhook race each other for the same order.
            $table->timestamp('stock_released_at')->nullable()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('store_orders', function (Blueprint $table) {
            $table->dropColumn(['cancellation_reason', 'stock_released_at']);
        });
    }
};
