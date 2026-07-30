<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('label')->default('Rumah');
            $table->string('recipient_name');
            $table->string('phone');
            $table->text('address_line');

            $table->char('village_id', 10);
            $table->char('postal_code', 5);
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();

            $table->unsignedBigInteger('rajaongkir_destination_id')->nullable()->index();
            $table->timestamp('destination_resolved_at')->nullable();

            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->foreign('village_id')->references('id')->on('indonesia_villages')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_addresses');
    }
};
