# Fase 8 — Integrasi Produk Toko ke Modul Event

Sumber kebutuhan: [`docs/human-notes/ecommerce-note.txt`](../../human-notes/ecommerce-note.txt) §"Idea Part 3"
poin 1–2.

> Integerasikan produk di modul event … ketika user tambah event kemudian buat addon bisa attach
> atau ambil addon dari semua produk yg ada di database, kemudian jg bisa buat paket event dan
> include dari produk yg ada di database.
>
> Jika produk ada yg di initegerasikan ke event, maka gak ada opsi pengiriman, karena semua produk
> yg di beli lewat paket event sudah pasti pengambilan barang ketika event jadi gak ada handler
> untuk pengiriman.

Prasyarat: [Fase 2](./2-product-catalog.md) selesai (sudah). Tidak bergantung pada fase 6/7 —
bisa dikerjakan paralel dengan fase 7 yang sedang berjalan, karena tidak menyentuh satu pun file
pengaturan pembayaran.

Poin ke-3 dari "Idea Part 3" (pembayaran event lewat Satutera + transfer manual) dipisah ke
[9-event-payment-satutera.md](./9-event-payment-satutera.md), karena ketergantungannya berbeda:
fase 9 menunggu fase 7 selesai, fase 8 tidak.

---

## 1. Review catatan — kondisi sekarang vs yang diminta

### Yang sudah ada di modul Event

| Komponen | Bentuk hari ini |
| --- | --- |
| `event_addons` | `id` bigint, `event_id`, `name`, `price`, `stock_quantity` (int, default 0), `variants` (JSON bebas: grup varian + kunci `forms`), media `addon-images` |
| `event_packages` | `name`, `description`, `price`, `quota`/`booked_count`, relasi `includedAddons` lewat pivot `event_package_included_addons` (`included_quantity`) |
| Pengelolaan | Admin saja, di `/god-mode/events/{event}/addons` dan `/god-mode/events/{event}/packages` (`EventAddonController`, `EventPackageController`) |
| Pendaftaran | `RsvpController@store` — kuota paket dicek saat RSVP dibuat (di-*book* baru saat `paid` lewat `RsvpObserver`), stok addon di-`decrement` saat RSVP dibuat, semuanya di-snapshot ke `rsvps.add_ons_snapshot` (JSON) |
| Pembaca snapshot | `EventParticipantsExport`, `GodMode\EventController`, `TelegramService`, `Rsvp/Edit.tsx` |

### Yang sudah ada di modul Store

`products` + `product_variants` (ULID, `type` = `physical`/`digital`, stok di produk **atau** di varian,
maksimal 2 grup opsi, media `product-images` + `product-digital-file` di disk privat), dimiliki
`stores`. Stok toko dikurangi saat order dibuat dan dikembalikan lewat
`OrderFulfillmentService::releaseStock()` + command `store:expire-orders`.

### Temuan audit yang mengubah bentuk pekerjaan ini

Enam hal ditemukan saat membaca kode, dan semuanya mempengaruhi desain:

1. **Stok addon event tidak pernah kembali.** `Event\PaymentController::cancel()` menghapus RSVP
   (`forceDelete`) tanpa mengembalikan `stock_quantity` addon, dan tidak ada job kedaluwarsa untuk
   RSVP yang tidak dibayar (`rsvps` bahkan tidak punya kolom `expires_at`). Hari ini dampaknya
   terbatas pada angka lokal event. Begitu addon menunjuk ke stok toko yang nyata, kebocoran yang
   sama langsung memakan inventori penjual di etalase publik — jadi jalur pengembalian stok **wajib**
   ada di fase ini, khusus untuk item yang tertaut produk.
2. **Addon yang di-*include* di paket tidak mengurangi stok sama sekali.** `RsvpController` hanya
   menulis snapshot untuk `includedAddons`, tanpa `decrement`. Untuk addon tertaut produk perilaku
   itu tidak bisa dipertahankan: barangnya tetap keluar dari gudang penjual.
3. **Pilihan varian di RSVP tidak pernah divalidasi.** `purchased_addon_variants` /
   `included_addon_variants` diterima sebagai string bebas (`nullable|string|max:100`) dan langsung
   masuk snapshot. Menautkan ke `product_variants` berarti setiap pilihan harus *resolve* ke baris
   varian yang nyata — ini inti pekerjaan teknis fase ini, bukan detail sampingan.
