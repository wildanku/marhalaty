<?php

namespace Database\Seeders;

use App\Models\Consulate;
use App\Models\ConsulateCity;
use Illuminate\Database\Seeder;

class ConsulateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Jakarta consulate
        $jakarta = Consulate::create([
            'name' => 'Jakarta',
            'notes' => 'Head office consulate',
            'metadata' => [
                'region' => 'Java',
                'country' => 'Indonesia',
            ],
            'created_by' => 'system',
        ]);

        // Add cities to Jakarta consulate
        $cityIds = [3171, 3172, 3173, 3174, 3175];
        
        foreach ($cityIds as $cityId) {
            ConsulateCity::create([
                'consulate_id' => $jakarta->id,
                'city_id' => (string) $cityId,
            ]);
        }
    }
}
