# Fase 5 — Fulfillment, Notifikasi, Panel Admin, dan Job Terjadwal

Prasyarat: [Fase 4](./4-payment-satutera.md) selesai.

---

## 1. Fulfillment produk fisik

Status order bergerak:

```
pending_payment ──(callback paid)──> paid ──> processing ──> shipped ──> completed
       │                                                        │
       ├──(expired / dibatalkan)──> expired / cancelled         └──> completed otomatis 7 hari setelah shipped
```

Aksi pengelola toko di `/my/stores/{store}/orders`:

| Aksi | Perubahan |
| --- | --- |
| Proses pesanan | `paid` → `processing` |
| Input resi | `processing` → `shipped`, isi `tracking_number`, `shipped_at`; kirim email ke pembeli |
| Tandai selesai | `shipped` → `completed`, isi `completed_at` |
| Batalkan | hanya dari `paid`/`processing`, kembalikan stok, catat alasan (refund manual di luar sistem MVP 2) |

Pembeli bisa menandai `completed` sendiri dari `/my/orders/{id}` setelah barang diterima. Order
`shipped` yang tidak disentuh 7 hari ditutup otomatis oleh command terjadwal.

Transisi status divalidasi di `OrderFulfillmentService` dengan peta transisi eksplisit — bukan
`update(['status' => $request->status])` yang menerima apa saja dari klien.

---

## 2. Fulfillment produk digital

Dijalankan `OrderFulfillmentService::onPaid()`, dipicu **hanya** oleh callback tervalidasi.

```php
Schema::create('digital_deliveries', function (Blueprint $table) {
    $table->id();
    $table->foreignId('store_order_item_id')->constrained('store_order_items')->cascadeOnDelete();
    $table->foreignId('media_id')->constrained('media')->cascadeOnDelete();
    $table->string('download_token', 64)->unique();
    $table->integer('download_count')->default(0);
    $table->integer('max_downloads')->default(5);
    $table->timestamp('expires_at')->nullable();
    $table->timestamp('last_downloaded_at')->nullable();
    $table->timestamps();
});
```

Route unduhan:

```
GET /downloads/{token}      → name: store.downloads.show
```

Pemeriksaan sebelum mengalirkan file:

1. Token ada dan belum kedaluwarsa (`expires_at`, default 30 hari sejak lunas).
2. `download_count < max_downloads` (`STORE_DIGITAL_DOWNLOAD_MAX`, default 5).
3. Order induknya berstatus `paid` atau `completed`.
4. Pengunduh adalah pembeli order tersebut (`auth()->id() === $order->buyer_user_id`).

Baru kemudian `Storage::disk('local')->download(...)` dan `increment('download_count')`.

> File produk digital ada di disk **privat** (fase 2). Jangan pernah mengirim URL media mentahnya
> ke payload Inertia — yang dikirim hanya `download_token`.

---

## 3. Notifikasi

Semua lewat queued job mengikuti pola `app/Jobs/SendEventRegistration*Email.php`
(`ShouldQueue`, konstruktor menerima model, `handle(BrevoApiService $brevo)`).

| Kejadian | Penerima | Isi |
| --- | --- | --- |
| Order dibuat (`pending_payment`) | Pembeli | Ringkasan order + link `/store/payment/{hash}` |
| Pembayaran lunas | Pembeli | Konfirmasi + link download (kalau ada produk digital) |
| Pembayaran lunas | Owner + admin toko | Pesanan baru masuk, perlu diproses |
| Resi diinput | Pembeli | Kurir, layanan, nomor resi |
| Order kedaluwarsa | Pembeli | Pemberitahuan + link produk untuk memesan ulang |
| Pesanan baru berbayar | Channel Telegram admin | Ringkasan singkat (pola `TelegramService::notifyPaymentProof`) |

Template email: `resources/views/emails/store-*.blade.php` (pola penamaan datar seperti
`event-registration-confirmed.blade.php` yang sudah ada), semuanya `@extends('emails.layout')`.
Semua teks user-facing mengikuti i18n `lang/{id,en}.json`.

---

## 4. Panel god-mode

Tambahan menu di `resources/js/Layouts/GodModeLayout.tsx`:

```ts
{ href: "/god-mode/stores", label: "Stores", icon: "storefront" },
{ href: "/god-mode/store-orders", label: "Store Orders", icon: "shopping_bag" },
```

### Halaman

| Route | Isi |
| --- | --- |
| `/god-mode/stores` | Daftar toko + filter status; badge jumlah pengajuan `pending` |
| `/god-mode/stores/{id}` | Detail + approve/reject/suspend (fase 1) + ringkasan produk & order |
| `/god-mode/store-orders` | Semua order lintas toko; filter status, toko, rentang tanggal |
| `/god-mode/store-orders/{id}` | Detail order + riwayat transaksi + payload callback (untuk debugging) |

