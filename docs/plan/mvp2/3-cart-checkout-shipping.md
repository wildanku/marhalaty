# Fase 3 — Cart, Alamat Pembeli, Ongkir (RajaOngkir), dan Pembuatan Order

Prasyarat: [Fase 2](./2-product-catalog.md) selesai.

Integrasi logistik MVP 2 **hanya RajaOngkir**. KiriminAja menyusul di MVP 2.1 lewat
`ShippingProviderInterface` yang dibuat di fase ini.

---

## 1. Aturan bisnis

1. Keranjang **per toko**. Kalau pembeli menambah produk dari toko lain, keranjangnya terpisah dan
   dibayar terpisah. Ini menghindari split-shipment dan pembagian dana antar toko di MVP 2.
2. Ongkir dihitung hanya kalau keranjang berisi minimal satu produk `physical`.
3. Keranjang campuran (fisik + digital) diperbolehkan: ongkir dihitung dari total berat produk fisik
   saja, produk digital diserahkan lewat link download.
4. Berat total = Σ (berat efektif varian × qty), minimum 1000 gram (pembulatan kurir).
5. Semua nominal **dihitung ulang di server** saat order dibuat. Harga dan ongkir dari klien hanya
   untuk tampilan.
6. Ongkir yang dipilih dikunci ke order (snapshot kurir, layanan, biaya, ETD).
7. Stok dikurangi saat order dibuat, dikembalikan kalau order kedaluwarsa/dibatalkan.
8. Order kedaluwarsa setelah `STORE_ORDER_EXPIRY_MINUTES` (default 1440 menit / 24 jam).

---

## 2. RajaOngkir (Komerce V2)

### 2.1 Kontrak API

Base URL: `https://rajaongkir.komerce.id/api/v1` · Autentikasi: header `key: <RAJAONGKIR_API_KEY>`

**Cari destinasi**

```
GET /destination/domestic-destination?search={q}&limit={n}&offset={n}
```

Mengembalikan daftar lokasi dengan `id`, `subdistrict_name`, `district_name`, `city_name`,
`province_name`, `zip_code`. `search` menerima nama kota/kecamatan/kelurahan atau kode pos.

**Hitung ongkir domestik**

```
POST /calculate/domestic-cost
Content-Type: application/x-www-form-urlencoded

origin={destination_id}&destination={destination_id}&weight={gram}&courier={kode}&price=lowest
```

Respons:

```json
{
  "meta": { "message": "Success Calculate Domestic Shipping cost", "code": 200, "status": "success" },
  "data": [
    { "name": "JNE", "code": "jne", "service": "REG",
      "description": "Layanan Reguler", "cost": 18000, "etd": "2-3 day" }
  ]
}
```

> **Perlu diverifikasi saat implementasi:** pemisah untuk multi-kurir pada parameter `courier`
> (dokumentasi Komerce memakai titik dua, mis. `jne:sicepat:jnt`, sebagian contoh komunitas memakai
> koma). Simpan sebagai `config('services.rajaongkir.courier_separator')` dan uji sekali ke sandbox
> sebelum mengunci nilainya. Endpoint ini `x-www-form-urlencoded`, **bukan** JSON — pakai
> `Http::asForm()`.

### 2.2 Jembatan wilayah lokal → RajaOngkir

Alamat kita berbasis `indonesia_villages` (punya `postal_code`), sedangkan RajaOngkir memakai ID
destinasi miliknya sendiri. Pemetaan dilakukan **sekali per alamat**, saat alamat disimpan:

1. Panggil `GET /destination/domestic-destination?search={postal_code}`.
2. Kalau hasilnya tepat satu → simpan `rajaongkir_destination_id` langsung.
3. Kalau lebih dari satu → skor kandidat dengan mencocokkan nama kelurahan dan kecamatan
   (normalisasi: lowercase, buang "kel.", "kec.", "desa"). Skor tertinggi yang jelas menang dipakai.
4. Kalau masih ambigu → **tampilkan pilihan ke user** di form alamat ("Pilih kecamatan yang sesuai")
   dan simpan pilihannya. Jangan menebak diam-diam; salah tebak berarti ongkir salah dan penjual
   yang menanggung.
5. Simpan setiap hasil ke tabel cache `shipping_destinations`.

