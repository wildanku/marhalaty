<?php

namespace Tests\Unit;

use App\Contracts\PaymentProviderInterface;
use App\Domains\Event\Controllers\PaymentController;
use App\Domains\Event\Models\Rsvp;
use App\Domains\Event\Models\Transaction;
use App\Domains\Event\Services\PendingRsvpPaymentService;
use App\Domains\Shared\Services\PaymentSettingsService;
use App\Domains\Shared\Services\RsvpPaymentService;
use App\Domains\Shared\Services\SatuteraPaymentService;
use App\Jobs\SendEventRegistrationPendingPaymentEmail;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

class PendingRsvpPaymentServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('payment_proofs');
        Schema::dropIfExists('product_reservations');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('rsvps');
        Schema::dropIfExists('events');
        Schema::dropIfExists('users');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('slug')->unique();
            $table->string('phone_number')->nullable();
            $table->integer('marhalah_year')->default(2013);
            $table->timestamps();
        });

        Schema::create('events', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->timestamps();
        });

        Schema::create('rsvps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('event_id');
            $table->foreignId('user_id')->nullable();
            $table->foreignId('event_package_id')->nullable();
            $table->decimal('package_amount', 12, 2)->default(0);
            $table->decimal('infak_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->string('status');
            $table->json('add_ons_snapshot')->nullable();
            $table->json('custom_form_data')->nullable();
            $table->timestamps();
        });

        Schema::create('transactions', function (Blueprint $table): void {
            $table->id();
            $table->string('payable_type')->nullable();
            $table->string('payable_id')->nullable();
            $table->foreignId('rsvp_id')->nullable()->constrained('rsvps')->cascadeOnDelete();
            $table->foreignId('user_id');
            $table->decimal('amount', 12, 2);
            $table->decimal('payment_fee', 12, 2)->default(0);
            $table->string('payment_provider');
            $table->string('payment_channel')->nullable();
            $table->string('payment_hash')->nullable();
            $table->string('status');
            $table->string('external_reference')->nullable();
            $table->string('checkout_token')->nullable();
            $table->string('va_number')->nullable();
            $table->json('payment_detail')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_proofs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('transaction_id');
            $table->string('file_path');
            $table->string('original_name');
            $table->text('notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        Schema::create('product_reservations', function (Blueprint $table): void {
            $table->id();
            $table->string('reservable_type');
            $table->string('reservable_id');
            $table->string('status')->default('reserved');
            $table->timestamps();
        });
    }

    public function test_manual_replacement_cancels_the_previous_pending_transaction_and_resends_instructions(): void
    {
        Bus::fake();
        [$user, $rsvp] = $this->createPendingRsvp();
        $oldTransaction = $this->createTransaction($rsvp, $user, 'satutera');

        $settings = Mockery::mock(PaymentSettingsService::class);
        $settings->shouldReceive('isEnabled')->once()->with('manual', 'event')->andReturnTrue();

        $service = $this->service($settings);
        $newTransaction = $service->replace($rsvp, $user, [
            'payment_provider' => 'manual',
        ]);

        $this->assertNotSame($oldTransaction->id, $newTransaction->id);
        $this->assertSame('manual', $newTransaction->payment_provider);
        $this->assertSame('pending', $newTransaction->status);
        $this->assertSame($rsvp->id, $newTransaction->rsvp_id);
        $this->assertSame('cancelled', $oldTransaction->fresh()->status);
        Bus::assertDispatchedTimes(SendEventRegistrationPendingPaymentEmail::class, 1);
    }

    public function test_same_manual_method_reuses_the_existing_transaction_and_only_resends_instructions(): void
    {
        Bus::fake();
        [$user, $rsvp] = $this->createPendingRsvp();
        $existingTransaction = $this->createTransaction($rsvp, $user, 'manual');

        $settings = Mockery::mock(PaymentSettingsService::class);
        $settings->shouldReceive('isEnabled')->once()->with('manual', 'event')->andReturnTrue();

        $transaction = $this->service($settings)->replace($rsvp, $user, [
            'payment_provider' => 'manual',
        ]);

        $this->assertSame($existingTransaction->id, $transaction->id);
        $this->assertSame(1, Transaction::count());
        Bus::assertDispatchedTimes(SendEventRegistrationPendingPaymentEmail::class, 1);
    }

    public function test_automatic_replacement_preserves_snapshot_amount_and_requires_a_valid_channel(): void
    {
        Bus::fake();
        [$user, $rsvp] = $this->createPendingRsvp(total: 100000);
        $oldTransaction = $this->createTransaction($rsvp, $user, 'manual');

        $settings = Mockery::mock(PaymentSettingsService::class);
        $settings->shouldReceive('isEnabled')->once()->with('satutera', 'event')->andReturnTrue();

        $channel = [
            'provider' => 'qris-provider',
            'method' => 'qris',
            'code' => 'qris',
            'fee' => 1500,
            'fee_type' => 'FIX',
        ];
        $satutera = Mockery::mock(SatuteraPaymentService::class);
        $satutera->shouldReceive('findChannel')
            ->once()
            ->with('qris-provider', 'qris', 'qris')
            ->andReturn($channel);
        $satutera->shouldReceive('resolveFee')->once()->with($channel, 100000)->andReturn(1500);

        $rsvpPayments = Mockery::mock(RsvpPaymentService::class);
        $rsvpPayments->shouldReceive('retryPaymentInitiation')->once();

        $transaction = $this->service($settings, $satutera, $rsvpPayments)->replace($rsvp, $user, [
            'payment_provider' => 'satutera',
            'channel_provider' => 'qris-provider',
            'payment_method' => 'qris',
            'payment_channel' => 'qris',
        ]);

        $this->assertSame('satutera', $transaction->payment_provider);
        $this->assertSame('qris', $transaction->payment_channel);
        $this->assertSame('101500.00', $transaction->amount);
        $this->assertSame('1500.00', $transaction->payment_fee);
        $this->assertSame('cancelled', $oldTransaction->fresh()->status);
        $this->assertSame('qris', $transaction->metadata['payment_request']['payment_channel']);
        Bus::assertDispatchedTimes(SendEventRegistrationPendingPaymentEmail::class, 1);
    }

    public function test_payment_replacement_is_rejected_when_a_transfer_proof_is_waiting_for_review(): void
    {
        [$user, $rsvp] = $this->createPendingRsvp();
        $transaction = $this->createTransaction($rsvp, $user, 'manual');
        DB::table('payment_proofs')->insert([
            'transaction_id' => $transaction->id,
            'file_path' => 'payment-proofs/proof.jpg',
            'original_name' => 'proof.jpg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $settings = Mockery::mock(PaymentSettingsService::class);
        $settings->shouldReceive('isEnabled')->once()->with('manual', 'event')->andReturnTrue();

        try {
            $this->service($settings)->replace($rsvp, $user, ['payment_provider' => 'manual']);
            $this->fail('Expected validation to reject an RSVP with an uploaded transfer proof.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('payment_provider', $exception->errors());
        }
    }

    public function test_user_cannot_replace_another_users_rsvp_payment(): void
    {
        [$owner, $rsvp] = $this->createPendingRsvp();
        $otherUser = $this->createUser('other@example.test');

        $settings = Mockery::mock(PaymentSettingsService::class);
        $settings->shouldReceive('isEnabled')->once()->with('manual', 'event')->andReturnTrue();

        $this->expectException(ModelNotFoundException::class);
        $this->service($settings)->replace($rsvp, $otherUser, ['payment_provider' => 'manual']);
    }

    public function test_late_ipaymu_callback_cannot_resurrect_a_replaced_transaction(): void
    {
        [$user, $rsvp] = $this->createPendingRsvp();
        $transaction = $this->createTransaction($rsvp, $user, 'ipaymu');
        $transaction->update(['status' => 'cancelled']);

        $provider = Mockery::mock(PaymentProviderInterface::class);
        $provider->shouldReceive('verifyWebhook')->once()->andReturnTrue();
        $provider->shouldReceive('parseWebhook')->once()->andReturn([
            'reference_id' => $transaction->id,
            'status' => 'paid',
            'external_reference' => 'ipaymu-late-callback',
        ]);
        app()->instance(PaymentProviderInterface::class, $provider);

        $controller = new PaymentController(Mockery::mock(PaymentSettingsService::class));
        $response = $controller->ipaymuWebhook(Request::create('/payments/ipaymu/webhook', 'POST'));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('cancelled', $transaction->fresh()->status);
        $this->assertSame('pending', $rsvp->fresh()->status);
    }

    public function test_pending_registration_can_be_cancelled_from_the_dashboard_without_touching_paid_rsvps(): void
    {
        [$user, $rsvp] = $this->createPendingRsvp();
        $transaction = $this->createTransaction($rsvp, $user, 'manual');
        $request = Request::create('/payments/'.$transaction->id.'/cancel', 'POST', [
            'return_to_dashboard' => true,
        ]);
        $request->setUserResolver(fn (): User => $user);

        $response = (new PaymentController(Mockery::mock(PaymentSettingsService::class)))
            ->cancel($request, $transaction->id);

        $this->assertSame(route('dashboard'), $response->getTargetUrl());
        $this->assertNull(Rsvp::find($rsvp->id));
        $this->assertNull(Transaction::find($transaction->id));
    }

    /** @return array{0: User, 1: Rsvp} */
    private function createPendingRsvp(int $total = 50000): array
    {
        $user = $this->createUser('owner@example.test');
        $eventId = DB::table('events')->insertGetId([
            'title' => 'Reuni Akbar',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $rsvp = Rsvp::create([
            'event_id' => $eventId,
            'user_id' => $user->id,
            'package_amount' => 0,
            'infak_amount' => 0,
            'total_amount' => $total,
            'status' => 'pending',
            'add_ons_snapshot' => null,
        ]);

        return [$user, $rsvp];
    }

    private function createUser(string $email): User
    {
        return User::create([
            'name' => $email === 'owner@example.test' ? 'Owner' : 'Other User',
            'email' => $email,
            'marhalah_year' => 2013,
        ]);
    }

    private function createTransaction(Rsvp $rsvp, User $user, string $provider): Transaction
    {
        return Transaction::create([
            'rsvp_id' => $rsvp->id,
            'user_id' => $user->id,
            'amount' => $rsvp->total_amount,
            'payment_fee' => 0,
            'payment_provider' => $provider,
            'status' => 'pending',
        ]);
    }

    private function service(
        PaymentSettingsService $settings,
        ?SatuteraPaymentService $satutera = null,
        ?RsvpPaymentService $rsvpPayments = null,
    ): PendingRsvpPaymentService {
        return new PendingRsvpPaymentService(
            $settings,
            $satutera ?? Mockery::mock(SatuteraPaymentService::class),
            $rsvpPayments ?? Mockery::mock(RsvpPaymentService::class),
        );
    }
}
