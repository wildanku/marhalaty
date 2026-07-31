# Fase 8 — Integrasi Produk Toko ke Modul Event

Ref: `docs/plan/mvp2/8-event-product-integration.md`

Dikerjakan sebagai fork paralel dengan Fase 9 (Satutera untuk event). Scope boundary: TIDAK menyentuh
`app/Domains/Event/Controllers/RsvpController.php` dan `resources/js/Pages/Event/Show.tsx` — itu
diwire oleh coordinator setelah kedua fork selesai. `RsvpAddonResolver` dibangun lengkap & siap
pakai, tapi belum dipanggil dari controller manapun. Lihat catatan handoff di akhir file ini.

## 8a — Fondasi (aditif) — SELESAI

- [x] Migration: `event_addons` tambah `product_id`/`product_variant_id`/`stock_source`
- [x] Migration: tabel baru `product_reservations`
- [x] Migration: trigger delete-tracking untuk `product_reservations`
- [x] Registrasi observer `ProductReservation::observe(DeletedItemObserver::class)`
- [x] Registrasi observer `Rsvp::observe(DeletedItemObserver::class)` (gap lama, temuan #6 di doc)
- [x] Model `ProductReservation` (`App\Domains\Store\Models`)
- [x] `App\Domains\Store\Services\ProductStockService` (reserve/releaseFor/fulfill/availableFor)
- [x] `EventAddon` model: relasi `product()`/`variant()`, accessor `available_stock`/`is_product_linked`/`variant_options`
- [x] `RsvpAddonResolver` (`App\Domains\Event\Services`) — TIDAK dipanggil dari RsvpController (di luar scope fork ini)
- [x] Config `config/events.php` (`rsvp_expiry_minutes`)

## 8c (sebagian) — Jalur pelepasan stok — SELESAI

- [x] `RsvpObserver`: status → expired/failed atau delete ⇒ `ProductStockService::releaseFor()` (otomatis lewat event `updating`/`deleted`)
- [x] `Event\PaymentController::cancel()`: **tidak perlu perubahan kode** — `forceDelete()` pada model tanpa `SoftDeletes` adalah alias `delete()` di Laravel (dikonfirmasi baca source `Model.php`), jadi event `deleted` tetap terpicu dan `RsvpObserver` otomatis melepas reservasi. Ditambah komentar penjelas saja.
- [x] `GodMode\EventController::participantDestroy()`: sama — `$rsvp->delete()` sudah otomatis lewat observer, komentar diperbarui
- [x] Command `events:expire-unpaid-rsvps` (pola `ExpireStoreOrders`, dua pengecualian: bukti manual belum direview tidak expired; RSVP tanpa reservasi tetap diproses normal) + dijadwalkan hourly di `routes/console.php`

## 8b — Penautan god-mode — SELESAI

- [x] Endpoint `GET /god-mode/api/products/search` (`ProductSearchController`, termasuk varian per produk)
- [x] Modal "Ambil dari Produk Toko" di `Pages/GodMode/Events/Addons/Index.tsx` (`LinkProductModal`, komponen terpisah — modal "Create Addon" lama tidak disentuh)
- [x] Endpoint `POST /god-mode/events/{event}/addons/from-product` (`EventAddonController::storeFromProduct`)
- [x] Lencana "Dari toko: {nama}" + stok read-only untuk addon tertaut (tabel + modal edit)
- [x] Penolakan produk digital saat penautan (`ValidationException`, pesan jelas — D28)
- [x] Penanganan hapus produk yang masih tertaut: `ProductService::destroy()` cek tautan dulu, pesan menyebut nama event, bukan 500 mentah. (Toko tidak pernah hard-delete di codebase ini — dicek, tidak ada method destroy untuk Store — jadi risiko "hapus toko" di dokumen tidak reachable, tidak perlu penanganan tambahan.)

## 8d — Rekap penyiapan barang — SELESAI

- [x] Endpoint `GET /god-mode/events/{event}/api-product-reservations` (`EventController::apiProductReservations`) — MarhalahScope dicabut eksplisit untuk resolusi nama peserta (README §7 risk)
- [x] Tampilan admin: `ProductReservationsRecap` di tab "Addon" pada `Pages/GodMode/Events/Show.tsx` (komponen self-fetching, aditif — tidak mengubah data/props existing)
- [x] Endpoint `GET /my/stores/{store}/api-event-reservations` (`StoreEventReservationController::index`)
- [x] Halaman penjual `Pages/Store/Manage/EventReservations/Index.tsx` + route `GET /my/stores/{store}/event-reservations` + kartu link baru di `Manage/Dashboard.tsx` (grid 3→4 kolom)
- [x] Aksi tandai `fulfilled` — `POST /god-mode/events/{event}/product-reservations/{reservation}/fulfill`, per-item (bukan massal — cukup untuk DoD, massal dicatat sebagai follow-up)

## Verifikasi — SELESAI

- [x] Smoke test tinker end-to-end lengkap (lihat detail di bawah) — semua lulus, data uji dibersihkan dari DB dev
- [x] `php -l` semua file bersih; `vendor/bin/pint` (file spesifik, bukan `--dirty`) bersih — 2 file butuh reformat (`RsvpAddonResolver.php`, `EventController.php`), sudah diperbaiki
- [x] `pnpm build` + `tsc --noEmit` bersih
- [x] `php artisan test` — tanpa regresi baru (1 kegagalan pre-existing tak terkait)
- [x] Data uji dibersihkan dari DB dev (termasuk koreksi manual 1 unit stok varian yang salah hitung akibat skrip cleanup manual — bukan bug di `ProductStockService`, sudah diverifikasi terpisah)

## Smoke test yang dijalankan (semua via tinker)

1. `ProductStockService::reserve()` dengan variant terkunci — stok variant terpotong benar, `ProductReservation` dibuat dengan `status=reserved`.
2. Transisi RSVP → `expired` men-trigger `RsvpObserver::updating()` → `releaseFor()` otomatis — stok kembali benar, reservasi jadi `status=released`.
3. Idempotensi: `releaseFor()` dipanggil dua kali → panggilan kedua no-op (return 0), stok tidak dobel-kredit.
4. `events:expire-unpaid-rsvps`: RSVP lama + tanpa bukti → expired; RSVP lama + bukti manual belum direview → **tidak** expired (dikecualikan dengan benar).
5. `restrictOnDelete`: hapus produk yang tertaut addon → `QueryException` (dikonfirmasi terblokir di level DB); `ProductService::destroy()` sekarang menolak lebih awal dengan pesan jelas.
6. `EventAddonController::storeFromProduct()` — linking addon ke produk dengan variant terkunci berhasil, accessor `is_product_linked`/`available_stock`/`variant_options` semua benar.
7. `RsvpAddonResolver::resolve()` — kasus addon terkunci-variant (2 unit → 1 reservasi qty=2); kasus **buyer pilih varian per-unit** dengan 2 unit ke 2 variant BERBEDA → 2 reservasi terpisah, masing-masing qty=1, dikelompokkan benar per variant (ini bagian paling berisiko secara teknis di seluruh fase, sesuai catatan dokumen §1 temuan #3).
8. Error path: jumlah `variant_slots` tidak cocok dengan `quantity` → `ValidationException` jelas; kombinasi varian yang tidak ada di produk → `ValidationException` jelas.
9. `EventController::apiProductReservations()` — recap benar menunjukkan pending/paid/fulfilled per produk+varian, nama peserta ter-resolve lewat `Rsvp::withoutGlobalScope(MarhalahScope::class)` (menutup risiko README §7).
10. `EventController::fulfillProductReservation()` — transisi reserved→fulfilled tanpa menyentuh stok (sesuai desain), recap ter-update.
11. `StoreEventReservationController::index()` — recap penjual benar menampilkan event, produk, variant, dan jumlah fulfilled, tanpa info pembayaran (sesuai D30).

## Catatan penting untuk coordinator (wiring RsvpController + Event/Show.tsx)

### `RsvpAddonResolver::resolve()` — signature & cara pakai

```php
public function resolve(Model $reservable, Event $event, array $validated, ?EventPackage $package): array
```

- **`$reservable`** — `Rsvp` yang **sudah dibuat** (`Rsvp::create([...])` harus jalan dulu, resolver butuh
  `$reservable->getKey()` untuk mengisi `product_reservations.reservable_id`). Jadi urutan di
  `RsvpController@store` harus: buat `$rsvp` → panggil `resolve($rsvp, $event, $validated, $package)` →
  baru pakai hasilnya untuk update `$rsvp->add_ons_snapshot` dan `$rsvp->total_amount`.
- **`$validated`** — persis array hasil `$request->validate([...])` yang sudah ada hari ini di
  `RsvpController@store` (kunci: `addons`, `purchased_addon_variants`, `purchased_addon_forms`,
  `included_addon_variants`, `included_addon_forms`). Tidak perlu bentuk baru — lempar langsung.
- **`$package`** — `EventPackage` yang sudah di-`lockForUpdate()->firstOrFail()` di controller (kalau
  `event_package_id` diisi), atau `null`. Resolver akan `loadMissing('includedAddons')` sendiri.
- **Return** `[$snapshot, $addonTotal, $reservations]`:
  - `$snapshot` — array baris **identik bentuknya** dengan yang RsvpController hasilkan hari ini
    (kunci `id`/`name`/`price`/`quantity`/`variant_slots`/`form`/`total` untuk addon dibeli;
    `id`/`name`/`price`/`quantity`/`variants`/`form`/`total`/`is_included` untuk addon included) — langsung
    assign ke `$rsvp->add_ons_snapshot` seperti sekarang, tidak perlu transformasi.
  - `$addonTotal` — float, jumlahkan ke `$totalAmount` (ganti loop manual `$totalAmount += $itemTotal`
    yang ada sekarang dengan `$totalAmount = $packageAmount + $infakAmount + $addonTotal`).
  - `$reservations` — array `ProductReservation` yang sudah dibuat (stok sudah dipotong). Controller
    **tidak perlu melakukan apa pun** dengan ini lebih lanjut — murni untuk logging/debugging kalau perlu.
- **Exception**: melempar `ValidationException::withMessages(['addons' => ...])` — sudah bentuk yang sama
  dengan kode lama, tinggal biarkan bubble up seperti sekarang (dipanggil di dalam `DB::transaction()`
  yang sama, jadi rollback otomatis termasuk reservasi & stok).
- **Wajib jalan di dalam `DB::transaction()`** yang sama dengan pembuatan `$rsvp` — semua kunci
  `lockForUpdate()` di dalam resolver/`ProductStockService` mengasumsikan itu.

### `RsvpObserver` sekarang otomatis melepas reservasi

`RsvpController@update` (edit RSVP, ganti pilihan varian) **belum** disentuh fork ini — dokumen §6
minta perpindahan reservasi (lepas + reservasi ulang) saat pilihan varian addon tertaut diubah lewat
`Rsvp/Edit.tsx`. Ini murni di luar scope fork ini (perubahan controller), tapi
`ProductStockService::releaseFor()` + `reserve()` sudah siap dipakai untuk itu — polanya: dalam satu
`DB::transaction()`, panggil `releaseFor()` untuk reservasi lama addon tersebut (perlu query manual by
`event_addon_id` + `reservable_id`, `releaseFor()` hari ini melepas SEMUA reservasi milik reservable,
bukan per-addon — kalau RSVP itu bukan hanya punya satu addon tertaut, perlu helper baru atau filter
tambahan di `ProductStockService` sebelum dipakai untuk kasus edit-per-addon ini).

### File yang TIDAK disentuh sama sekali oleh fork ini (sesuai scope)

`RsvpController.php`, `Event/Show.tsx`, `Rsvp/Edit.tsx` — `RsvpController@update` juga belum diubah untuk
memindahkan reservasi saat edit varian (di luar scope, dicatat sebagai pekerjaan lanjutan).

## 8c (wiring) — Coordinator, setelah fork Fase 8 & 9 selesai — SELESAI

- [x] `RsvpController@store` dipanggil `RsvpAddonResolver::resolve()` setelah `Rsvp::create()`, menggantikan dua loop addon inline lama; `total_amount` & `add_ons_snapshot` di-update setelah resolusi
- [x] `EventController::show()` (publik) eager-load `addons.product.variants` + `packages.includedAddons.product.variants` — menutup risiko N+1 yang dicatat dokumen §8
- [x] `resources/js/types/index.d.ts`: `EventAddon` ditambah `is_product_linked`, `available_stock`, `variant_options`, `product_id`/`product_variant_id`
- [x] `Event/Show.tsx`: clamp stok addon pakai `available_stock` (bukan `stock_quantity` mentah); 6 titik baca `addon.variants` untuk opsi varian diganti `effectiveVariants` (`is_product_linked ? variant_options : variants`) di 4 tempat — **termasuk jalur "buyer pilih varian per-unit"** yang jadi bagian tersulit fase ini; badge "Diambil saat acara" ditambahkan di kartu addon included & purchased
- [x] Smoke test terpadu via tinker: RSVP dengan addon tertaut (locked variant) + Satutera → reservasi terbuat, stok terpotong; webhook `paid` → RSVP `paid`, reservasi **tetap** `reserved` (D25); RSVP kedua dengan webhook `failed` → reservasi `released`, stok kembali, dipanggil dua kali tidak dobel-kredit (idempotensi). Data uji dibersihkan.

**Belum dikerjakan (di luar lingkup, dicatat sebagai lanjutan):** `RsvpController@update`/`Rsvp/Edit.tsx` belum memindahkan reservasi saat buyer ganti pilihan varian setelah RSVP dibuat (fork sudah mencatat ini di luar scope-nya juga).

### Kejadian selama pengerjaan: file disentuh pihak lain di luar fork ini

`routes/web.php`, `config/payments.php`, `CheckoutService.php`, beberapa halaman `Payment/*.tsx` diedit
oleh fork Fase 9 (diharapkan, sesuai briefing). **Di luar dugaan**: `app/Domains/GodMode/Controllers/EventController.php`
juga disentuh pihak ketiga (bukan fork Fase 9 — menambahkan `AddonsSheet`/`InfakSheet`/`ParticipantsSheet`
untuk fitur export multi-sheet baru, tidak terkait Fase 8/9). Perubahan saya di file itu (`apiProductReservations`,
`fulfillProductReservation`) tetap utuh dan lolos `php -l` + resolusi container setelah itu, tapi coordinator
perlu tahu file ini sedang diedit di luar kedua fork — kemungkinan besar oleh user langsung secara paralel.
