<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_badge_assignments', function (Blueprint $table) {
            $table->id();

            // ulid, bukan foreignId() — stores.id adalah ULID (README.md keputusan D2).
            $table->ulid('store_id');
            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();

            $table->foreignId('store_badge_id')->constrained('store_badges')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('admins')->nullOnDelete();

            $table->timestamp('assigned_at');
            $table->timestamp('expires_at')->nullable();
            $table->string('note')->nullable();

            $table->timestamps();
            $table->unique(['store_id', 'store_badge_id']);
            $table->index(['store_badge_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_badge_assignments');
    }
};
