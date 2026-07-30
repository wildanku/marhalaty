<?php

use App\Domains\Event\Models\Rsvp;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive, per docs/plan/mvp2/README.md decision D3: makes `transactions` a shared ledger
     * for both the existing RSVP/event flow (which keeps using `rsvp_id`) and the new Store order
     * flow (which uses `payable_type`/`payable_id`). The RSVP flow's own code paths are untouched.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('payable_type')->nullable()->after('id');
            $table->string('payable_id')->nullable()->after('payable_type');
            $table->decimal('payment_fee', 12, 2)->default(0)->after('amount');
            $table->string('checkout_token')->nullable()->index();
            $table->json('payment_detail')->nullable();

            $table->index(['payable_type', 'payable_id']);
        });

        DB::table('transactions')->whereNotNull('rsvp_id')->update([
            'payable_type' => Rsvp::class,
            'payable_id' => DB::raw('rsvp_id::text'),
        ]);

        DB::statement('ALTER TABLE transactions ALTER COLUMN rsvp_id DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE transactions ALTER COLUMN rsvp_id SET NOT NULL');

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['payable_type', 'payable_id']);
            $table->dropColumn(['payable_type', 'payable_id', 'payment_fee', 'checkout_token', 'payment_detail']);
        });
    }
};
