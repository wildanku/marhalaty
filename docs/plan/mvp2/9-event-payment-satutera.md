# Fase 9 — Pembayaran Event lewat Satutera & Transfer Manual Terpusat

Sumber kebutuhan: [`docs/human-notes/ecommerce-note.txt`](../../human-notes/ecommerce-note.txt) §"Idea Part 3"
poin 3.

> Payment by satutera yg barusan kita garap jg applied di pendaftaran dan pembayaran event, ditambah
> jika user admin ada set manual payment berati jg akan tersedia di opsi pembayaran event.

Prasyarat: [Fase 4](./4-payment-satutera.md) selesai (sudah) **dan**
[Fase 7](./7-payment-settings.md) langkah 7a + 7b selesai — validasi gateway dinamis di
`RsvpController` dan pembacaan rekening manual dari `payment_manual_accounts` adalah pekerjaan
fase 7, bukan fase ini. Fase ini menambahkan **driver `satutera` ke konteks `event`** di atas
fondasi itu.

> Catatan koordinasi: saat dokumen ini ditulis, fase 7 sedang dikerjakan (7a sudah mendarat:
> `payment_gateways`, `payment_manual_accounts`, `PaymentSettingsService`, `/god-mode/settings/payments`).
> Jangan mulai fase 9 sebelum 7b hijau — dua perubahan pada `RsvpController` yang bersamaan akan
> saling menimpa.

---

## 1. Review catatan — kondisi sekarang vs yang diminta

### Peta pembayaran hari ini

| | Pendaftaran event | Checkout toko |
| --- | --- | --- |
| Provider | `manual`, `ipaymu` (dinamis dari pengaturan setelah 7b) | `satutera` (`CheckoutService::place()`) |
| Pembuatan pembayaran | `IPaymuService::initiateDirectPayment()` dipanggil inline di `RsvpController` | `CheckoutService::initiateSatuteraPayment()` (privat) |
| Ledger | `transactions.rsvp_id` terisi, `payable_*` **null** | `payable_type/payable_id` terisi, `rsvp_id` null |
| Halaman bayar | `/payment/{hash}` → `Pages/Payment/PaymentPage.tsx` (778 baris; VA/QRIS iPaymu + daftar rekening manual) | `/store/payment/{hash}` → `Pages/Store/PaymentPage.tsx` (319 baris; VA/QRIS Satutera + socket + countdown + polling) |
| Status realtime | ❌ tidak ada | ✅ socket.io ke Satutera + polling `/store/payment/{hash}/status` |
| Callback | `POST /payments/ipaymu/webhook` → `Event\PaymentController::ipaymuWebhook()` | `POST /webhooks/satutera/payment` → `Store\SatuteraWebhookController` |
| Fee channel | Ditampilkan di `Event/Show.tsx`, **tidak** disimpan di `transactions.payment_fee` dan tidak ikut `transactions.amount` | Dihitung ulang di server, disimpan, ikut total |

### Yang sudah siap dipakai ulang (tidak perlu dibangun lagi)

- `transactions` sudah polimorfik dan sudah punya `payment_fee`, `checkout_token`, `payment_detail`
  (fase 4 / README D3).
- `SatuteraPaymentService` sudah lengkap: `getPaymentChannels()`, `findChannel()`, `createPayment()`,
  `getPaymentStatus()`, `verifyCallbackSignature()` — dan setelah 7a sudah membaca kredensial lewat
  `PaymentSettingsService` (bukan constructor), jadi tidak ada yang perlu di-refactor lagi di sisi
  klien HTTP.
- `payment_webhook_events` (idempotensi callback) sudah ada dan tidak terikat ke domain Store.
- Panel VA/QRIS + socket + countdown + polling sudah bekerja di `Pages/Store/PaymentPage.tsx`.
- `socket.io-client` dan `qrcode.react` sudah terpasang.

### Hambatan nyata yang harus dibongkar

1. **`SatuteraWebhookController` hanya paham `StoreOrder`.** Ia berada di `app/Domains/Store/Controllers/`,
   memanggil `OrderFulfillmentService` langsung, dan mengasumsikan `$transaction->payable` adalah
   order toko. Transaksi RSVP akan lolos verifikasi tanda tangan lalu **tidak melakukan apa pun**.
2. **Pembuatan pembayaran Satutera terkubur di `CheckoutService`** sebagai method privat yang
   membaca `$order->order_number`, `$order->items`, dan route order. Tidak bisa dipanggil dari
   `RsvpController` tanpa diekstrak.
