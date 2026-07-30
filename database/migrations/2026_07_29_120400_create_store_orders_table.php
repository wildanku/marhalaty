<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_orders', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('order_number')->unique();
            $table->foreignUlid('store_id')->constrained('stores')->restrictOnDelete();
            $table->foreignId('buyer_user_id')->constrained('users')->restrictOnDelete();

            $table->enum('status', [
                'pending_payment', 'paid', 'processing', 'shipped',
                'completed', 'cancelled', 'expired', 'refunded',
            ])->default('pending_payment')->index();

            $table->boolean('requires_shipping')->default(true);

            $table->decimal('subtotal', 12, 2);
            $table->decimal('shipping_cost', 12, 2)->default(0);
            $table->decimal('payment_fee', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->integer('total_weight_grams')->default(0);

            $table->string('shipping_provider', 20)->nullable();
            $table->string('shipping_courier_code', 20)->nullable();
            $table->string('shipping_courier_name')->nullable();
            $table->string('shipping_service', 50)->nullable();
            $table->string('shipping_etd', 50)->nullable();

            $table->json('shipping_address_snapshot')->nullable();
            $table->json('origin_address_snapshot')->nullable();

            $table->text('buyer_note')->nullable();
            $table->string('tracking_number')->nullable();

            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_orders');
    }
};
