# MVP 2 — eCommerce / Store Module

Rencana implementasi modul Store (toko + produk + ongkir + pembayaran) di atas codebase Marhalaty
yang sudah ada. Dokumen ini adalah **overview + keputusan arsitektur**; detail teknis per fase ada
di dokumen bernomor di folder yang sama.

| Dok | Fase | Isi |
| --- | --- | --- |
| [1-store-foundation.md](./1-store-foundation.md) | Fase 1 | Tabel `stores`, keanggotaan + invitation, alamat origin, flow pengajuan & approval admin |
| [2-product-catalog.md](./2-product-catalog.md) | Fase 2 | Produk fisik & non-fisik, varian (maks 2 opsi), stok, media, etalase publik |
| [3-cart-checkout-shipping.md](./3-cart-checkout-shipping.md) | Fase 3 | Cart, alamat pembeli, integrasi RajaOngkir (cek ongkir), pembuatan order |
| [4-payment-satutera.md](./4-payment-satutera.md) | Fase 4 | Satutera Payment Service (channel, create payment, halaman VA/QRIS, WebSocket, callback) |
| [5-fulfillment-and-admin.md](./5-fulfillment-and-admin.md) | Fase 5 | Fulfillment fisik & digital, notifikasi, panel god-mode, expiry job |

Sumber kebutuhan: [`docs/human-notes/ecommerce-note.txt`](../../human-notes/ecommerce-note.txt) dan
[`docs/guidance/payment-guidance.md`](../../guidance/payment-guidance.md).

---

## 1. Kondisi codebase saat ini (hasil audit)

Beberapa hal penting yang berbeda dari yang tertulis di `docs/0.intro.md` dan `skills.md` — plan ini
mengikuti **kondisi kode nyata**, bukan dokumen lama:

