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
        // Create the "Muleh" event (Reuni Alumni Angkatan 2013)
        $event = Event::create([
            'title' => 'Muleh - Reuni Alumni Angkatan 2013',
            'slug' => 'muleh',
            'description' => <<<'HTML'
<header style="text-align: center;">
    <h2 style="color: #d32f2f;">Panggilan Pulang untuk Alumni 2013 🚩</h2>
    <p style="font-style: italic; color: #555;">"Setiap perjalanan selalu punya tempat untuk pulang."</p>
</header>

<hr>

<section>
    <p>
        Teman-teman, <strong>13 tahun perjalanan kita</strong> mungkin membawa kita ke arah yang berbeda-beda. Namun, akar kita tetap sama. Di ambang satu abad Gontor, mari kembali ke titik nol tempat kita ditempa.
    </p>
    <p style="font-weight: bold; text-align: center;">
        Hadiri Reuni Alumni Angkatan 2013 & Silaturahim bersama Bapak Pimpinan Pondok.
    </p>
</section>

<section style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #2e7d32; margin: 20px 0;">
    <h3 style="margin-top: 0;">Waktu & Tempat:</h3>
    <ul style="list-style: none; padding-left: 0;">
        <li>📍 <strong>Pondok Modern Darussalam Gontor, Ponorogo</strong></li>
        <li>📅 <strong>10-11 Juli 2026</strong></li>
    </ul>
</section>

<section>
    <h3>Investasi Ukhuwah (HTM):</h3>
    <p style="font-size: 1.2em; font-weight: bold; color: #2e7d32;">Rp 113.687</p>
    <p style="font-size: 0.9em; color: #666;">
        (Include: Kaos, Topi, Lanyard, Gantungan Kunci, Goodie Bag, Makan & Penginapan)
    </p>
</section>

<section>
    <h3>Narahubung:</h3>
    <ul style="list-style: none; padding-left: 0;">
        <li>👉 <strong>Zidni Aulia:</strong> <a href="tel:081213266217">0812 1326 6217</a></li>
        <li>📱 <strong>Instagram:</strong> <a href="https://instagram.com/dynamic_687">@dynamic_687</a></li>
    </ul>
</section>

<div style="margin-top: 30px; text-align: center;">
    <p><strong>Registrasi:</strong> click link di bio instagram (soon)</p>
    <p style="margin-top: 20px; font-weight: bold; color: #1565c0;">
        Mari kembali merajut ukhuwah lillah dalam kebersamaan 687.
    </p>
</div>
HTML,
            'location' => 'Pondok Modern Darussalam Gontor, Ponorogo',
            'event_date' => '2026-07-10 09:00:00',
            'infak_rules' => [
                'enabled' => true,
                'options' => [10000, 20000, 50000, 100000, 500000, 1000000],
                'allow_custom' => true,
                'min_custom' => 10000,
                'currency' => 'IDR',
                'description' => 'Infak untuk mendukung keberlangsungan acara',
            ],
            'visibility_scope' => null,
            'metadata' => [
                'addon_description' => '',
                'addon_images' => [],
                'custom_forms' => [
                    [
                        'id' => 'keberangkatan',
                        'label' => 'Keberangkatan',
                        'type' => 'radio',
                        'options' => ['kendaraan pribadi', 'transportasi umum', 'rombongan wilayah'],
                        'required' => true,
                    ],
                    [
                        'id' => 'jumlah_rombongan',
                        'label' => 'Berapa orang yang akan berangkat dengan antum (istri, anak, keluarga)?',
                        'type' => 'number',
                        'required' => true,
                    ],
                ],
            ],
        ]);

        // Create Event Addons (Merchandise)
        $addonKaos = EventAddon::create([
            'event_id'       => $event->id,
            'name'           => 'Kaos',
            'price'          => 80000,
            'stock_quantity' => 500,
            'variants'       => [
                'size' => ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
            ],
        ]);

        $addonKeychain = EventAddon::create([
            'event_id'       => $event->id,
            'name'           => 'Gantungan Kunci',
            'price'          => 5000,
            'stock_quantity' => 1000,
            'variants'       => null,
        ]);

        $addonGodieBag = EventAddon::create([
            'event_id'       => $event->id,
            'name'           => 'Goodie Bag',
            'price'          => 5000,
            'stock_quantity' => 1000,
            'variants'       => null,
        ]);

        // Create Event Packages
        $packages = [
            [
                'name' => 'Basic',
                'description' => 'Paket basic sudah dapat kaos, makan 3x dan nginep bareng bareng',
                'price' => 113687,
                'addons' => [
                    $addonKaos->id => 1,
                    $addonKeychain->id => 1,
                    $addonGodieBag->id => 1,
                ],
            ],
            [
                'name' => 'GBS',
                'description' => 'Paket dengan hotel (Tipe Kamar A Wisma IKPM) dan merchandise untuk istri',
                'price' => 503687,
                'addons' => [
                    $addonKaos->id => 2,
                    $addonKeychain->id => 2,
                    $addonGodieBag->id => 2,
                ],
            ],
            [
                'name' => 'GBK',
                'description' => 'Paket dengan hotel (Tipe Kamar B Wisma IKPM) dan merchandise untuk istri',
                'price' => 473687,
                'addons' => [
                    $addonKaos->id => 2,
                    $addonKeychain->id => 2,
                    $addonGodieBag->id => 2,
                ],
            ],
            [
                'name' => 'Wisma Hadi',
                'description' => 'Paket dengan hotel (Tipe Kamar A Wisma IKPM) dan merchandise untuk istri (kaos aja)',
                'price' => 443687,
                'addons' => [
                    $addonKaos->id => 2,
                    $addonKeychain->id => 1,
                    $addonGodieBag->id => 1,
                ],
            ],
            [
                'name' => 'Darul Hijrah',
                'description' => 'Paket dengan hotel (Tipe Kamar B Wisma IKPM) dan merchandise untuk istri (kaos aja)',
                'price' => 413687,
                'addons' => [
                    $addonKaos->id => 2,
                    $addonKeychain->id => 1,
                    $addonGodieBag->id => 1,
                ],
            ],
            [
                'name' => 'Solihin',
                'description' => 'Paket dengan hotel (Tipe Kamar A Wisma IKPM)',
                'price' => 363687,
                'addons' => [
                    $addonKaos->id => 1,
                    $addonKeychain->id => 1,
                    $addonGodieBag->id => 1,
                ],
            ],
            [
                'name' => 'Yaman',
                'description' => 'Paket dengan hotel (Tipe Kamar B Wisma IKPM)',
                'price' => 333687,
                'addons' => [
                    $addonKaos->id => 1,
                    $addonKeychain->id => 1,
                    $addonGodieBag->id => 1,
                ],
            ],
        ];

        foreach ($packages as $packageData) {
            $addons = $packageData['addons'];
            unset($packageData['addons']);

            $package = EventPackage::create([
                'event_id' => $event->id,
                ...$packageData,
                'stock_quantity' => null,
            ]);

            $attachData = [];
            foreach ($addons as $addonId => $quantity) {
                $attachData[$addonId] = ['included_quantity' => $quantity];
            }

            $package->includedAddons()->attach($attachData);
        }
    }
}
