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
            $table->string('slug')->unique()->nullable();
            $table->string('profession')->nullable();
            $table->string('city')->nullable();
            $table->enum('privacy_setting', ['public', 'circle', 'private'])->default('public');
            $table->string('business_showcase_url')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['slug', 'profession', 'city', 'privacy_setting', 'business_showcase_url']);
        });
    }
};
