<?php

namespace Database\Seeders;

use App\Models\Option;
use Illuminate\Database\Seeder;

class ProfessionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $professions = [
            // Profesi yang sangat umum di kalangan alumni
            ['key' => 'profession', 'name' => 'Pengasuh Pesantren', 'value' => 'pengasuh_pesantren', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Pendidik / Guru (Ustadz/Ustazah)', 'value' => 'pendidik', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Dosen / Akademisi', 'value' => 'akademisi', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Ulama / Pendakwah', 'value' => 'pendakwah', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Pengusaha / Wirausaha', 'value' => 'wirausaha', 'type' => 'string'],
            
            // Sektor Pemerintahan dan Kedinasan
            ['key' => 'profession', 'name' => 'Pegawai Negeri Sipil (PNS)', 'value' => 'pns', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'TNI / Polri', 'value' => 'tni_polri', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Politisi / Pejabat Publik', 'value' => 'politisi', 'type' => 'string'],
            
            // Profesional dan Swasta
            ['key' => 'profession', 'name' => 'Karyawan Swasta / Profesional', 'value' => 'karyawan_swasta', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Penulis / Jurnalis / Media', 'value' => 'media_jurnalis', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Tenaga Kesehatan (Dokter, Perawat, dll)', 'value' => 'tenaga_kesehatan', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Praktisi IT / Engineer', 'value' => 'engineer', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Keuangan / Perbankan (Syariah/Konvensional)', 'value' => 'keuangan', 'type' => 'string'],
            
            // Status Lainnya
            ['key' => 'profession', 'name' => 'Mahasiswa / Pelajar', 'value' => 'mahasiswa', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Pensiunan', 'value' => 'pensiunan', 'type' => 'string'],
            ['key' => 'profession', 'name' => 'Lainnya', 'value' => 'lainnya', 'type' => 'string'],
        ];

        foreach ($professions as $profession) {
            Option::create($profession);
        }
    }
}
