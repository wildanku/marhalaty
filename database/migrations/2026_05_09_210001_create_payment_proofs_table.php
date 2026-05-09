<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->onDelete('cascade');

            // Uploaded file
            $table->string('file_path');
            $table->string('original_name');
            $table->text('notes')->nullable(); // optional note from user

            // Admin review
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()
                  ->constrained('admins')
                  ->nullOnDelete(); // admin who reviewed
            $table->text('review_note')->nullable(); // rejection reason or approval note

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_proofs');
    }
};
