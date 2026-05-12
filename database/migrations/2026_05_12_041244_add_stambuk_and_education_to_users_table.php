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
            $table->string('no_stambuk')->nullable()->after('marhalah_year');
            $table->unsignedBigInteger('pendidikan_terakhir_id')->nullable()->after('no_stambuk');
            $table->foreign('pendidikan_terakhir_id')->references('id')->on('options')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign('users_pendidikan_terakhir_id_foreign');
            $table->dropColumn('pendidikan_terakhir_id');
            $table->dropColumn('no_stambuk');
        });
    }
};
