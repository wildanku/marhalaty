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
        Schema::table('users', function (Blueprint $table) {
            $table->string('country')->default('Indonesia');
            $table->char('city_id', 4)->nullable();
            $table->string('foreign_city')->nullable();
            $table->unsignedBigInteger('profession_id')->nullable();
            $table->unsignedBigInteger('campus_id')->nullable();
            $table->json('social_media')->nullable();
            $table->json('metadata')->nullable();

            $table->dropColumn(['city', 'profession']);

            // Add foreign key constraints if desired
            // $table->foreign('city_id')->references('id')->on('indonesia_cities')->nullOnDelete();
            // $table->foreign('profession_id')->references('id')->on('options')->nullOnDelete();
            // $table->foreign('campus_id')->references('id')->on('options')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'country',
                'city_id',
                'foreign_city',
                'profession_id',
                'campus_id',
                'social_media',
                'metadata'
            ]);

            $table->string('city')->nullable();
            $table->string('profession')->nullable();
        });
    }
};
