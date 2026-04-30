<?php

namespace Database\Seeders;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create the "Muleh" event (Reuni Akbar Dynamic di Gontor)
        $event = Event::create([
            'title' => 'Muleh - Reuni Akbar Dynamic di Gontor',
            'slug' => 'muleh-reuni-akbar-dynamic',
            'description' => 'Muleh adalah sebuah acara reuni akbar yang menghadirkan seluruh alumni Dynamic untuk berkumpul kembali dan mempererat silaturahmi. Acara ini diadakan untuk merayakan persatuan, berbagi pengalaman, dan memperkuat jaringan alumni di berbagai bidang kehidupan. Dengan berbagai kegiatan menarik, hiburan, dan kesempatan networking, Muleh menjadi momentum yang tepat untuk menyegarkan kenangan indah masa sekolah dan membangun kolaborasi yang berkelanjutan antar alumni.',
            'location' => 'Ponorogo, Jawa Timur',
            'event_date' => '2026-07-20 09:00:00',
            'payment_type' => 'flexible',
            'pricing_rules' => [
                'options' => [20000, 50000, 100000],
                'allow_custom' => true,
                'min_custom' => 10000,
                'currency' => 'IDR',
                'description' => 'Infak untuk mendukung keberlangsungan acara',
            ],
            'visibility_scope' => null,
            'metadata' => [
                'custom_forms' => [
                    [
                        'id' => 'nama',
                        'label' => 'Nama Lengkap',
                        'type' => 'text',
                        'required' => true,
                        'placeholder' => 'Masukkan nama lengkap Anda',
                    ],
                    [
                        'id' => 'alamat',
                        'label' => 'Alamat',
                        'type' => 'textarea',
                        'required' => true,
                        'placeholder' => 'Masukkan alamat lengkap Anda (Jalan, Kelurahan, Kecamatan, Kota, Provinsi)',
                    ],
                ],
            ],
        ]);

        // Create event add-ons (merchandise)
        EventAddon::create([
            'event_id' => $event->id,
            'name' => 'Kaos Muleh (T-Shirt)',
            'price' => 75000,
            'stock_quantity' => 500,
            'variants' => [
                'size' => ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                'color' => ['Hitam', 'Putih', 'Hijau Tua'],
            ],
        ]);

        EventAddon::create([
            'event_id' => $event->id,
            'name' => 'Tote Bag Premium',
            'price' => 50000,
            'stock_quantity' => 300,
            'variants' => [
                'design' => ['Design A', 'Design B'],
                'material' => ['Cotton', 'Canvas'],
            ],
        ]);

        EventAddon::create([
            'event_id' => $event->id,
            'name' => 'Merchandise Pack (Pin + Stiker + Bookmark)',
            'price' => 35000,
            'stock_quantity' => 400,
            'variants' => null,
        ]);
    }
}