| Aspek | Klaim di docs lama | Kenyataan di repo |
| --- | --- | --- |
| Framework | Laravel 13 | Laravel **11.30** (`composer.json`), PHP ^8.3 |
| UI kit | Shadcn UI | **Tidak ada** shadcn/radix. Tailwind v4 + komponen tangan sendiri + Material Symbols |
| Tema | "Ijo Kukus" (hijau) | Token Material di `resources/css/app.css`, primary = `--color-legacy-maroon` (#560607) |
| Payment gateway | Midtrans/Xendit + `spatie/laravel-webhook-client` | **iPaymu langsung** (`IPaymuService`), tanpa package webhook client |
| State management | Zustand | Tidak terpasang; state pakai `useState` + props Inertia |

Yang sudah ada dan **akan dipakai ulang** oleh modul Store:

- **Struktur domain**: `app/Domains/{Alumni,Donation,Event,GodMode,Shared}` → Store jadi domain baru.
- **Auth ganda**: user via Google OAuth (`users.is_verified`), admin via guard `admin`
  (`App\Models\Admin` + middleware `god-mode.auth`) + `admin_activity_logs`.
- **Tabel wilayah**: `indonesia_provinces / cities / districts / villages`. `indonesia_villages`
  sudah punya kolom `postal_code`, `lat`, `lng` — persis yang diminta di note.
- **Ledger pembayaran**: tabel `transactions` dengan `payment_hash` (URL publik `/payment/{hash}`),
  `payment_proofs` untuk transfer manual, plus halaman `Pages/Payment/PaymentPage.tsx`.
- **Media**: `spatie/laravel-medialibrary` (pola `registerMediaCollections` + accessor `image_url`).
- **Slug**: `spatie/laravel-sluggable` (`HasSlug`). **Filter**: `spatie/laravel-query-builder`.
- **Notifikasi**: `BrevoApiService` + queued job (`app/Jobs/Send*Email.php`) dan `TelegramService`
  (`notifyPaymentProof`) untuk notifikasi ke channel admin.
- **Audit delete**: `DeletedItemObserver` + trigger Postgres per tabel (tidak ada soft delete).
- **Komponen FE siap pakai**: `AsyncSelect`, `CurrencyInput`, `ImagePreviewModal`, `ToggleSwitch`,
  `Header`, `Footer`, i18n via `lang/*.json` + `useTranslate`.

Stack runtime: **PostgreSQL**, `QUEUE_CONNECTION=database`, `BROADCAST_CONNECTION=log`
(broadcasting belum dipakai — dan **memang tidak dibutuhkan**, lihat keputusan D4).

---

## 2. Ruang lingkup MVP 2

**Termasuk**

1. User terverifikasi bisa mengajukan toko → admin approve/reject → notifikasi.
2. Satu toko banyak pengelola lewat invitation (role `owner` dan `admin`).
3. Satu toko satu alamat origin (skema sudah disiapkan multi-alamat untuk nanti).
4. Produk fisik & non-fisik, harga tunggal atau varian (maksimal 2 opsi, mis. Ukuran × Warna).
5. Cek ongkir via **RajaOngkir (Komerce V2)**.
6. Checkout + pembayaran via **Satutera Payment Service** (QRIS / Virtual Account, `raw_detail`),
   fee channel masuk ke total tagihan.
7. Halaman pembayaran realtime (WebSocket Satutera) + polling fallback.
8. Fulfillment sederhana: input resi untuk produk fisik, link download untuk produk digital.

**Tidak termasuk (ditunda)**

- **KiriminAja** → MVP 2.1 (sesuai arahan; abstraksi `ShippingProviderInterface` tetap disiapkan
  sekarang supaya penambahannya tidak membongkar apa pun).
- Pembuatan label/pickup/tracking otomatis dari kurir (MVP 2 cuma cek ongkir + resi manual).
- Checkout multi-toko dalam satu pembayaran, kupon/diskon, review produk, chat, refund otomatis,
  payout ke pemilik toko, role selain `owner`/`admin`.

---

## 3. Keputusan arsitektur

### D1 — Domain baru `app/Domains/Store`

```
app/Domains/Store/
├── Controllers/          StoreController, StoreApplicationController, StoreMemberController,
│                         ProductController, CartController, CheckoutController,
│                         StoreOrderController, ShippingController, StorePaymentPageController
├── Models/               Store, StoreMember, StoreAddress, Product, ProductVariant,
│                         Cart, CartItem, StoreOrder, StoreOrderItem, DigitalDelivery
├── Services/             CartService, CheckoutService, OrderFulfillmentService
├── Actions/              ApproveStore, RejectStore, InviteStoreMember, PlaceOrder
└── Policies/             StorePolicy, ProductPolicy, StoreOrderPolicy
```

Service pihak ketiga tetap di `app/Domains/Shared/Services/` mengikuti pola `IPaymuService`:
`SatuteraPaymentService`, `RajaOngkirService`.

### D2 — ULID untuk entitas store, bigint untuk sisanya

Note minta ULID/UUID untuk `stores` dan `products`. Repo saat ini **100% bigint auto-increment**.
Keputusan: pakai **ULID hanya untuk entitas yang ID-nya muncul di URL/API publik atau perlu
di-generate di klien** — `stores`, `products`, `product_variants`, `store_orders`. Tabel turunan
murni internal (`store_members`, `cart_items`, `store_order_items`) tetap bigint supaya tidak
menambah biaya index tanpa alasan.

Laravel 11 sudah punya `HasUlids` dan `$table->ulid('id')->primary()` — tidak perlu package baru.
Konsekuensi yang harus dijaga: **jangan** pakai `exists:products,id` dengan asumsi integer, dan FK
di tabel anak harus `->ulid('product_id')` bukan `->foreignId()`.

### D3 — `transactions` dibuat polymorphic (aditif, bukan breaking)

`transactions.rsvp_id` sekarang `NOT NULL` FK ke `rsvps` — ini penghalang utama untuk memakai ledger
yang sama bagi order toko. Rencana:

```php
Schema::table('transactions', function (Blueprint $table) {
    $table->string('payable_type')->nullable()->after('id');
    $table->string('payable_id')->nullable()->after('payable_type');   // string: menampung ULID & bigint
    $table->decimal('payment_fee', 12, 2)->default(0)->after('amount');
    $table->string('checkout_token')->nullable()->index();             // Satutera
    $table->json('payment_detail')->nullable();                        // VA/QRIS raw_detail
    $table->index(['payable_type', 'payable_id']);
});
// + backfill: payable_type = Rsvp::class, payable_id = rsvp_id untuk semua baris lama
// + rsvp_id diubah jadi nullable
```

Alur event lama **tidak disentuh sama sekali**: ia tetap mengisi `rsvp_id` dan relasi
`Transaction::rsvp()` tetap jalan. Order toko mengisi `payable_*` dan membiarkan `rsvp_id` null.
Alternatif "tabel `store_payments` terpisah" ditolak karena akan menduplikasi halaman pembayaran,
webhook, dan panel pembayaran god-mode.

### D4 — WebSocket: klien langsung ke Satutera, backend kita tidak jadi broker

`payment-guidance.md` §4: socket.io server ada di Satutera (`/ws/payments`), room diakses dengan
`checkout_token`. Jadi browser pembeli connect **langsung** ke Satutera. Konsekuensi:

- Tidak perlu Reverb/Pusher, `BROADCAST_CONNECTION` tetap `log`.
- Tambah dependency FE: `pnpm add socket.io-client`.
- `checkout_token` diperlakukan seperti bearer token — hanya dikirim ke halaman pembayaran yang
  aksesnya sudah dijaga `payment_hash`.
- **Sumber kebenaran fulfillment tetap callback server-to-server** (§7 guidance), bukan event socket
  dan bukan redirect browser. Socket cuma untuk UX.

### D5 — Ongkir: `ShippingProviderInterface` sejak awal

Meski MVP 2 cuma RajaOngkir, kontraknya dibuat dulu supaya KiriminAja di MVP 2.1 tinggal nambah
implementasi + binding, sesuai pola `PaymentProviderInterface` yang sudah ada:

```php
interface ShippingProviderInterface {
    public function searchDestination(string $query, int $limit = 10): array;
    public function resolveDestinationId(string $postalCode, ?string $districtName = null): ?string;
    public function calculateCost(ShippingQuoteRequest $request): array; // ShippingRate[]
}
```

### D6 — Masalah pemetaan wilayah (perlu perhatian khusus)

Note minta alamat pakai `indonesia_villages.postal_code`, tapi RajaOngkir punya **ID destination
sendiri**. Jadi butuh jembatan: `postal_code` (dan nama kelurahan/kecamatan sebagai tie-breaker) →
`GET /destination/domestic-destination?search={zip}` → simpan hasilnya di tabel cache
`shipping_destinations` dan di kolom `rajaongkir_destination_id` pada alamat. Satu kode pos bisa
memetakan ke lebih dari satu kelurahan, jadi pencocokan harus menyertakan nama, dan hasil ambigu
ditampilkan sebagai pilihan ke user saat menyimpan alamat — bukan ditebak diam-diam. Detail di
[3-cart-checkout-shipping.md](./3-cart-checkout-shipping.md).

### D7 — Stok: dikurangi saat order dibuat, dikembalikan saat kedaluwarsa

Mengikuti pola modul Event (`RsvpController` mengurangi `stock_quantity` saat RSVP dibuat, dengan
`lockForUpdate()`). Ditambah command terjadwal `store:expire-orders` (per jam) yang membatalkan
order `pending_payment` yang lewat `expires_at` dan mengembalikan stok — command sejenis pernah
direncanakan untuk RSVP di `docs/5.payment-gateway.md` tapi **belum pernah dibuat**; kali ini dibuat
beneran untuk order toko.

### D8 — Halaman pembayaran order dibuat terpisah dulu

`Pages/Payment/PaymentPage.tsx` sudah 778 baris dan penuh logika khusus RSVP/iPaymu. Order toko
dapat halaman sendiri (`Pages/Store/PaymentPage.tsx`) yang memakai `payment_hash` yang sama.
Konsolidasi keduanya dicatat sebagai utang teknis, bukan pekerjaan MVP 2.

---

## 4. Peta data (ringkas)

```
users ──< store_members >── stores ──< store_addresses ──> indonesia_villages
                              │
                              ├──< products ──< product_variants
                              │        └── media (product-images, product-digital-file)
                              │
                              └──< store_orders ──< store_order_items ──< digital_deliveries
                                        │
users ──< user_addresses                └──> transactions (payable_type/payable_id)  ──> Satutera
                                                                                     └─ webhook + socket
shipping_destinations   (cache pemetaan kode pos → destination id RajaOngkir)
payment_webhook_events  (idempotency callback)
```

Tabel baru: `stores`, `store_members`, `store_addresses`, `user_addresses`, `products`,
`product_variants`, `carts`, `cart_items`, `store_orders`, `store_order_items`,
`digital_deliveries`, `shipping_destinations`, `payment_webhook_events`.
Tabel diubah: `transactions` (aditif, lihat D3).

---

## 5. Variabel environment baru

```env
# Satutera Payment Service
SATUTERA_BASE_URL=https://payment.satutera.com
SATUTERA_CLIENT_ID=marhalaty
SATUTERA_CLIENT_SECRET=
SATUTERA_API_KEY=
SATUTERA_WEBHOOK_SECRET=
VITE_SATUTERA_BASE_URL="${SATUTERA_BASE_URL}"   # dipakai socket.io-client di browser

# RajaOngkir (Komerce V2)
RAJAONGKIR_BASE_URL=https://rajaongkir.komerce.id/api/v1
RAJAONGKIR_API_KEY=
RAJAONGKIR_COURIERS=jne:sicepat:jnt:pos:tiki
RAJAONGKIR_CACHE_TTL=21600

# Store module
STORE_ORDER_EXPIRY_MINUTES=1440
STORE_DIGITAL_DOWNLOAD_MAX=5
```

Semua dibaca lewat `config/services.php` (pola yang sudah dipakai `ipaymu`, `brevo`, `telegram`),
plus `config/store.php` untuk aturan bisnis (expiry, batas download, batas varian).

---

## 6. Urutan pengerjaan & Definition of Done

| Fase | Fokus | Bisa dites saat selesai |
| --- | --- | --- |
| 1 | Store foundation | User verified mengajukan toko, admin approve/reject, owner invite admin, alamat origin tersimpan dengan `rajaongkir_destination_id` |
| 2 | Katalog produk | Owner membuat produk fisik & digital, varian 2 opsi dengan harga/stok sendiri, etalase publik `/stores/{slug}` |
| 3 | Cart + ongkir | Tambah ke cart, pilih alamat, tarif kurir muncul dari RajaOngkir, order `pending_payment` terbentuk dengan stok terkunci |
| 4 | Pembayaran | Pilih channel, VA/QRIS tampil, status berubah realtime, callback tervalidasi menandai order `paid` |
| 5 | Fulfillment + admin | Resi diinput, link download digital terkirim, god-mode bisa kelola store & order, order kedaluwarsa mengembalikan stok |

Fase 1–2 dan 3–4 punya ketergantungan berurutan; fase 4 bisa mulai paralel dengan fase 3 karena
`SatuteraPaymentService` tidak bergantung pada cart.

**DoD keseluruhan MVP 2**

- [ ] Semua tabel baru punya migration + trigger delete-tracking + observer terdaftar di `AppServiceProvider`.
- [ ] Semua kalkulasi uang (subtotal, ongkir, fee, total) **dihitung ulang di server** saat checkout — nilai dari klien hanya untuk tampilan.
- [ ] Semua mutasi status pembayaran dibungkus `DB::transaction()` dan idempoten.
- [ ] Tidak ada N+1 di listing produk/order (pakai `with()`), diverifikasi lewat Telescope.
- [ ] Policy menjaga: hanya anggota toko yang bisa kelola produk/order toko itu; hanya owner yang bisa invite/revoke.
- [ ] `pnpm build` lolos tanpa error TypeScript; tidak ada `any` di kode baru.
- [ ] Kredensial provider tidak pernah ikut ke payload Inertia.

---

## 7. Risiko yang sudah teridentifikasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| `MarhalahScope` (global scope di `User`) memfilter user berdasarkan `marhalah_year` saat `COMMUNITY_SCOPE=single` | Undangan anggota toko / data pembeli lintas marhalah bisa "hilang" secara diam-diam | Query user di konteks store pakai `User::withoutGlobalScope(MarhalahScope::class)`, dan tulis test untuk itu |
| Kode pos → destination RajaOngkir tidak 1:1 | Ongkir salah hitung atau gagal | Simpan hasil resolusi per alamat, tampilkan pilihan saat ambigu, cache di `shipping_destinations` (D6) |
| Body request HMAC Satutera harus byte-identik dengan yang ditandatangani | Signature ditolak 401 | Bangun raw JSON sekali, tanda tangani, lalu kirim dengan `Http::withBody($raw, 'application/json')` — **jangan** `->post($url, $array)` |
| Status `expired` internal Satutera tidak mengirim event socket (guidance §6) | Halaman bayar nyangkut di "pending" selamanya | Cek `expires_at` lokal di klien + polling fallback + command `store:expire-orders` |
| Callback bisa dikirim berulang (retry backoff Satutera) | Stok/fulfillment dobel | Tabel `payment_webhook_events` dengan unique key + `lockForUpdate()` pada transaksi |
| Perubahan `transactions` menyentuh alur event yang sudah produksi | Regresi pendaftaran event | Migration aditif + backfill, `rsvp_id` tetap diisi alur lama, uji regresi RSVP sebelum rilis |
| Produk digital bocor lewat URL media publik | Barang berbayar bisa diunduh gratis | File digital disimpan di disk privat, diakses lewat signed route + token per order item |

---

## 8. Konvensi pengerjaan

Mengikuti `Agents.md`: sebelum menulis kode, buat file checklist di `/tasks/` untuk tiap fase
(`12-store-foundation-progress.md`, `13-product-catalog-progress.md`, dst), backend dulu
(migration → model → service/action → controller → route), baru frontend TypeScript,
lalu tandai checklist selesai. Package manager **pnpm**, artisan untuk migration.
