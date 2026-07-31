# Fase 8b — Harga per-varian untuk Event Addon (mirip Product/ProductVariant)

Ref: `docs/plan/mvp2/8-event-product-integration.md` (addendum, supersede D26) — rencana lengkap di
plan mode session, ringkasan keputusan ada di addendum dokumen tsb.

Latar: D26 sengaja membuat harga addon flat untuk semua varian saat tertaut produk. Permintaan baru:
`event_addons` mirip `products` — harga variabel per kombinasi (maks 2 grup opsi), berlaku untuk
addon manual maupun tertaut produk. Saat tertaut, harga default per kombinasi = harga varian produk
(disalin sekali saat linking), admin boleh menimpa per kombinasi.

Kendala penting dari riset konsumen `add_ons_snapshot`: **tidak boleh memecah 1 baris snapshot addon
jadi banyak baris** — `RsvpController@update` & `Rsvp/Edit.tsx` mengunci key per `addon.id` tunggal.
Snapshot tetap 1 baris per addon; hanya `price`(rata-rata)/`total`(akurat) yang dihitung ulang.

## Database

- [x] Migration `2026_07_31_100000_add_variant_pricing_to_event_addons.php`: kolom `has_variants`/`options`/`form_fields` di `event_addons`; tabel baru `event_addon_variants`
- [x] Backfill: `variants->forms` → `form_fields`; addon manual ber-opsi lama → `options`+`event_addon_variants` (harga = harga addon saat ini); addon tertaut-tak-terkunci → `options`+`event_addon_variants` per varian aktif produk (harga = harga addon saat ini, BUKAN harga produk) — dijalankan di DB dev, diverifikasi manual terhadap 5 addon nyata (termasuk satu tertaut produk dengan harga varian produk yang beda dari harga addon)
- [x] Drop kolom `variants` lama
- [x] Registrasi `EventAddonVariant::observe(DeletedItemObserver::class)` di `AppServiceProvider`
- [x] `event_addons.price` dibuat nullable (gap ditemukan saat smoke test — kolom lama `NOT NULL`, migration diperbaiki sebelum dianggap selesai)

## Model

- [x] `App\Domains\Event\Models\EventAddonVariant` (baru, mirror `ProductVariant`)
- [x] `EventAddon`: fillable/casts diperbarui, relasi `variants()`, `getVariantOptionsAttribute()` dari `options`, `getDisplayPriceAttribute()` baru

## Backend — service & validasi

- [x] `App\Domains\Event\Services\EventAddonService` (baru): `saveAddon()`, `linkFromProduct()`, `assertVariantsMatchOptions()`, `syncVariants()`
- [x] `EventAddonController`: `store()`/`update()`/`storeFromProduct()` delegasi ke service, validasi baru (`has_variants`, `options`, `variants.*.price`, dst.)
- [x] `ProductSearchController::index()`: tambah `option1_name/value`, `option2_name/value` per varian

## Backend — RSVP pricing

- [x] `RsvpAddonResolver`: cocokkan slot ke `EventAddonVariant` (bukan `product->variants` langsung), harga per unit dari varian yang cocok, reservasi stok hanya kalau `product_variant_id` terisi, `total` akurat + `price` = rata-rata

## Frontend

- [x] `resources/js/types/index.d.ts`: `EventAddon` — hapus `variants` lama, tambah `has_variants`, `display_price`, `form_fields`, `variants: EventAddonVariant[]` (dipakai langsung sebagai daftar harga per kombo, bukan field terpisah `variant_prices`)
- [x] `resources/js/Components/Event/AddonVariantEditor.tsx` (baru, adaptasi `VariantEditor.tsx` — kombinasi + harga saja; input polos gaya God-mode dipakai, bukan `CurrencyInput` — token warna M3-nya salah tema untuk modal gelap God-mode)
- [x] `GodMode/Events/Addons/Index.tsx`: toggle "Punya Varian?" + `AddonVariantEditor` di form manual (juga dipakai read-combo-locked untuk addon tertaut ber-varian); `LinkProductModal` — tabel harga per kombo prefilled dari produk saat tak dikunci; kartu addon tampilkan rentang harga; form fields custom dipisah jadi textarea JSON tersendiri
- [x] `Event/Show.tsx`: sederhanakan `is_product_linked ? variant_options : variants` → `variant_options` langsung (4 titik); baca form dari `form_fields` (bukan `variants.forms`, 3 titik); `resolveAddonUnitPrice` helper + perbaikan `totals` (sum per-slot lewat `event.addons` + `purchased_addon_variants`, bukan `price*qty` datar); tampilan harga "mulai dari" saat `has_variants`
- [x] `EventController::show()`: eager-load `addons.product`/`addons.variant`/`addons.variants` dan setara untuk `packages.includedAddons` (ganti dari `addons.product.variants`)
- [x] `resources/js/Pages/Rsvp/Edit.tsx` — ditemukan saat `tsc`, di luar rencana awal: halaman ini juga baca `originalAddon.variants`/`.forms` dari katalog event, diperbaiki dengan pola yang sama (`variant_options`/`form_fields`)

## Dokumentasi & verifikasi

- [x] Addendum singkat di `docs/plan/mvp2/8-event-product-integration.md` (§11, supersede D26)
- [x] Smoke test lewat tinker (bukan PHPUnit — lihat catatan di bawah): addon manual 2 grup opsi harga beda → update mengganti 1 kombo & drop 1 kombo (upsert+deactivate benar); link produk ber-varian tanpa kunci → harga per kombo tersalin dari produk, override dihormati; RSVP beli 2 unit addon manual varian beda harga → `total` akurat (bukan `price*qty` naif), `price` snapshot = rata-rata; RSVP addon tertaut ber-varian → 1 reservasi per varian berbeda, stok terpotong benar, transaksi rollback mengembalikan stok
- [x] Regresi (tinker): addon terkunci ke satu varian → jalur lama utuh (`has_variants=false`, tanpa baris `event_addon_variants`); addon lama tanpa varian sama sekali → tidak tersentuh; addon tertaut ber-varian yang di-*include* di paket → reservasi stok jalan, harga tetap 0 (D25/D30 utuh)
- [x] `vendor/bin/pint --dirty` bersih; `pnpm build` + `tsc --noEmit` bersih (0 error di seluruh proyek)
- [ ] **Gap yang ditemukan, bukan diperbaiki (di luar lingkup pekerjaan ini):** `php artisan test` tidak bisa dipakai untuk regresi — repo ini tidak punya factory/scaffolding test untuk domain Event/Store (`database/factories/` cuma ada `UserFactory`), dan test bawaan (`ExampleTest`) sendiri sudah gagal di baseline sebelum perubahan ini (`sqlite :memory:` tidak pernah di-migrate). Verifikasi di atas memakai tinker terhadap DB dev nyata, pola yang sama dipakai fase 8 asli.
- [ ] Smoke test manual via browser (`composer dev`) — belum dilakukan; baru diverifikasi lewat tinker + `tsc`/`build`. Disarankan sebelum rilis: buat addon manual ber-varian di god-mode, RSVP dengan 2 varian beda harga, cek total & snapshot; tautkan addon ke produk ber-varian, cek harga ter-prefill, override, RSVP ulang.