Panel pembayaran god-mode yang sudah ada (`/god-mode/payments`) menampilkan `transactions` untuk
persetujuan transfer manual. Query di `GodMode\PaymentController` sudah difilter
`where('payment_provider', 'manual')`, sedangkan order toko memakai `'satutera'` — jadi **tidak ada
kebocoran** selama MVP 2. Yang perlu diperhatikan: controller itu melakukan eager load `rsvp.event`
dan mengaksesnya di view, jadi begitu toko suatu saat menawarkan transfer manual, halaman itu akan
error karena `rsvp` null. Tambahkan `->whereNotNull('rsvp_id')` sekarang sebagai penjagaan murah,
sebelum ada yang menambahkan channel manual ke toko dan lupa.

Semua aksi admin mencatat `AdminActivityLog` (pola yang sudah dipakai modul lain).

### Ekspor

Ekspor order per toko/periode ke Excel memakai `maatwebsite/excel`, mengikuti
`app/Domains/GodMode/Exports/EventParticipantsExport.php`.

---

## 5. Job terjadwal

`app/Console/Commands/ExpireStoreOrders.php` — signature `store:expire-orders`:

```php
StoreOrder::where('status', 'pending_payment')
    ->where('expires_at', '<', now())
    ->chunkById(100, function ($orders) {
        foreach ($orders as $order) {
            DB::transaction(function () use ($order) {
                $order->update(['status' => 'expired', 'cancelled_at' => now()]);
                app(OrderFulfillmentService::class)->releaseStock($order);
                $order->transactions()->where('status', 'pending')->update(['status' => 'expired']);
            });
            SendOrderExpiredEmail::dispatch($order);
        }
    });
```

`app/Console/Commands/CompleteShippedOrders.php` — `store:complete-shipped`: order `shipped` yang
`shipped_at` lebih dari 7 hari lalu → `completed`.

Dijadwalkan di `routes/console.php` (Laravel 11 tidak lagi memakai `App\Console\Kernel`):

```php
Schedule::command('store:expire-orders')->hourly();
Schedule::command('store:complete-shipped')->dailyAt('02:00');
```

> **Prasyarat operasional:** `php artisan schedule:run` harus terpasang di cron server produksi.
> Periksa dulu — repo punya banyak job antrean tapi belum ada command terjadwal, jadi bisa jadi
> cron-nya memang belum pernah dipasang. Kalau belum, order kedaluwarsa tidak akan pernah
> mengembalikan stok. Catat di `DEPLOYMENT.md` bersama konfigurasi queue worker yang sudah ada.

`releaseStock()` harus idempoten: hanya kembalikan stok kalau order belum pernah dilepas
(tandai lewat kolom atau cek status sebelum transisi di dalam `lockForUpdate()`), supaya command
yang jalan bersamaan dengan callback tidak menggandakan stok.

---

## 6. Halaman pembeli

```
resources/js/Pages/Store/Orders/
├── Index.tsx     riwayat pesanan + filter status
└── Show.tsx      detail: item, alamat, resi, tombol unduh digital, tombol "Pesanan diterima"
```

Tautan **Pesanan Saya** ditambahkan ke dropdown `Components/Header.tsx` dan ke `Pages/Dashboard.tsx`.

---

## 7. Definition of Done

- [ ] Owner bisa memindahkan order dari `paid` → `processing` → `shipped` (dengan resi) → `completed`.
- [ ] Transisi status yang tidak sah ditolak server (uji kirim `status: completed` langsung dari `pending_payment`).
- [ ] Pembeli menerima email di setiap perubahan status penting; semuanya lewat antrean, bukan sinkron.
- [ ] Produk digital: link unduh terbit hanya setelah callback `paid`, bukan dari event socket.
- [ ] Token unduh menolak: bukan pembeli, kuota habis, kedaluwarsa, order belum lunas.
- [ ] File digital tidak bisa diakses tanpa token (uji akses langsung ke path storage).
- [ ] `store:expire-orders` mengembalikan stok dengan tepat; dijalankan dua kali tidak menggandakan stok.
- [ ] Halaman `/god-mode/payments` **tidak** lagi memunculkan transaksi order toko.
- [ ] Semua aksi admin atas toko/order tercatat di `admin_activity_logs`.
- [ ] `schedule:run` terkonfirmasi terpasang di cron produksi (atau tercatat sebagai tugas deploy).
- [ ] Ekspor Excel order menghasilkan file yang benar untuk satu toko dan satu rentang tanggal.

---

## 8. Setelah MVP 2 (catatan untuk MVP 2.1+)

- **KiriminAja** sebagai `ShippingProviderInterface` kedua + pemilihan provider per toko.
- Pembuatan order pickup & tracking otomatis dari kurir (bukan cuma cek ongkir).
- Konsolidasi `Pages/Payment/PaymentPage.tsx` dan `Pages/Store/PaymentPage.tsx` jadi satu komponen
  polymorphic; sekaligus pertimbangkan memindahkan pembayaran event dari iPaymu langsung ke Satutera.
- Payout ke pemilik toko dan pembagian komisi.
- Checkout multi-toko dalam satu pembayaran.
- Role toko selain `owner`/`admin` (mis. `staff` yang hanya boleh memproses pesanan).
- Refund lewat API Satutera.
