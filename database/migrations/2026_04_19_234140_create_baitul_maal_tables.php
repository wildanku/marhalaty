<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('funds', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('collected_amount', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->string('image_url')->nullable();
            $table->decimal('target_amount', 15, 2);
            $table->decimal('collected_amount', 15, 2)->default(0);
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'completed', 'draft'])->default('draft');
            $table->timestamps();
        });

        Schema::create('campaign_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->onDelete('cascade');
            $table->string('title');
            $table->text('content');
            $table->timestamps();
        });

        // Polymorphic ledger table
        Schema::create('donations', function (Blueprint $table) {
            $table->id();
            $table->morphs('donatable'); // creates donatable_type and donatable_id
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('amount', 15, 2);
            $table->enum('status', ['pending', 'paid', 'failed'])->default('pending');
            $table->boolean('is_anonymous')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
        Schema::dropIfExists('campaign_updates');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('funds');
    }
};
