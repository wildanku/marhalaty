<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_addons', function (Blueprint $table) {
            // ULID FKs — products/product_variants are ULID-keyed (README.md D2), not foreignId().
            $table->foreignUlid('product_id')->nullable()->after('event_id')
                ->constrained('products')->restrictOnDelete();
            $table->foreignUlid('product_variant_id')->nullable()->after('product_id')
                ->constrained('product_variants')->restrictOnDelete();
            $table->enum('stock_source', ['event', 'product'])->default('event')->after('stock_quantity');
            $table->index(['product_id']);
        });
    }

    public function down(): void
    {
        Schema::table('event_addons', function (Blueprint $table) {
            $table->dropForeign(['product_variant_id']);
            $table->dropForeign(['product_id']);
            $table->dropColumn(['product_variant_id', 'product_id', 'stock_source']);
        });
    }
};