4. **Beda tipe ID.** `event_addons.id` bigint, `products.id`/`product_variants.id` ULID. Snapshot
   harus membawa keduanya, dan FK di `event_addons` harus `foreignUlid`, bukan `foreignId`.
5. **Snapshot dibaca banyak tempat** (ekspor peserta, Telegram, halaman edit RSVP). Perubahannya
   **hanya boleh aditif** — menambah kunci baru, tidak mengubah/menghapus kunci lama.
6. **`Rsvp` tidak terdaftar di `DeletedItemObserver`** (`Event`, `EventAddon`, `EventPackage`, dan
   `Transaction` terdaftar, `Rsvp` tidak). Artinya penghapusan RSVP hari ini tidak meninggalkan
   jejak apa pun — layak dibereskan sekalian di fase ini karena kita mulai menggantungkan pelepasan
   stok pada peristiwa penghapusan RSVP.

### Tafsiran yang perlu diluruskan dari note

| Kalimat di note | Tafsiran yang dikerjakan |
| --- | --- |
| "ketika user tambah event kemudian buat addon" | "User" di sini = **admin**. Event hanya bisa dibuat/diedit dari god-mode; tidak ada pembuatan event oleh pengguna biasa, dan fase ini tidak menambahkannya. |
| "ambil addon dari semua produk yg ada di database" | Katalog **lintas toko** — admin bisa menarik produk toko mana pun. Wajar karena admin sudah punya kuasa penuh atas semua toko lewat god-mode, tapi konsekuensinya harus disadari: stok penjual berkurang karena keputusan admin. Karena itu ada rekap penyiapan barang untuk penjual (§5.3). |
| "include dari produk yg ada di database" (paket) | Produk masuk paket **lewat addon**, bukan relasi langsung paket→produk. Pivot `event_package_included_addons` yang sudah ada tetap dipakai apa adanya. Lihat D24. |
| "gak ada opsi pengiriman" | Bukan sekadar menyembunyikan pilihan ongkir di UI: alur event memang tidak pernah menyentuh cart/checkout/`StoreOrder` sama sekali. Lihat D29. |

---

## 2. Keputusan desain

### D24 — Addon tetap entitas utama; produk jadi *sumber*, bukan pengganti

`event_addons` mendapat kolom tautan (`product_id`, `product_variant_id`, `stock_source`). Addon
yang tertaut tetap addon: punya `id` bigint sendiri, tetap muncul di `event->addons`, tetap bisa
di-*include* ke paket lewat pivot yang sudah ada.

Alternatif "paket/RSVP menunjuk `products` langsung" ditolak: seluruh UI pendaftaran (2.210 baris
`Event/Show.tsx`), snapshot RSVP, ekspor peserta, dan halaman edit RSVP semuanya berporos pada
`addon.id`. Menggantinya berarti menulis ulang alur pendaftaran demi nol perubahan yang terlihat
pembeli.

**Harga tetap milik addon.** Diisi otomatis dari produk saat penautan, tapi admin boleh
menimpanya — harga event sering beda (bundling, subsidi panitia). God-mode menampilkan peringatan
kalau harga addon menyimpang dari harga produk saat ini, tanpa memaksa menyamakan.

### D25 — Satu sumber stok: produk/varian. Addon tertaut tidak punya stok sendiri

`event_addons.stock_quantity` diabaikan ketika `stock_source = 'product'`; pembacaan lewat accessor
`available_stock` yang meneruskan ke produk/varian. Kalau stok disalin, dua kanal (etalase toko dan
pendaftaran event) akan menjual barang yang sama dua kali — dan itu justru satu-satunya hal yang
membuat penautan ini berharga dibanding sekadar mengetik ulang nama produk sebagai addon.

### D26 — Penautan di level **produk**; varian dipilih pembeli per unit

Satu addon = satu produk. Kalau produk punya varian, `event_addons.variants` **dibangkitkan** dari
grup opsi produk (mis. `{"Ukuran":["M","L","XL"],"Warna":["Merah","Putih"]}`), memakai bentuk JSON
yang sudah dimengerti `Event/Show.tsx` hari ini. Setiap slot kuantitas = satu unit, dan kombinasi
opsi tiap slot di-*resolve* ke satu baris `product_variants` saat RSVP dibuat.

Alternatif "satu addon per varian" ditolak: kaos 4 ukuran × 3 warna jadi 12 addon di halaman
pendaftaran.