3. **Halaman `/payment/{hash}` tidak tahu Satutera.** Tidak ada render `payment_detail`, tidak ada
   socket, tidak ada endpoint status.
4. **`/api/payment-channels` sudah dipakai untuk iPaymu** (`EventController::paymentChannels`).
   Channel Satutera ada di `/api/store/payment-channels` — namanya menyesatkan begitu dipakai event.
5. **Aturan `qris_only_below_amount` hidup di `config/store.php`**, padahal batasan nominal minimum
   VA adalah properti channel Satutera, bukan properti toko.
6. **Fee event hari ini hanya kosmetik.** `Event/Show.tsx` menghitung `adminFee` dari channel iPaymu
   dan menampilkannya di total, tapi `RsvpController` menyimpan `amount = paket + infak + addon`
   tanpa fee dan `payment_fee` tidak pernah diisi. Sebelum menyentuh apa pun, **verifikasi ke satu
   transaksi iPaymu nyata** apakah pembeli selama ini ditagih dengan fee atau tanpa fee — jangan
   "membetulkan" berdasarkan pembacaan kode saja, karena selisihnya langsung terasa di tagihan orang.
   Untuk Satutera aturannya sudah pasti dan terdokumentasi (guidance §3): `amount` yang dikirim
   **belum** termasuk fee, provider menambahkannya sendiri.

---

## 2. Keputusan desain

### D33 — Transaksi event Satutera mengisi `rsvp_id` **dan** `payable_*`

Semua pembaca lama (`PaymentPageController::show()` yang `->rsvp->event`, `Event\PaymentController`,
`GodMode\PaymentController`, job email, `TelegramService`) bergantung pada `rsvp_id`. Mengisi dua-duanya
berarti nol perubahan di pembaca lama, sementara webhook dan kode baru cukup memakai `payable`.

Biayanya satu kolom terisi ganda untuk RSVP; harganya jauh lebih murah daripada memburu semua
pembaca `rsvp_id` di rilis yang sama dengan alur uang baru.

### D34 — Webhook Satutera naik ke lapisan bersama, dengan *router* per tipe payable

`SatuteraWebhookController` pindah ke `app/Domains/Shared/Controllers/` (folder baru — dibenarkan
karena ia kini melayani dua domain). **URL dan nama route tidak berubah**
(`POST /webhooks/satutera/payment`, `webhooks.satutera.payment`) supaya konfigurasi callback di sisi
Satutera tidak perlu disentuh.

Verifikasi tanda tangan, idempotensi `payment_webhook_events`, pencarian transaksi, dan pengecekan
selisih nominal tetap satu tempat; yang bercabang hanya efek sampingnya:

```php
match (true) {
    $payable instanceof StoreOrder => $this->storeOrders->handle($payable, $status),
    $payable instanceof Rsvp       => $this->rsvps->handle($payable, $status),
    default                        => Log::warning(...),   // transaksi tanpa payable dikenali → jangan diam
};
```

`Rsvp` sengaja tidak diberi `OrderFulfillmentService` tandingan: efeknya cukup "mirror status +
kirim email konfirmasi", dan `RsvpObserver` yang sudah ada mengurus `booked_count` paket. Kalau fase
8 sudah mendarat, cabang gagal/kedaluwarsa juga memanggil `ProductStockService::releaseFor($rsvp)`.

### D35 — `SatuteraPaymentInitiator` diekstrak ke `app/Domains/Shared/Services/`

Satu tempat yang memegang aturan yang mudah salah dan mahal kalau salah:

- `amount` yang dikirim = `transaction.amount − transaction.payment_fee` (guidance §3; kalau lupa,
  fee tertagih dua kali).
- Idempotency-Key deterministik supaya percobaan ulang tidak membuat pembayaran ganda.
- `DB::transaction()` bersarang (savepoint) saat menulis balik `checkout_token`/`payment_detail` —
  komentar panjang di `CheckoutService` menjelaskan kenapa: di Postgres, satu statement gagal
  membatalkan seluruh transaksi luar meski exception-nya ditangkap PHP.
- Kegagalan provider tidak menggagalkan checkout/pendaftaran; halaman bayar yang mencoba ulang.

`CheckoutService` dan `RsvpController` sama-sama memanggilnya dengan deskriptor
(`client_transaction_id`, item, customer, URL redirect, metadata). Perilaku toko harus **identik**
setelah ekstraksi — itu ukuran bahwa refactor-nya benar.

### D36 — Fee disimpan di transaksi; `rsvps.total_amount` tetap nilai pendaftaran

