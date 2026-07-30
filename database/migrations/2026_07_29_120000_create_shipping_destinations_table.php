<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_destinations', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 20)->default('rajaongkir');
            $table->string('destination_id', 30);
            $table->string('label');
            $table->string('subdistrict_name')->nullable();
            $table->string('district_name')->nullable();
            $table->string('city_name')->nullable();
            $table->string('province_name')->nullable();
            $table->char('zip_code', 5)->nullable()->index();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'destination_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_destinations');
    }
};
