<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IndonesiaVillageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $csvFile = fopen(base_path("database/factories/indonesia_villages.csv"), "r");
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
                    DB::table('indonesia_villages')->insert($data);
                    $data = [];
                }
            } else {
                $headers = $row;
                $firstline = false;
            }
        }
        
        if (count($data) > 0) {
            DB::table('indonesia_villages')->insert($data);
        }
        
        fclose($csvFile);
    }
}
