<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained('products')->cascadeOnDelete();

            $table->string('sku')->nullable();
            $table->string('option1_name');
            $table->string('option1_value');
            $table->string('option2_name')->nullable();
            $table->string('option2_value')->nullable();

            $table->decimal('price', 12, 2);
            $table->integer('stock_quantity')->default(0);
            $table->integer('weight_grams')->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->unique(['product_id', 'option1_value', 'option2_value']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
