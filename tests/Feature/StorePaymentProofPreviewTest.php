<?php

namespace Tests\Feature;

use App\Domains\Event\Models\PaymentProof;
use App\Domains\Event\Models\Transaction;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorePaymentProofPreviewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('payment_proofs');
        Schema::dropIfExists('transactions');

        Schema::create('transactions', function (Blueprint $table): void {
            $table->id();
            $table->string('payment_hash')->unique();
            $table->string('payment_provider');
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        Schema::create('payment_proofs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('original_name');
            $table->text('notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('payment_proofs');
        Schema::dropIfExists('transactions');

        parent::tearDown();
    }

    public function test_a_store_payment_hash_can_preview_its_uploaded_proof(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('payment-proofs/1/transfer.png', 'payment-proof-content');

        $transaction = Transaction::query()->create([
            'payment_hash' => 'store-payment-proof-hash',
            'payment_provider' => 'manual',
            'status' => 'pending',
        ]);

        PaymentProof::query()->create([
            'transaction_id' => $transaction->id,
            'file_path' => 'payment-proofs/1/transfer.png',
            'original_name' => 'transfer.png',
        ]);

        $this->get('/store/payment/store-payment-proof-hash/proof')
            ->assertOk()
            ->assertHeader('content-disposition', 'inline; filename=transfer.png')
            ->assertStreamedContent('payment-proof-content');
    }
}
