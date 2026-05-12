<?php

namespace Database\Seeders;

use App\Models\Option;
use Illuminate\Database\Seeder;

class EducationOptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $educations = [
            ['key' => 'education', 'name' => 'KMI', 'value' => 'kmi', 'type' => 'string'],
            ['key' => 'education', 'name' => 'SMA (Sekolah Menengah Atas)', 'value' => 'sma', 'type' => 'string'],
            ['key' => 'education', 'name' => 'Diploma (D1/D2/D3)', 'value' => 'diploma', 'type' => 'string'],
            ['key' => 'education', 'name' => 'S1 (Sarjana)', 'value' => 's1', 'type' => 'string'],
            ['key' => 'education', 'name' => 'S2 (Magister)', 'value' => 's2', 'type' => 'string'],
            ['key' => 'education', 'name' => 'S3 (Doktor)', 'value' => 's3', 'type' => 'string'],
            ['key' => 'education', 'name' => 'Lainnya', 'value' => 'lainnya', 'type' => 'string'],
        ];

        foreach ($educations as $education) {
            Option::create($education);
        }
    }
}

