<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Seeds `payment_gateways` so it matches *current production behavior* exactly, then copies
     * the old `settings.bank_account_manual_transfer` blob into `payment_manual_accounts`. Nothing
     * here changes what a buyer can actually do at checkout today — see docs/plan/mvp2/7-payment-settings.md §3.
     *
     * `credentials` is left null for every row on purpose: `PaymentSettingsService::credentials()`
     * falls back to `config('services.*')` (i.e. `.env`) whenever the DB value is empty, so no
     * existing deployment needs its `.env` touched for this to keep working.
     */
    public function up(): void
    {
        $now = now();

        $gateways = [
            // Store checkout today only offers Satutera (CheckoutService hardcodes it).
            ['code' => 'satutera', 'label' => 'Satutera', 'is_enabled' => true, 'contexts' => ['store']],
            // Event registration today offers iPaymu and manual transfer (RsvpController
            // 'required|in:manual,ipaymu'). Manual transfer for *store* checkout doesn't exist in
            // code yet — that ships in fase 7c — so 'store' is deliberately absent here even
            // though the `manual` driver is capable of it; an admin opts in later from god-mode.
            ['code' => 'ipaymu', 'label' => 'iPaymu', 'is_enabled' => true, 'contexts' => ['event']],
            ['code' => 'manual', 'label' => 'Transfer Manual', 'is_enabled' => true, 'contexts' => ['event']],
        ];

        foreach ($gateways as $i => $gateway) {
            DB::table('payment_gateways')->updateOrInsert(
                ['code' => $gateway['code']],
                [
                    'label' => $gateway['label'],
                    'is_enabled' => $gateway['is_enabled'],
                    'contexts' => json_encode($gateway['contexts']),
                    'sort_order' => $i,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        $settingRow = DB::table('settings')->where('key', 'bank_account_manual_transfer')->first();

        if ($settingRow && DB::table('payment_manual_accounts')->count() === 0) {
            $accounts = json_decode($settingRow->value, true) ?? [];

            foreach (array_values($accounts) as $i => $account) {
                $bankName = $account['bank'] ?? $account['bank_name'] ?? null;
                $accountNumber = $account['account_number'] ?? null;

                if (! $bankName || ! $accountNumber) {
                    continue;
                }

                DB::table('payment_manual_accounts')->insert([
                    'bank_name' => $bankName,
                    'account_number' => $accountNumber,
                    'account_holder' => $account['account_holder'] ?? '',
                    'is_active' => true,
                    'sort_order' => $i,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    /**
     * Deliberately a no-op: the tables this migration populates are dropped by their own
     * migrations' down() methods, and `settings.bank_account_manual_transfer` (the source data)
     * is left untouched either way.
     */
    public function down(): void {}
};
