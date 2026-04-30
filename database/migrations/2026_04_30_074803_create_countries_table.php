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
        Schema::create('countries', function (Blueprint $table) {
            $table->text('id')->primary();
            $table->text('flag')->nullable();
            $table->text('name');
            $table->text('demonym')->nullable();
            $table->text('code');
            $table->text('iso2')->nullable();
            $table->text('tld')->nullable();
            $table->text('currency')->nullable();
            $table->text('population')->nullable();
            $table->text('density')->nullable();
            $table->text('area')->nullable();
            $table->text('gdp')->nullable();
            $table->text('median_age')->nullable();
            $table->text('language')->nullable();
            $table->text('website')->nullable();
            $table->text('callingCode')->nullable();
            $table->text('drivingSide')->nullable();
            $table->text('continent')->nullable();
            $table->boolean('unMember')->default(false);
            $table->text('religion')->nullable();
            $table->timestamp('createdAt', 3)->useCurrent();
            $table->timestamp('updatedAt', 3)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('countries');
    }
};
