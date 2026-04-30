<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        Admin::firstOrCreate(
            ['email' => 'admin@dynamic.id'],
            [
                'name' => 'Super Admin',
                'password' => bcrypt('godmode2013!'),
                'role' => 'superadmin',
            ]
        );

        $this->command->info('Admin seeded: admin@dynamic.id / godmode2013!');
    }
}