```php
Schema::create('shipping_destinations', function (Blueprint $table) {
    $table->id();
    $table->string('provider', 20)->default('rajaongkir');
    $table->string('destination_id', 30);
    $table->string('label');
    $table->string('subdistrict_name')->nullable();
    $table->string('district_name')->nullable();
    $table->string('city_name')->nullable();
    $table->string('province_name')->nullable();
    $table->char('zip_code', 5)->nullable()->index();
    $table->timestamp('synced_at')->nullable();
    $table->timestamps();

    $table->unique(['provider', 'destination_id']);
});
```

### 2.3 Kontrak & implementasi

`app/Contracts/ShippingProviderInterface.php`

```php
interface ShippingProviderInterface
{
    /** @return array<int, array{id:string,label:string,zip_code:?string,...}> */
    public function searchDestination(string $query, int $limit = 10): array;

    public function resolveDestinationId(
        string $postalCode,
        ?string $villageName = null,
        ?string $districtName = null,
    ): ?string;

    /** @return array<int, ShippingRate> */
    public function calculateCost(
        string $originId,
        string $destinationId,
        int $weightGrams,
        array $couriers = [],
    ): array;

    public function providerCode(): string;   // 'rajaongkir'
}
```

`app/Domains/Shared/Services/RajaOngkirService.php` mengimplementasikannya, mengikuti gaya
`IPaymuService` (konstruktor membaca `config('services.rajaongkir.*')`, `Http::` facade,
`Log::` untuk audit, lempar exception saat gagal).

DTO sederhana `app/Domains/Store/Data/ShippingRate.php`:
`courier_code`, `courier_name`, `service`, `description`, `cost`, `etd`.

Binding di `AppServiceProvider::register()`:

```php
$this->app->bind(ShippingProviderInterface::class, fn () => match (config('services.shipping.default')) {
    'rajaongkir' => new RajaOngkirService(),
    // 'kiriminaja' => new KiriminAjaService(),   // MVP 2.1
});
```

### 2.4 Cache & kegagalan

- Hasil `calculateCost` di-cache `Cache::remember()` dengan key
  `ship:{provider}:{origin}:{dest}:{weight}` selama `RAJAONGKIR_CACHE_TTL` (default 6 jam).
  Ongkir jarang berubah harian, dan ini menjaga kuota API.
- Timeout HTTP 10 detik, `->retry(2, 200)`.
- Kalau provider error atau tidak mengembalikan layanan: checkout **tidak boleh** lanjut dengan
  ongkir 0. Tampilkan pesan "Tarif pengiriman belum bisa diambil, coba lagi" dan biarkan pembeli
  mengulang — lebih baik gagal terang-terangan daripada order dengan ongkir salah.

---

## 3. Alamat pembeli

```php
Schema::create('user_addresses', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

    $table->string('label')->default('Rumah');
    $table->string('recipient_name');
    $table->string('phone');
    $table->text('address_line');

    $table->char('village_id', 10);
    $table->char('postal_code', 5);
    $table->decimal('lat', 10, 7)->nullable();
    $table->decimal('lng', 10, 7)->nullable();

    $table->unsignedBigInteger('rajaongkir_destination_id')->nullable()->index();
    $table->timestamp('destination_resolved_at')->nullable();

    $table->boolean('is_default')->default(false);
    $table->timestamps();

    $table->foreign('village_id')->references('id')->on('indonesia_villages')->restrictOnDelete();
});
```

Bentuknya sengaja identik dengan `store_addresses` supaya form wilayah dan logika resolusi destinasi
bisa dipakai ulang (`Components/Store/AddressForm.tsx`, `AddressResolver` service).

Route: `GET/POST /my/addresses`, `PUT/DELETE /my/addresses/{id}`, `POST /my/addresses/{id}/default`.

---

## 4. Keranjang

```php
Schema::create('carts', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
    $table->foreignUlid('store_id')->constrained('stores')->cascadeOnDelete();
    $table->timestamps();
    $table->unique(['user_id', 'store_id']);
});

Schema::create('cart_items', function (Blueprint $table) {
    $table->id();
    $table->foreignUlid('cart_id')->constrained('carts')->cascadeOnDelete();
    $table->foreignUlid('product_id')->constrained('products')->cascadeOnDelete();
    $table->foreignUlid('product_variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete();
    $table->integer('quantity');
    $table->timestamps();

    $table->unique(['cart_id', 'product_id', 'product_variant_id']);
});
```

