<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates the pivot table that defines which addons/merchandise are already
     * included (bundled) in a specific event package and in what quantity.
     */
    public function up(): void
    {
        Schema::create('event_package_included_addons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_package_id')
                  ->constrained('event_packages')
                  ->cascadeOnDelete();
            $table->foreignId('event_addon_id')
                  ->constrained('event_addons')
                  ->cascadeOnDelete();
            $table->unsignedInteger('included_quantity')->default(1);
            $table->timestamps();

            // Each addon can only be bundled once per package
            $table->unique(['event_package_id', 'event_addon_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_package_included_addons');
    }
};
