<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add quota tracking to event_packages.
     * Renames stock_quantity → quota, adds booked_count.
     *
     * Quota is only booked when RSVP.status transitions to 'paid'.
     */
    public function up(): void
    {
        Schema::table('event_packages', function (Blueprint $table) {
            // Rename stock_quantity to quota
            $table->renameColumn('stock_quantity', 'quota');

            // Add booked_count: tracks how many are already paid
            $table->integer('booked_count')->default(0)->after('quota');
        });
    }

    /**
     * Revert.
     */
    public function down(): void
    {
        Schema::table('event_packages', function (Blueprint $table) {
            $table->renameColumn('quota', 'stock_quantity');
            $table->dropColumn('booked_count');
        });
    }
};
