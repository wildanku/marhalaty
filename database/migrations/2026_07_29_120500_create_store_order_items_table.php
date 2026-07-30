<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('store_order_id')->constrained('store_orders')->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignUlid('product_variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();

            $table->string('name_snapshot');
            $table->string('variant_label_snapshot')->nullable();
            $table->string('sku_snapshot')->nullable();
            $table->enum('type_snapshot', ['physical', 'digital']);

            $table->decimal('unit_price', 12, 2);
            $table->integer('quantity');
            $table->integer('weight_grams')->default(0);
            $table->decimal('subtotal', 12, 2);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_order_items');
    }
};
