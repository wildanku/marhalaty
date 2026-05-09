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
        Schema::create('event_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->integer('stock_quantity')->nullable(); // null means unlimited
            $table->timestamps();
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('payment_type');
            $table->dropColumn('pricing_rules');
            $table->json('infak_rules')->nullable()->after('event_date');
        });

        Schema::table('rsvps', function (Blueprint $table) {
            $table->dropColumn('base_amount');
            $table->foreignId('event_package_id')->nullable()->after('user_id')->constrained('event_packages')->nullOnDelete();
            $table->decimal('package_amount', 12, 2)->default(0)->after('event_package_id');
            $table->decimal('infak_amount', 12, 2)->default(0)->after('package_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rsvps', function (Blueprint $table) {
            $table->dropForeign(['event_package_id']);
            $table->dropColumn(['event_package_id', 'package_amount', 'infak_amount']);
            $table->decimal('base_amount', 12, 2)->default(0);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('infak_rules');
            $table->enum('payment_type', ['free', 'fixed', 'flexible'])->default('free');
            $table->json('pricing_rules')->nullable();
        });

        Schema::dropIfExists('event_packages');
    }
};