`rsvps.total_amount` dipakai laporan panitia dan ekspor peserta. Menyuntikkan fee channel ke sana
akan mengubah arti kolom yang sudah lama dipakai, dan angkanya akan berbeda antar peserta hanya
karena mereka memilih channel berbeda.

Jadi: `transactions.amount = rsvp.total_amount + fee`, `transactions.payment_fee = fee`,
`rsvps.total_amount` tidak berubah. UI wajib menampilkan keduanya secara terpisah ("Total
pendaftaran" + "Biaya layanan"), termasuk di email tagihan.

### D37 — Panel pembayaran Satutera jadi komponen bersama, halaman tetap dua

Ekstrak blok VA/QRIS + socket + countdown + polling dari `Pages/Store/PaymentPage.tsx` ke
`resources/js/Components/Payment/SatuteraPanel.tsx`; `Pages/Payment/PaymentPage.tsx` merendernya
saat `transaction.payment_provider === 'satutera'`.

Yang **tidak** dilakukan: menggabung dua halaman pembayaran jadi satu komponen polimorfik. Itu sudah
tercatat sebagai utang teknis di README D8 dan fase 5 §8, dan mengerjakannya bersamaan dengan alur
uang baru menambah risiko tanpa menambah nilai.

### D38 — Aturan nominal minimum pindah ke `config/payments.php`

`qris_only_below_amount` berlaku untuk channel, bukan untuk toko. Pindahkan ke `config/payments.php`
(berkas milik fase 7, penambahannya aditif); `config/store.php` tetap ada dan meneruskan nilainya
supaya tidak ada pemanggil yang patah dalam satu rilis.

### D39 — Toggle gateway hanya menyaring pilihan saat pendaftaran

Webhook, halaman bayar, dan endpoint status **tidak boleh** memeriksa `is_enabled`. Kalau admin
mematikan Satutera saat masih ada VA yang beredar, pembeli yang sudah terlanjur transfer harus tetap
bisa diselesaikan. Aturan ini sudah ditulis di fase 7 §8 untuk toko; fase ini menegaskannya untuk
event dan menaruhnya sebagai komentar di handler, bukan hanya di dokumen.

### D40 — Endpoint channel dinamai ulang, alias lama dipertahukan

Tambah `GET /api/payment/channels?gateway=satutera` (netral konteks). `/api/store/payment-channels`
tetap ada sebagai alias supaya `Pages/Store/Checkout.tsx` tidak perlu ikut dirilis bersamaan;
`/api/payment-channels` (iPaymu) tidak disentuh sama sekali.

---

## 3. Perubahan backend

| Berkas | Perubahan |
| --- | --- |
| `Shared/Services/SatuteraPaymentInitiator.php` (baru) | Hasil ekstraksi `CheckoutService::initiateSatuteraPayment()`; menerima `Transaction` + deskriptor, menulis balik `external_reference`/`checkout_token`/`payment_detail`/`va_number`/`expired_at` |
| `Store/Services/CheckoutService.php` | Memanggil initiator baru; tidak ada perubahan perilaku (dijaga test) |
| `Shared/Controllers/SatuteraWebhookController.php` (pindah) | Router per tipe payable (D34); route & URL tidak berubah |
| `Shared/Services/RsvpPaymentService.php` (baru) | `handle(Rsvp, status)` — mirror status RSVP, kirim `SendEventRegistrationConfirmedEmail` saat `paid`, lepas reservasi produk saat gagal/kedaluwarsa (kalau fase 8 sudah ada). Idempoten: RSVP yang sudah `paid` tidak diproses ulang |
| `Event/Controllers/RsvpController.php` | Cabang `satutera`: validasi `provider/method/channel`, `findChannel()`, hitung fee di server, cek `qris_only_below_amount`, buat transaksi (`rsvp_id` + `payable_*`), panggil initiator, redirect ke `/payment/{hash}` |
| `Event/Controllers/PaymentPageController.php` | Kirim `checkoutToken`, `expiresAt`, `satuteraWsUrl` ke prop; **jangan** menambahkan filter provider (halaman ini melayani manual/ipaymu/satutera) |
| `Event/Controllers/PaymentPageController@status` (baru) | `GET /payment/{hash}/status` — polling fallback, bentuk respons sama persis dengan versi toko |
| `Shared/Controllers/PaymentChannelController.php` | `/api/payment/channels` netral konteks (D40) |
| `config/payments.php` | `drivers.satutera.contexts` → `['store', 'event']`; tambah `qris_only_below_amount` (D38) |

Yang **tidak** berubah: `IPaymuService`, `Event\PaymentController::ipaymuWebhook()`, dan seluruh
alur manual event (milik fase 7b). Pendaftaran iPaymu harus tetap berjalan persis seperti sebelumnya.

### Data migration

Satu baris: `payment_gateways` dengan `code = satutera` mendapat `event` di kolom `contexts`.
Dijalankan **setelah** kodenya mendarat, bukan sebelum — kalau `contexts` menyebut `event` sementara
`RsvpController` belum bisa menanganinya, `PaymentSettingsService::gatewaysFor('event')` sudah
menyaring lewat `config('payments.drivers.satutera.contexts')`, jadi urutan salah pun tidak
menampilkan opsi rusak ke pembeli — tapi tetap kerjakan berurutan.

---

## 4. Perubahan frontend

1. **`Components/Payment/SatuteraPanel.tsx` (baru)** — hasil ekstraksi dari `Pages/Store/PaymentPage.tsx`:
   VA/QRIS, salin nomor, countdown lokal, socket.io ke Satutera, polling fallback (URL status jadi
   prop). `Pages/Store/PaymentPage.tsx` memakainya dan harus tetap berperilaku sama.
2. **`Pages/Payment/PaymentPage.tsx`** — tambah cabang `payment_provider === 'satutera'` yang
   merender panel bersama. Cabang `manual` dan `ipaymu` tidak disentuh; file ini sudah 778 baris,
   jadi perubahan harus berupa penambahan satu cabang, bukan penataan ulang.
3. **`Pages/Event/Show.tsx` (langkah "Konfirmasi")** — daftar metode pembayaran datang dari prop
   `paymentGateways` (deskriptor publik `PaymentSettingsService::gatewaysFor('event')`; kecil dan
   terbatas, aman sebagai prop Inertia). Untuk gateway `requires_channel`, tampilkan pemilih channel
   dari `/api/payment/channels?gateway=…`. Rincian biaya menampilkan "Total pendaftaran" dan "Biaya
   layanan" terpisah (D36).
4. **`resources/js/types/index.d.ts`** — `Transaction` sudah punya `payment_detail`/`checkout_token`
   (dipakai halaman toko); tambahkan tipe `PaymentGatewayOption` bersama. Tanpa `any`.

---

## 5. Interaksi dengan fase lain

| Fase | Interaksi |
| --- | --- |
| **7b** (event pakai pengaturan) | Prasyarat keras. Validasi `enabledCodesFor('event')` dan rekening manual sudah dikerjakan di sana; fase 9 hanya menambah satu driver ke daftar yang sama |
| **7c** (manual untuk toko) | Tidak saling bergantung, tapi keduanya menyentuh `GodMode\PaymentController`. Rilis berurutan, jangan paralel |
| **8** (produk di event) | Kalau fase 8 sudah ada: callback `paid` tidak mengubah reservasi; callback `failed`/`expired`/`cancelled` **wajib** memanggil `ProductStockService::releaseFor($rsvp)`. Kalau fase 8 belum ada, cabang itu tidak ditulis dulu |
| **README D8** | Konsolidasi dua halaman pembayaran tetap ditunda; fase ini hanya mengekstrak satu komponen bersama (D37) |

---

## 6. Urutan pengerjaan

| Langkah | Isi | Risiko rilis |
| --- | --- | --- |
| **9a** | Ekstraksi `SatuteraPaymentInitiator` + pemindahan webhook ke Shared dengan router payable + `RsvpPaymentService` + `/payment/{hash}/status`. Belum ada pembeli yang bisa memilih Satutera untuk event. | Sedang — menyentuh jalur uang toko yang sudah produksi; dijaga uji regresi checkout toko |
| **9b** | Ekstraksi `SatuteraPanel.tsx` + pemakaian di kedua halaman pembayaran. Masih belum ada perubahan yang terlihat pembeli event. | Rendah–sedang — murni FE, tapi halaman toko harus diuji manual |
| **9c** | `RsvpController` cabang Satutera + pemilih channel & rincian fee di `Event/Show.tsx` + aktifkan konteks `event` untuk driver `satutera`. | **Tinggi** — alur uang baru di pendaftaran event |

Checklist per konvensi repo: `tasks/23-event-payment-satutera-progress.md`, dibuat sebelum baris
kode pertama.

---

## 7. Risiko

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Webhook Satutera menerima transaksi RSVP sebelum router payable mendarat | Pembeli membayar, RSVP tetap `pending` selamanya | 9a dirilis lebih dulu dan **wajib** selesai sebelum konteks `event` dinyalakan |
| Ekstraksi initiator mengubah perilaku checkout toko | Regresi di alur uang yang sudah jalan | Test karakterisasi atas payload `createPayment()` (termasuk `amount − payment_fee` dan Idempotency-Key) sebelum ekstraksi |
| Fee tertagih dua kali | Pembeli membayar lebih dari yang ditampilkan | Aturan `amount` tanpa fee hidup di satu tempat (D35) + pengecekan selisih nominal di webhook memakai `amount − payment_fee` |
| `rsvps.total_amount` ikut berubah arti | Laporan panitia & ekspor peserta jadi tidak konsisten dengan riwayat | D36 + test yang menegaskan `total_amount` tidak mengandung fee |
| Transaksi RSVP mengisi `payable_*` sementara pembaca lama pakai `rsvp_id` | Halaman/email event error null | D33 — isi dua-duanya, dan uji halaman `/payment/{hash}` untuk ketiga provider |
| Gateway dimatikan saat masih ada VA beredar | Pembayaran yang sedang berjalan tertolak | D39 — toggle hanya menyaring di titik pendaftaran; komentar di handler |
| `checkout_token` bocor | Orang lain bisa memantau room pembayaran | Sama seperti fase 4: token hanya dikirim ke halaman yang aksesnya dijaga `payment_hash` |
| Satutera tidak mengirim event socket untuk kedaluwarsa internal (guidance §6) | Halaman event nyangkut "pending" | Countdown lokal + polling `/payment/{hash}/status` — sudah jadi bagian panel bersama (D37) |
| Tidak ada gateway aktif untuk event berbayar | Form pendaftaran gagal saat submit tanpa penjelasan | Tolak lebih awal dengan pesan jelas di halaman event (aturan yang sudah ditulis di fase 7 §6c) |
| Dua agen/rilis menyentuh `RsvpController` bersamaan (fase 7b vs 9c) | Konflik merge di jalur pendaftaran | Urutan rilis dipaksa: 7b → (8c) → 9c |

---

## 8. Definition of Done

- [ ] `SatuteraPaymentInitiator` dipakai oleh checkout toko **dan** pendaftaran event; payload toko identik dengan sebelum ekstraksi (ditutup test).
- [ ] Webhook `POST /webhooks/satutera/payment` (URL & nama route tidak berubah) memproses `StoreOrder` dan `Rsvp`, idempoten, dan menolak selisih nominal.
- [ ] Pendaftaran event bisa memilih Satutera; VA/QRIS tampil di `/payment/{hash}` dengan status realtime dan polling fallback.
- [ ] `transactions.payment_fee` terisi untuk pembayaran event, `transactions.amount` = total pendaftaran + fee, `rsvps.total_amount` tidak mengandung fee.
- [ ] Callback `paid` menandai RSVP `paid`, memicu email konfirmasi, dan `event_packages.booked_count` bertambah sekali (lewat `RsvpObserver` yang sudah ada).
- [ ] Callback dikirim dua kali tidak menggandakan email, kuota, atau perubahan stok.
- [ ] Transfer manual muncul sebagai opsi pembayaran event berdasarkan pengaturan god-mode (hasil 7b), dengan daftar rekening dari `payment_manual_accounts`.
- [ ] Pendaftaran iPaymu dan manual berperilaku persis seperti sebelum rilis ini (uji regresi penuh).
- [ ] Halaman `/payment/{hash}` benar untuk ketiga provider; `/store/payment/{hash}` tidak berubah perilakunya setelah panel diekstrak.
- [ ] Mematikan Satutera di god-mode menghilangkan opsinya di halaman event, tapi transaksi yang sudah dibuat tetap bisa diselesaikan dan callback-nya tetap diproses.
- [ ] `pnpm build` lolos tanpa error TypeScript; tidak ada `any` di kode baru.
- [ ] `vendor/bin/pint --dirty` bersih; `php artisan test` tanpa regresi baru.

---

## 9. Di luar lingkup fase ini

- **Memindahkan pembayaran event dari iPaymu ke Satutera sepenuhnya.** Fase ini menambah opsi;
  mematikan iPaymu adalah keputusan operasional yang cukup dilakukan lewat toggle god-mode setelah
  Satutera terbukti stabil di produksi.
- **Konsolidasi `Pages/Payment/PaymentPage.tsx` + `Pages/Store/PaymentPage.tsx`** (README D8).
- **Donasi Baitul Maal masuk pipeline pembayaran yang sama** — belum masuk sama sekali hari ini.
- **Refund lewat API Satutera** dan rekonsiliasi otomatis mutasi bank.
- **Rekening/gateway per event atau per toko** — semua dana masih mendarat di akun komunitas (D30
  fase 8, §10 fase 7).
