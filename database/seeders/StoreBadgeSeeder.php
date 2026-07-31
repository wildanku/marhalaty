<?php

namespace Database\Seeders;

use App\Domains\Store\Models\StoreBadge;
use Illuminate\Database\Seeder;

class StoreBadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            [
                'code' => 'official',
                'name' => 'Official',
                'name_en' => 'Official',
                'description' => 'Toko resmi yang dikelola langsung oleh komunitas.',
                'icon' => 'verified',
                'color_token' => 'primary',
                'sort_order' => 1,
            ],
            [
                'code' => 'top_seller',
                'name' => 'Top Seller',
                'name_en' => 'Top Seller',
                'description' => 'Toko dengan performa penjualan terbaik.',
                'icon' => 'trophy',
                'color_token' => 'tertiary',
                'sort_order' => 2,
            ],
            [
                'code' => 'trusted',
                'name' => 'Trusted',
                'name_en' => 'Trusted',
                'description' => 'Toko yang sudah terpercaya dan konsisten melayani pembeli.',
                'icon' => 'shield_person',
                'color_token' => 'secondary',
                'sort_order' => 3,
            ],
        ];

        foreach ($badges as $badge) {
            StoreBadge::updateOrCreate(['code' => $badge['code']], $badge);
        }
    }
}
