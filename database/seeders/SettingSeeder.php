<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        Setting::updateOrCreate(
            ['key' => 'bank_account_manual_transfer'],
            [
                'value' => [
                    [
                        'bank'           => 'BSI',
                        'account_number' => '1000405012',
                        'account_holder' => 'Ramadhan Nurmu Alam',
                    ],
                ],
            ]
        );
    }
}
