<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rsvp_id')->constrained('rsvps')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('amount', 12, 2);

            /**
             * Payment provider identifier.
             * 'manual'  — user uploads bank transfer proof, admin approves.
             * 'ipaymu'  — redirected to iPaymu payment page.
             */
            $table->string('payment_provider'); // e.g. manual, ipaymu, xendit

            $table->enum('status', ['pending', 'paid', 'failed', 'expired', 'cancelled'])
                  ->default('pending');

            // iPaymu / external provider data
            $table->string('external_reference')->nullable(); // iPaymu SessionID or trx_id
            $table->string('payment_url', 2048)->nullable();  // iPaymu redirect URL
            $table->string('va_number')->nullable();          // virtual account number

            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expired_at')->nullable();

            // Raw provider webhook/response payload for auditing
            $table->json('metadata')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
