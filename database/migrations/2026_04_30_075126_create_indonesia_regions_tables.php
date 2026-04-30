<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('indonesia_provinces', function (Blueprint $table) {
            $table->char('id', 2)->primary();
            $table->char('kemendagri_code', 2)->unique();
            $table->text('name');
            $table->text('timezone')->nullable();
            $table->text('lat')->nullable();
            $table->text('lng')->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->timestamp('updated_at', 3)->nullable();
        });

        Schema::create('indonesia_cities', function (Blueprint $table) {
            $table->char('id', 4)->primary();
            $table->char('kemendragi_code', 5)->unique();
            $table->char('province_id', 2);
            $table->text('name');
            $table->text('timezone')->nullable();
            $table->text('lat')->nullable();
            $table->text('lng')->nullable();
            $table->integer('elevation')->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->timestamp('updated_at', 3)->nullable();

            $table->foreign('province_id')->references('id')->on('indonesia_provinces')->onUpdate('cascade')->onDelete('restrict');
        });

        Schema::create('indonesia_districts', function (Blueprint $table) {
            $table->char('id', 6)->primary();
            $table->char('kemendragi_code', 8)->unique();
            $table->char('city_id', 4);
            $table->text('name');
            $table->text('timezone')->nullable();
            $table->text('lat')->nullable();
            $table->text('lng')->nullable();
            $table->integer('elevation')->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->timestamp('updated_at', 3)->nullable();

            $table->foreign('city_id')->references('id')->on('indonesia_cities')->onUpdate('cascade')->onDelete('restrict');
        });

        Schema::create('indonesia_villages', function (Blueprint $table) {
            $table->char('id', 10)->primary();
            $table->char('kemendragi_code', 13)->unique();
            $table->char('postal_code', 5)->nullable();
            $table->char('district_id', 6);
            $table->text('name');
            $table->text('timezone')->nullable();
            $table->text('lat')->nullable();
            $table->text('lng')->nullable();
            $table->integer('elevation')->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->timestamp('updated_at', 3)->nullable();

            $table->foreign('district_id')->references('id')->on('indonesia_districts')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('indonesia_villages');
        Schema::dropIfExists('indonesia_districts');
        Schema::dropIfExists('indonesia_cities');
        Schema::dropIfExists('indonesia_provinces');
    }
};
