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
            $table->foreignId('user_id')->nullable()->change();
            $table->boolean('is_manual_entry')->default(false)->after('status');
            $table->string('guest_name')->nullable()->after('is_manual_entry');
            $table->string('guest_email')->nullable()->after('guest_name');
            $table->string('guest_phone')->nullable()->after('guest_email');
            $table->text('manual_entry_note')->nullable()->after('guest_phone');
            $table->foreignId('admin_id')->nullable()->after('manual_entry_note')->constrained('admins')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rsvps', function (Blueprint $table) {
            $table->dropForeign(['admin_id']);
            $table->dropColumn([
                'is_manual_entry',
                'guest_name',
                'guest_email',
                'guest_phone',
                'manual_entry_note',
                'admin_id'
            ]);
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