Konsekuensi yang harus dijelaskan ke admin di UI: **harga event datar untuk semua varian**, padahal
`product_variants.price` bisa berbeda per varian. God-mode menampilkan rentang harga produk saat
penautan ("varian produk ini berharga Rp90.000–Rp110.000; harga event yang kamu set berlaku untuk
semua varian"). Menyembunyikan fakta ini akan jadi keluhan penjual, bukan kejutan yang menyenangkan.

### D27 — Tabel `product_reservations` sebagai buku besar stok lintas modul

Setiap unit produk yang keluar lewat pendaftaran event dicatat satu baris: produk apa, varian mana,
berapa, untuk RSVP siapa, sudah dilepas/diserahkan atau belum.

Kenapa tidak membuat `StoreOrder` saja untuk tiap pembelian lewat event? Karena order toko membawa
banyak hal yang tidak berlaku di sini — ongkir, alamat, `payment_fee`, transaksi pembayaran
sendiri, laporan omzet toko. Membuat order palsu dengan total yang uangnya sebenarnya masuk ke
ledger event akan mengotori laporan penjualan toko dan membuat setiap query omzet harus menghafal
pengecualian. Reservasi mencatat persis yang perlu dicatat: pergerakan barang.

Kenapa tidak cukup mengandalkan `add_ons_snapshot`? Karena snapshot itu JSON di dalam baris RSVP;
menjawab "berapa kaos L merah yang harus disiapkan penjual untuk event ini" berarti memindai dan
mem-parsing JSON semua peserta. Reservasi membuatnya jadi satu `GROUP BY`.

Reservasi bersifat polimorfik (`reservable_type`/`reservable_id`, hari ini selalu `Rsvp`) supaya
kanal lain di kemudian hari tidak perlu tabel ketiga.

### D28 — MVP hanya produk fisik; produk digital ditolak saat penautan

Pengiriman produk digital di modul toko bergantung pada `digital_deliveries.store_order_item_id` —
tanpa `StoreOrder` (yang sengaja tidak dibuat, D27) tidak ada tempat menggantung token unduhannya.
Mendukung digital berarti membangun jalur pengiriman kedua, dan note sendiri menyatakan semua produk
lewat event **diambil saat acara** — yang secara definisi produk fisik.

Validasi menolak `type = digital` saat penautan dengan pesan jelas, bukan diam-diam menyembunyikan
produk digital dari pencarian (admin harus tahu kenapa produknya tidak bisa dipakai).

### D29 — Tanpa pengiriman: dijamin oleh struktur, bukan oleh UI

Pembelian lewat event tidak pernah menyentuh `carts`, `CheckoutService`, `ShippingProviderInterface`,
atau `store_orders`. Tidak ada kode ongkir yang perlu "dimatikan", karena jalurnya memang tidak
pernah lewat sana. Yang perlu ditambahkan justru sebaliknya: keterangan eksplisit di UI addon
("diambil saat acara — tidak dikirim") supaya pembeli tidak menunggu resi.

Produk yang sama tetap dijual normal di etalase toko dengan ongkir — penautan ke event tidak
mengubah status produk, hanya menambah kanal penjualan kedua atas stok yang sama.

### D30 — Uang tetap masuk ke ledger event, bukan ke penjual

Pembayaran addon tertaut produk masuk lewat `transactions` milik RSVP, ke rekening komunitas —
sama seperti seluruh alur pembayaran hari ini (lihat [7-payment-settings.md](./7-payment-settings.md)
§1: dana Satutera pun mendarat di akun komunitas, payout ke pemilik toko sudah tercatat di luar
lingkup MVP 2). Yang didapat penjual dari fase ini adalah **rekap barang yang harus disiapkan**,
bukan pembayaran otomatis. Ini harus dikatakan ke penjual di halamannya, bukan diasumsikan.

### D31 — Mutasi stok produk hanya boleh lewat domain Store

Domain Event tidak boleh memanggil `Product::decrement()` langsung. Semua reservasi/pelepasan lewat
`App\Domains\Store\Services\ProductStockService`, satu-satunya tempat yang tahu aturan kunci baris,
idempotensi, dan varian-vs-produk. Ini menjaga batas domain yang sudah dipakai repo, dan membuat
audit "siapa yang bisa mengubah stok" jadi satu file.

### D32 — Logika addon keluar dari `RsvpController`

`RsvpController@store` sudah 160 baris dengan validasi 30 baris dan tiga blok logika inline.
Menambahkan resolusi varian produk + reservasi ke dalamnya akan melewati batas wajar. Pindahkan ke
`App\Domains\Event\Services\RsvpAddonResolver` (menghasilkan snapshot + daftar reservasi), sesuai
konvensi "skinny controller, fat service" di CLAUDE.md. Perilaku addon lama harus lolos uji regresi
tanpa perubahan.

---

## 3. Skema database

### Perubahan `event_addons` (aditif)

```php
Schema::table('event_addons', function (Blueprint $table) {
    $table->foreignUlid('product_id')->nullable()->after('event_id')
          ->constrained('products')->restrictOnDelete();
    $table->foreignUlid('product_variant_id')->nullable()->after('product_id')
          ->constrained('product_variants')->restrictOnDelete();
    $table->enum('stock_source', ['event', 'product'])->default('event')->after('stock_quantity');
    $table->index(['product_id']);
});
```

- `product_variant_id` diisi hanya untuk kasus khusus "kunci ke satu varian saja" (mis. panitia cuma
  mau menjual ukuran L). Default: null → pembeli memilih varian (D26).
- `restrictOnDelete` disengaja: produk yang masih tertaut ke event tidak boleh terhapus diam-diam.
  Konsekuensi yang harus ditangani UI: menghapus produk (dan menghapus toko, karena `products`
  cascade dari `stores`) akan gagal dengan error database. God-mode dan halaman toko harus
  memeriksa tautan lebih dulu dan menampilkan pesan "produk ini dipakai di event X" — bukan
  melempar 500.

### Tabel baru `product_reservations`

```php
Schema::create('product_reservations', function (Blueprint $table) {
    $table->id();
    $table->foreignUlid('product_id')->constrained('products')->restrictOnDelete();
    $table->foreignUlid('product_variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();

    $table->string('reservable_type');
    $table->string('reservable_id');            // string: menampung bigint (rsvps) & ULID nanti
    $table->foreignId('event_addon_id')->nullable()->constrained('event_addons')->nullOnDelete();

    $table->unsignedInteger('quantity');
    $table->enum('status', ['reserved', 'released', 'fulfilled'])->default('reserved')->index();
    $table->json('selection_snapshot')->nullable();   // kombinasi opsi yang dipilih pembeli
    $table->timestamp('released_at')->nullable();
    $table->timestamp('fulfilled_at')->nullable();
    $table->timestamps();

    $table->index(['reservable_type', 'reservable_id']);
    $table->index(['product_id', 'status']);
});
```

Status: `reserved` (stok sudah dikurangi, barang belum diserahkan) → `fulfilled` (diserahkan saat
acara) atau `released` (RSVP batal/kedaluwarsa, stok dikembalikan). `released_at` yang memberi
idempotensi, persis pola `store_orders.stock_released_at`.

Plus migration trigger delete-tracking untuk `product_reservations` dan registrasi
`ProductReservation::observe(DeletedItemObserver::class)` di `AppServiceProvider`. Sekalian
daftarkan `Rsvp::observe(DeletedItemObserver::class)` yang selama ini terlewat (§1 temuan 6) —
ubah perilakunya di rilis yang sama supaya penghapusan peserta tetap punya jejak.

---

## 4. Backend

### `App\Domains\Store\Services\ProductStockService` (baru)

```php
public function reserve(Model $reservable, EventAddon $addon, ?ProductVariant $variant, int $qty, array $selection): ProductReservation;
public function releaseFor(Model $reservable): int;      // idempoten, mengembalikan jumlah baris dilepas
public function fulfill(ProductReservation $reservation): void;
public function availableFor(EventAddon $addon, ?ProductVariant $variant): int;
```

Aturan yang dijaga di sini dan tidak di tempat lain:

- `lockForUpdate()` pada baris produk/varian sebelum cek stok dan `decrement` — sama seperti
  `CheckoutService::lockAndValidateItems()`.
- Produk harus `status = active` dan tokonya `isPubliclyVisible()` saat reservasi dibuat; kalau
  tidak, `ValidationException` dengan pesan yang menyebut nama produk.
- `releaseFor()` hanya menyentuh baris `status = reserved` dan menandai `released_at` di dalam satu
  transaksi — dipanggil dua kali tidak menggandakan stok.

### Domain Event

| Berkas | Perubahan |
| --- | --- |
| `Event/Models/EventAddon.php` | Relasi `product()`, `variant()`; accessor `available_stock`, `is_product_linked`, `variant_options`; `$appends` ditambah (hati-hati N+1 → `with('product.variants')` di controller) |
| `Event/Services/RsvpAddonResolver.php` (baru) | Menerima payload addon + pilihan varian, mengembalikan `[snapshot, reservations]`; memanggil `ProductStockService` untuk item tertaut, mempertahankan jalur `decrement` lama untuk addon non-tertaut |
| `Event/Controllers/RsvpController.php` | Delegasi ke resolver; addon yang di-*include* paket ikut direservasi (perubahan perilaku, D25/§1 temuan 2); validasi varian jadi ketat untuk addon tertaut |
| `Event/Observers/RsvpObserver.php` | Tambah: status → `expired`/`failed` atau RSVP dihapus ⇒ `ProductStockService::releaseFor($rsvp)`; status → `paid` tidak mengubah reservasi (barang tetap `reserved` sampai diserahkan) |
| `Event/Controllers/PaymentController.php` | `cancel()` melepas reservasi sebelum menghapus RSVP |
| `GodMode/Controllers/EventController.php` | `participantDestroy()` melepas reservasi |

### Command baru: `events:expire-unpaid-rsvps`

Pola `ExpireStoreOrders`. Per jam: RSVP `pending` yang transaksinya sudah lewat `expired_at`, atau
yang umurnya melewati `config('events.rsvp_expiry_minutes')` (default 1440), diubah jadi `expired`
dan reservasinya dilepas.

Dua pengecualian yang wajib ditulis sebagai test, bukan komentar:

1. RSVP dengan bukti transfer manual yang belum direview **tidak** boleh kedaluwarsa (aturan yang
   sama dengan fase 7 §6a untuk order toko).
2. RSVP tanpa reservasi produk tetap diproses seperti biasa — command ini juga membereskan kebocoran
   stok addon lama, tapi hanya untuk `stock_source = 'event'` **kalau** kita memang mau memulihkan
   stoknya. Untuk rilis pertama: jangan sentuh stok addon lama (perilakunya sudah lama begitu dan
   angkanya dipakai panitia); cukup ubah status RSVP. Catat sebagai utang teknis.

### Endpoint JSON baru (bukan prop Inertia)

Mengikuti aturan CLAUDE.md "jangan kirim dataset besar lewat prop Inertia":

```php
// pencarian produk untuk modal penautan di god-mode (pola Components/AsyncSelect.tsx)
Route::get('/god-mode/api/products/search', [GodMode\ProductSearchController::class, 'index']);

// rekap barang yang harus disiapkan, per event / per toko
Route::get('/god-mode/events/{event}/api-product-reservations', [GodMode\EventController::class, 'apiProductReservations']);
Route::get('/my/stores/{store}/api-event-reservations', [Store\StoreEventReservationController::class, 'index']);
```

`AsyncSelect` sudah dipakai di repo dan cukup untuk ini; React Query (`@tanstack/react-query`) sudah
terpasang di `package.json` tapi belum dipakai satu halaman pun — kalau rekapnya butuh caching
client-side, fase ini boleh jadi pemakai pertamanya, tapi jangan memaksakannya untuk sekadar satu
`fetch`.

---

## 5. God-mode & halaman toko

### 5.1 Penautan addon ke produk

`Pages/GodMode/Events/Addons/Index.tsx` mendapat tombol kedua di samping "Tambah Addon":
**"Ambil dari Produk Toko"** → modal berisi:

1. Pencarian produk lintas toko (nama, SKU, nama toko) lewat endpoint di atas.
2. Pratinjau: gambar, toko asal, harga produk (atau rentang harga varian), stok tersedia, tipe.
   Produk digital tampil dengan keterangan "tidak bisa dipakai di event" (D28).
3. Form: nama addon (prefilled dari nama produk, boleh diubah), harga event (prefilled), opsi
   "kunci ke satu varian" untuk produk bervarian.

Setelah tertaut, kartu addon menampilkan lencana **"Dari toko: {nama toko}"**, stok dibaca dari
produk (bukan input angka yang bisa diketik), dan tautan ke halaman produk. Field stok addon
di-*disable* dengan keterangan, bukan disembunyikan.

### 5.2 Paket

`Pages/GodMode/Events/Packages/Index.tsx` tidak berubah strukturnya — addon tertaut muncul di
pemilih `included_addons` seperti addon biasa, dengan lencana yang sama. Ini konsekuensi langsung
dari D24 dan alasan utama memilihnya.

### 5.3 Rekap penyiapan barang

Dua tampilan atas tabel yang sama:

- **Admin**, di halaman event: "Barang yang harus disiapkan" — dikelompokkan per toko → produk →
  varian, dengan kolom `reserved` (RSVP belum bayar), `paid`, `fulfilled`. Bisa diekspor mengikuti
  pola `EventParticipantsExport` yang sudah ada.
- **Penjual**, di `/my/stores/{store}`: menu "Pesanan Event" — daftar event yang memakai produknya
  beserta jumlah per varian, dengan keterangan tegas: barang diserahkan saat acara, pembayaran
  masuk lewat panitia (D30). Tanpa kalimat itu, penjual akan mengira ada pesanan yang belum dibayar.

Penandaan `fulfilled` (barang sudah diserahkan) dilakukan admin dari halaman event — satu tombol per
peserta atau massal per addon. Ini yang membuat status reservasi bermakna setelah acara selesai.

---

## 6. Alur pembeli (frontend)

`Pages/Event/Show.tsx` (langkah "Tambahan") — perubahan seminimal mungkin karena file ini 2.210
baris dan penuh aturan varian/form yang sudah jalan:

1. Addon tertaut produk memakai komponen pemilih varian yang **sudah ada** (`variant_slots` per unit)
   — bentuk `variants` yang dibangkitkan dari opsi produk sengaja dibuat identik supaya tidak ada
   cabang baru di UI.
2. Kombinasi varian yang stoknya habis tampil nonaktif, bukan gagal saat submit. Data stok per
   kombinasi ikut di prop event (kecil dan terbatas: jumlah varian per produk maksimal 2 grup).
3. Keterangan "Diambil saat acara" di kartu addon tertaut (D29).
4. `resources/js/types/index.d.ts`: `EventAddon` ditambah `product_id`, `store_name`,
   `is_product_linked`, `available_stock`, `variant_stock`. Tidak ada `any`.

Halaman `Rsvp/Edit.tsx` (ubah pilihan varian setelah daftar): mengubah varian addon tertaut berarti
**memindahkan** reservasi dari satu varian ke varian lain — harus lewat `ProductStockService`
(lepas + reservasi ulang dalam satu transaksi), dan ditolak kalau varian tujuan habis. Ini jalur
yang paling mudah terlewat; hari ini `RsvpController@update` hanya menulis ulang JSON snapshot tanpa
sentuhan stok apa pun.

---

## 7. Urutan pengerjaan

| Langkah | Isi | Risiko rilis |
| --- | --- | --- |
| **8a** | Migration (`event_addons`, `product_reservations`, trigger, observer) + `ProductStockService` + model/relasi + registrasi `Rsvp` di `DeletedItemObserver`. Tidak ada perubahan yang terlihat pengguna. | Rendah — aditif murni |
| **8b** | Penautan di god-mode: endpoint pencarian produk, modal "Ambil dari Produk Toko", lencana & stok read-only, penolakan produk digital, penjagaan hapus produk/toko yang masih tertaut. Addon tertaut belum bisa dibeli (belum dirilis ke halaman event). | Rendah–sedang — hanya area admin |
| **8c** | Alur pendaftaran: `RsvpAddonResolver`, reservasi saat RSVP dibuat (termasuk addon paket), validasi varian ketat, UI stok di `Event/Show.tsx`, jalur pelepasan (`cancel`, observer, `participantDestroy`), command `events:expire-unpaid-rsvps`, edit RSVP memindahkan reservasi. | **Tinggi** — menyentuh pendaftaran event yang sudah produksi dan stok toko yang nyata |
| **8d** | Rekap penyiapan barang (admin + penjual) dan penandaan `fulfilled`. | Rendah — baca saja + satu mutasi status |

Checklist per konvensi repo: `tasks/22-event-product-integration-progress.md`, dibuat sebelum baris
kode pertama.

Uji regresi wajib sebelum 8c dirilis: pendaftaran event dengan addon lama (non-tertaut), paket
dengan included addon, edit RSVP, ekspor peserta, notifikasi Telegram bukti bayar — semuanya harus
berperilaku persis seperti sebelumnya.

---

## 8. Risiko

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Oversell: produk yang sama terjual di etalase dan pendaftaran event bersamaan | Barang tidak cukup, salah satu pembeli kecewa | Satu sumber stok (D25) + `lockForUpdate()` di `ProductStockService` + test konkurensi |
| Stok bocor karena RSVP terbengkalai | Stok penjual habis di angka, padahal tidak ada yang membayar | `product_reservations` + jalur pelepasan lengkap + `events:expire-unpaid-rsvps`; ditutup test |
| Bentuk `add_ons_snapshot` berubah | Ekspor peserta / Telegram / halaman edit RSVP rusak diam-diam | Perubahan snapshot **hanya aditif**; test yang membaca snapshot lama tetap hijau |
| Produk/toko dihapus padahal masih tertaut ke event | Error database mentah di god-mode, atau addon menunjuk baris hantu | FK `restrictOnDelete` + pengecekan tautan di UI dengan pesan yang menyebut nama event |
| Produk di-*archive* setelah tertaut | Pembeli tetap bisa memilih addon yang tidak lagi dijual | Cek `status = active` + toko `publiclyVisible` saat reservasi, dan tandai addon "tidak tersedia" di halaman event |
| Harga varian berbeda diratakan jadi satu harga event | Penjual merasa dirugikan pada varian mahal | Tampilkan rentang harga produk saat penautan (D26); pilihan sadar, bukan kejutan |
| Addon paket sekarang mengurangi stok (perubahan perilaku) | Paket yang dulu "gratis stok" tiba-tiba menahan inventori | Hanya berlaku untuk addon tertaut produk; addon lama tidak berubah sama sekali |
| Edit RSVP memindahkan varian tanpa memindahkan reservasi | Stok varian A minus, varian B tidak pernah berkurang | Lepas+reservasi ulang dalam satu transaksi (§6); test khusus |
| `MarhalahScope` pada `User` saat merekap pembeli lintas marhalah | Peserta "hilang" dari rekap | `withoutGlobalScope(MarhalahScope::class)` di query rekap, sesuai risiko yang sudah tercatat di README §7 |
| N+1 di halaman event karena accessor stok | Halaman event melambat untuk semua pengunjung | `with('addons.product.variants')` + verifikasi lewat Telescope |

---

## 9. Definition of Done

- [ ] Migration `event_addons` (aditif) + `product_reservations` + trigger delete-tracking; observer terdaftar di `AppServiceProvider`, termasuk `Rsvp` yang selama ini terlewat.
- [ ] Admin bisa membuat addon dari produk toko mana pun lewat god-mode; produk digital ditolak dengan pesan yang jelas.
- [ ] Addon tertaut bisa di-*include* ke paket event tanpa perubahan pada pivot yang sudah ada.
- [ ] Stok addon tertaut dibaca dari produk/varian, tidak pernah dari `event_addons.stock_quantity`.
- [ ] Pendaftaran dengan addon tertaut membuat baris `product_reservations` dan mengurangi stok produk/varian yang tepat, di dalam satu `DB::transaction()` dengan `lockForUpdate()`.
- [ ] Addon yang di-*include* di paket juga mereservasi stok (untuk item tertaut produk).
- [ ] RSVP dibatalkan / kedaluwarsa / gagal / dihapus ⇒ reservasi dilepas dan stok kembali; dijalankan dua kali tidak menggandakan stok.
- [ ] `events:expire-unpaid-rsvps` berjalan terjadwal dan **tidak** menghanguskan RSVP yang bukti transfernya menunggu review.
- [ ] Mengubah pilihan varian lewat `Rsvp/Edit` memindahkan reservasi, dan ditolak kalau varian tujuan habis.
- [ ] Halaman event menonaktifkan kombinasi varian yang habis; tidak ada kegagalan yang baru muncul saat submit.
- [ ] Admin melihat rekap "barang yang harus disiapkan" per event; penjual melihat rekap per tokonya beserta keterangan bahwa dana masuk lewat panitia.
- [ ] Tidak ada `StoreOrder`, ongkir, atau alamat yang tersentuh oleh alur event (dibuktikan test: pendaftaran dengan addon tertaut tidak membuat baris di `store_orders`).
- [ ] Ekspor peserta, notifikasi Telegram, dan halaman edit RSVP tetap berjalan atas snapshot lama maupun baru.
- [ ] `pnpm build` lolos tanpa error TypeScript; tidak ada `any` di kode baru.
- [ ] `vendor/bin/pint --dirty` bersih; `php artisan test` tanpa regresi baru.

---

## 10. Di luar lingkup fase ini

- **Produk digital sebagai addon event** (D28) — butuh jalur pengiriman digital di luar `StoreOrder`.
- **Payout/komisi ke penjual** atas barang yang terjual lewat event (D30) — keputusan produk,
  berpasangan dengan payout MVP 2.1.
- **Penjual mendaftarkan produknya sendiri ke sebuah event** (hari ini penautan sepenuhnya inisiatif
  admin). Perlu alur persetujuan dua arah; catat sebagai kandidat MVP 2.1.
- **Pengiriman untuk pembelian lewat event** — secara eksplisit tidak ada (note & D29).
- **Normalisasi `rsvps.add_ons_snapshot` jadi tabel `rsvp_items`** — menggoda, tapi menyentuh ekspor,
  Telegram, dan dua halaman FE. `product_reservations` sudah menutup kebutuhan query yang mendesak.
- **Pemulihan stok untuk addon lama non-tertaut** saat RSVP kedaluwarsa (kebocoran yang sudah lama
  ada; diperbaiki terpisah supaya angka panitia tidak berubah mendadak di tengah event berjalan).

---

## 11. Addendum — harga per-varian (supersede D26)

**D26 di-supersede.** Keputusan awal ("harga event datar untuk semua varian") dibalik atas
permintaan eksplisit: `event_addons` sekarang mirip `products`/`product_variants` — harga bisa
berbeda per kombinasi varian (maks 2 grup opsi), untuk addon manual **maupun** addon tertaut
produk. Ringkasan implementasi (checklist lengkap: `tasks/25-event-addon-variant-pricing-progress.md`):

- Tabel baru `event_addon_variants` (mirror `product_variants`: `option1_name/value`,
  `option2_name/value`, `price` — tanpa stok/berat/SKU, karena stok tetap hanya milik
  produk/varian, D25 tidak berubah). `event_addons` dapat `has_variants`, `options` (JSON, sama
  bentuk dengan `Product::options`), `form_fields` (JSON — pemisahan dari `variants.forms` lama,
  yang sekarang jadi kolom tersendiri). Kolom `variants` lama dihapus; migration membackfill data
  lama tanpa mengubah harga yang sudah berjalan di event live.
- **Penautan produk:** saat admin menautkan addon ke produk ber-varian **tanpa** mengunci ke satu
  varian, setiap kombinasi di `event_addon_variants` dibuat dengan `price` default = harga varian
  produk terkait (disalin sekali saat linking, bukan live pass-through — beda dari D26's "tidak
  pernah drift"). Admin boleh menimpa harga tiap kombinasi sebelum maupun sesudah linking; timpaan
  itu bertahan meski produk sumbernya berubah harga nanti. Kasus "kunci ke satu varian" tidak
  berubah sama sekali (`has_variants=false`, harga flat di `event_addons.price`, seperti sebelumnya).
- **`RsvpAddonResolver`:** mencocokkan pilihan varian pembeli ke `EventAddon::variants`
  (bukan lagi `product->variants` langsung), harga per unit = harga kombinasi yang cocok. Reservasi
  stok (`ProductStockService`) hanya jalan kalau baris `event_addon_variants` yang cocok punya
  `product_variant_id` terisi — addon manual ber-varian tidak pernah menyentuh stok produk, tetap
  memakai `event_addons.stock_quantity` di level addon (bukan per-varian; scope perubahan ini
  murni harga, bukan pelacakan stok per-varian untuk addon manual).
- **Snapshot `rsvps.add_ons_snapshot` TIDAK berubah bentuk** — riset konsumen menemukan
  `RsvpController@update`/`Rsvp/Edit.tsx` mengunci `purchased_addon_variants` per `addon.id`
  tunggal, jadi memecah satu baris addon jadi banyak baris per harga akan merusak alur edit RSVP.
  Sebagai gantinya: `total` di snapshot jadi jumlah akurat harga tiap unit (benar walau tiap unit
  beda varian), `price` jadi rata-rata per unit (`total / quantity`) — `price * quantity` tetap
  sama dengan `total` untuk kasus paling umum (satu varian per pembelian).
