<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('store_id')->constrained('stores')->cascadeOnDelete();

            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->enum('type', ['physical', 'digital'])->index();
            $table->string('sku')->nullable();

            $table->enum('status', ['draft', 'active', 'archived'])->default('draft')->index();
            $table->boolean('has_variants')->default(false);

            $table->decimal('price', 12, 2)->nullable();
            $table->integer('stock_quantity')->nullable();
            $table->integer('weight_grams')->nullable();

            $table->json('options')->nullable();

            $table->timestamps();

            $table->unique(['store_id', 'slug']);
            $table->unique(['store_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
