<?php

namespace Database\Seeders;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\EventPackage;
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
            'infak_rules' => [
                'enabled' => true,
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
                ],
            ],
        ]);

        // Create Event Packages
        $packageFree = EventPackage::create([
            'event_id'       => $event->id,
            'name'           => 'Paket A – Reguler',
            'description'    => 'Akses masuk ke acara reuni akbar Muleh. Sudah termasuk semua item merchandise, masing-masing 2 pcs.',
            'price'          => 0,
            'stock_quantity' => null,
        ]);

        $packageVip = EventPackage::create([
            'event_id'       => $event->id,
            'name'           => 'Paket B – VIP',
            'description'    => 'Akses masuk jalur khusus dengan fasilitas prioritas. Sudah termasuk semua item merchandise, masing-masing 1 pcs.',
            'price'          => 150000,
            'stock_quantity' => 50,
        ]);

        // Create event add-ons (merchandise)
        $addonTshirt = EventAddon::create([
            'event_id'       => $event->id,
            'name'           => 'Kaos Muleh (T-Shirt)',
            'price'          => 75000,
            'stock_quantity' => 500,
            'variants'       => [
                'size'  => ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                'color' => ['Hitam', 'Putih', 'Hijau Tua'],
            ],
        ]);

        $addonToteBag = EventAddon::create([
            'event_id'       => $event->id,
            'name'           => 'Tote Bag Premium',
            'price'          => 50000,
            'stock_quantity' => 300,
            'variants'       => [
                'design'   => ['Design A', 'Design B'],
                'material' => ['Cotton', 'Canvas'],
            ],
        ]);

        $addonMerchPack = EventAddon::create([
            'event_id'       => $event->id,
            'name'           => 'Merchandise Pack (Pin + Stiker + Bookmark)',
            'price'          => 35000,
            'stock_quantity' => 400,
            'variants'       => null,
        ]);

        // --- Attach included addons to each package ---
        // Paket A: all 3 addons, 2 pcs each
        $packageFree->includedAddons()->attach([
            $addonTshirt->id   => ['included_quantity' => 2],
            $addonToteBag->id  => ['included_quantity' => 2],
            $addonMerchPack->id => ['included_quantity' => 2],
        ]);

        // Paket B: all 3 addons, 1 pc each
        $packageVip->includedAddons()->attach([
            $addonTshirt->id   => ['included_quantity' => 1],
            $addonToteBag->id  => ['included_quantity' => 1],
            $addonMerchPack->id => ['included_quantity' => 1],
        ]);
    }
}
