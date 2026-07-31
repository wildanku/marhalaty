<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('store_order_id')->constrained('store_orders')->cascadeOnDelete();
            $table->string('from_status', 20);
            $table->string('to_status', 20);
            $table->text('reason')->nullable();
            $table->enum('actor_type', ['store_member', 'admin']);
            $table->unsignedBigInteger('actor_id');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_order_status_histories');
    }
};