Keranjang disimpan di server (bukan localStorage) supaya lintas perangkat dan supaya harga selalu
dibaca dari sumber aslinya. **Tidak ada snapshot harga di `cart_items`** — harga dibaca ulang dari
produk/varian setiap kali keranjang dirender, dan perubahan harga sejak item dimasukkan ditampilkan
sebagai peringatan.

`CartService`:

```php
public function add(User $user, Product $product, ?ProductVariant $variant, int $qty): Cart;
public function updateQty(CartItem $item, int $qty): void;
public function remove(CartItem $item): void;
public function summary(Cart $cart): CartSummary;   // subtotal, total_weight_grams, requires_shipping, issues[]
```

`issues[]` berisi hal-hal yang harus ditampilkan sebelum checkout: produk sudah tidak aktif, stok
kurang dari qty, harga berubah, toko disuspend.

Route: `POST /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}`, `GET /cart`.

---

## 5. Order

```php
Schema::create('store_orders', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('order_number')->unique();            // INV/20260729/A1B2C3
    $table->foreignUlid('store_id')->constrained('stores')->restrictOnDelete();
    $table->foreignId('buyer_user_id')->constrained('users')->restrictOnDelete();

    $table->enum('status', [
        'pending_payment', 'paid', 'processing', 'shipped',
        'completed', 'cancelled', 'expired', 'refunded',
    ])->default('pending_payment')->index();

    $table->boolean('requires_shipping')->default(true);

    $table->decimal('subtotal', 12, 2);
    $table->decimal('shipping_cost', 12, 2)->default(0);
    $table->decimal('payment_fee', 12, 2)->default(0);
    $table->decimal('total', 12, 2);
    $table->integer('total_weight_grams')->default(0);

    // snapshot kurir terpilih
    $table->string('shipping_provider', 20)->nullable();     // 'rajaongkir'
    $table->string('shipping_courier_code', 20)->nullable();
    $table->string('shipping_courier_name')->nullable();
    $table->string('shipping_service', 50)->nullable();
    $table->string('shipping_etd', 50)->nullable();

    $table->json('shipping_address_snapshot')->nullable();
    $table->json('origin_address_snapshot')->nullable();

    $table->text('buyer_note')->nullable();
    $table->string('tracking_number')->nullable();

    $table->timestamp('expires_at')->nullable()->index();
    $table->timestamp('paid_at')->nullable();
    $table->timestamp('shipped_at')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->timestamp('cancelled_at')->nullable();

    $table->timestamps();
});

Schema::create('store_order_items', function (Blueprint $table) {
    $table->id();
    $table->foreignUlid('store_order_id')->constrained('store_orders')->cascadeOnDelete();
    $table->foreignUlid('product_id')->constrained('products')->restrictOnDelete();
    $table->foreignUlid('product_variant_id')->nullable()->constrained('product_variants')->restrictOnDelete();

    // snapshot: order lama harus tetap terbaca walau produk berubah/diarsip
    $table->string('name_snapshot');
    $table->string('variant_label_snapshot')->nullable();
    $table->string('sku_snapshot')->nullable();
    $table->enum('type_snapshot', ['physical', 'digital']);

    $table->decimal('unit_price', 12, 2);
    $table->integer('quantity');
    $table->integer('weight_grams')->default(0);
    $table->decimal('subtotal', 12, 2);

    $table->timestamps();
});
```

Alamat pakai **snapshot JSON**, bukan FK — kalau pembeli mengubah/menghapus alamatnya, riwayat
pengiriman order lama tidak boleh ikut berubah.

`restrictOnDelete` pada `product_id` menegakkan aturan fase 2: produk yang sudah pernah dipesan
tidak bisa dihapus, hanya diarsipkan.

---

## 6. Alur checkout

`CheckoutService::place(User $buyer, Cart $cart, PlaceOrderData $data): StoreOrder`
— seluruhnya dalam `DB::transaction()`, mengikuti pola `RsvpController::store()` yang sudah ada:

1. Muat ulang toko dan pastikan `approved` + aktif.
2. `lockForUpdate()` pada tiap produk/varian di keranjang.
3. Validasi ulang: produk `active`, varian `is_active`, stok cukup.
4. Hitung `subtotal` dan `total_weight_grams` **dari database**, bukan dari input.
5. Kalau `requires_shipping`:
   - Ambil alamat pembeli, pastikan `rajaongkir_destination_id` sudah ada (kalau belum, resolusikan
     sekarang; kalau gagal, hentikan checkout dengan pesan jelas).
   - Panggil `calculateCost` lagi di server dan **cocokkan** kurir+layanan yang dipilih klien dengan
     hasilnya. Kalau tidak ketemu atau biayanya beda → tolak dan minta pembeli memilih ulang.
     Ini yang mencegah ongkir dimanipulasi dari sisi klien.
