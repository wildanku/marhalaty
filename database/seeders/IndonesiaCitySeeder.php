<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IndonesiaCitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $csvFile = fopen(base_path("database/factories/indonesia_cities.csv"), "r");
        $firstline = true;
        $headers = [];
        $data = [];
        
        while (($row = fgetcsv($csvFile, 4000, ",")) !== false) {
            if (!$firstline) {
                $record = array_combine($headers, $row);
                foreach ($record as $key => $value) {
                    if ($value === '') {
                        $record[$key] = null;
                    }
                }

                $data[] = $record;
                if (count($data) >= 500) {
                    DB::table('indonesia_cities')->insert($data);
                    $data = [];
                }
            } else {
                $headers = $row;
                $firstline = false;
            }
        }
        
        if (count($data) > 0) {
            DB::table('indonesia_cities')->insert($data);
        }
        
        fclose($csvFile);
    }
}
