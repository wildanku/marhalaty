<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignUlid('product_variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();

            $table->string('reservable_type');
            $table->string('reservable_id'); // string: menampung bigint (rsvps) & ULID nanti
            $table->foreignId('event_addon_id')->nullable()->constrained('event_addons')->nullOnDelete();

            $table->unsignedInteger('quantity');
            $table->enum('status', ['reserved', 'released', 'fulfilled'])->default('reserved')->index();
            $table->json('selection_snapshot')->nullable(); // kombinasi opsi yang dipilih pembeli
            $table->timestamp('released_at')->nullable();
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamps();

            $table->index(['reservable_type', 'reservable_id']);
            $table->index(['product_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_reservations');
    }
};