6. Ambil `payment_fee` dari channel pembayaran terpilih (lihat [fase 4](./4-payment-satutera.md)).
7. `total = subtotal + shipping_cost + payment_fee`.
8. Buat `store_orders` + `store_order_items` (dengan snapshot).
9. Kurangi stok (`decrement`), set `expires_at = now()->addMinutes(config('store.order_expiry_minutes'))`.
10. Kosongkan keranjang.
11. Buat `Transaction` polymorphic (`payable_type = StoreOrder::class`) dan panggil Satutera.
12. Redirect ke `/store/payment/{payment_hash}`.

Nomor order: `INV/{Ymd}/{6 karakter acak}` — dicek unik dalam loop, mengikuti pola pembuatan
`payment_hash` di `Transaction::boot()`.

### Endpoint checkout

| Method | Route | Keterangan |
| --- | --- | --- |
| GET | `/checkout/{store:slug}` | Halaman checkout: item, alamat, opsi kurir, opsi pembayaran |
| POST | `/api/shipping/rates` | Body: `store_id`, `address_id` → daftar tarif kurir (JSON) |
| POST | `/checkout/{store:slug}` | Buat order → redirect ke halaman pembayaran |

`POST /api/shipping/rates` dibatasi `throttle:30,1` — tiap panggilan berpotensi memanggil API
berbayar RajaOngkir.

---

## 7. Frontend

```
resources/js/Pages/Store/
├── Cart.tsx           keranjang per toko + peringatan issues[]
├── Checkout.tsx       alamat, opsi kurir, channel pembayaran, ringkasan
└── Orders/
    ├── Index.tsx      riwayat pesanan pembeli
    └── Show.tsx       detail pesanan + status + resi/link download

resources/js/Components/Store/
├── AddressForm.tsx        dipakai alamat toko & pembeli
├── AddressPicker.tsx      pilih alamat tersimpan + tambah baru
├── ShippingRatePicker.tsx daftar kurir + layanan + ETD + biaya
└── OrderSummary.tsx       subtotal / ongkir / fee / total (sticky di mobile)
```

Perilaku `ShippingRatePicker`:

- Tarif diambil setelah alamat dipilih, lewat `fetch` ke `/api/shipping/rates` (bukan kunjungan
  Inertia — ini data sampingan, bukan navigasi halaman).
- Keadaan loading per kurir; kalau gagal, tampilkan tombol "Muat ulang tarif", jangan diam.
- Memilih layanan langsung memperbarui `OrderSummary`.
- Untuk keranjang berisi produk digital saja: seluruh blok pengiriman disembunyikan dan
  `requires_shipping = false`.

---

## 8. Definition of Done

- [ ] `RajaOngkirService` berhasil mencari destinasi dan menghitung ongkir dengan kredensial sandbox.
- [ ] Kode pos yang memetakan ke beberapa kecamatan memunculkan pilihan ke user, bukan tebakan diam-diam.
- [ ] Hasil resolusi destinasi tersimpan di `shipping_destinations` dan tidak dipanggil ulang untuk alamat yang sama.
- [ ] Ongkir yang di-cache tidak memanggil API kedua kali dalam TTL (diverifikasi lewat log/Telescope).
- [ ] Keranjang terpisah per toko; menambah produk toko lain tidak mencampur keranjang.
- [ ] Item yang stoknya habis/produknya dinonaktifkan memunculkan peringatan di keranjang dan memblokir checkout.
- [ ] Mengubah `shipping_cost` dari sisi klien tidak berpengaruh — server menolak layanan yang tidak cocok dengan hasil hitungannya sendiri.
- [ ] Order terbentuk dengan snapshot item, alamat, dan kurir; stok berkurang sesuai qty.
- [ ] Keranjang berisi produk digital saja tidak meminta alamat dan `shipping_cost = 0`.
- [ ] Dua checkout bersamaan atas stok terakhir: satu berhasil, satu ditolak dengan pesan stok habis (uji `lockForUpdate`).
- [ ] Provider ongkir error → checkout gagal dengan pesan jelas, **tidak** membuat order berongkir 0.
