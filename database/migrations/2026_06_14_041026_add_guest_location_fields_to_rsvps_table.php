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
        Schema::table('rsvps', function (Blueprint $table) {
            $table->string('guest_country')->nullable()->after('guest_phone');
            $table->char('guest_city_id', 4)->nullable()->after('guest_country');
            $table->string('guest_foreign_city')->nullable()->after('guest_city_id');
            
            $table->foreign('guest_city_id')->references('id')->on('indonesia_cities')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rsvps', function (Blueprint $table) {
            $table->dropForeign(['guest_city_id']);
            $table->dropColumn(['guest_country', 'guest_city_id', 'guest_foreign_city']);
        });
    }
};
