<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CountrySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $csvFile = fopen(base_path("database/factories/countries.csv"), "r");
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
                
                if (isset($record['unMember'])) {
                    $record['unMember'] = filter_var($record['unMember'], FILTER_VALIDATE_BOOLEAN);
                }

                $data[] = $record;
                if (count($data) >= 500) {
                    DB::table('countries')->insert($data);
                    $data = [];
                }
            } else {
                $headers = $row;
                $firstline = false;
            }
        }
        
        if (count($data) > 0) {
            DB::table('countries')->insert($data);
        }
        
        fclose($csvFile);
    }
}
