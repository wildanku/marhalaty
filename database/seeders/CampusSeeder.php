<?php

namespace Database\Seeders;

use App\Models\Option;
use Illuminate\Database\Seeder;

class CampusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $campuses = [
            // Kampus Putra
            ['key' => 'campus', 'name' => 'Gontor Pusat, Ponorogo', 'value' => 'gontor_pusat', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 2, Ponorogo', 'value' => 'gontor_2', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 3, Kediri', 'value' => 'gontor_3', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 4, Banyuwangi', 'value' => 'gontor_4', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 5, Magelang', 'value' => 'gontor_5', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 6, Konawe Selatan', 'value' => 'gontor_6', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 7, Lampung Selatan', 'value' => 'gontor_7', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 8, Aceh Besar', 'value' => 'gontor_8', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 9, Solok', 'value' => 'gontor_9', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 10, Tanjung Jabung Timur', 'value' => 'gontor_10', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 11, Poso', 'value' => 'gontor_11', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor 12, Siak', 'value' => 'gontor_12', 'type' => 'string'],

            // Kampus Putri
            ['key' => 'campus', 'name' => 'Gontor Putri 1, Ngawi', 'value' => 'gontor_putri_1', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor Putri 2, Ngawi', 'value' => 'gontor_putri_2', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor Putri 3, Ngawi', 'value' => 'gontor_putri_3', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor Putri 4, Kediri', 'value' => 'gontor_putri_4', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor Putri 5, Konawe Selatan', 'value' => 'gontor_putri_5', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor Putri 6, Poso', 'value' => 'gontor_putri_6', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor Putri 7, Kampar', 'value' => 'gontor_putri_7', 'type' => 'string'],
            ['key' => 'campus', 'name' => 'Gontor Putri 8, Lampung Timur', 'value' => 'gontor_putri_8', 'type' => 'string'],
        ];

        foreach ($campuses as $campus) {
            Option::create($campus);
        }
    }
}
