# Fase 9 — Pembayaran Event lewat Satutera & Transfer Manual Terpusat

Ref: `docs/plan/mvp2/9-event-payment-satutera.md`

Scope split: fork mengerjakan 9a + 9b (semuanya kecuali cabang `RsvpController` dan channel-picker
di `Event/Show.tsx`, yang dikerjakan koordinator sebagai 9c setelah fork ini selesai — lihat §6
dokumen). `RsvpController.php` dan bagian form pendaftaran `Event/Show.tsx` TIDAK disentuh fork ini.

## 9a — Ekstraksi backend — SELESAI

- [x] `Shared/Services/SatuteraPaymentInitiator.php` (baru) — deskriptor generik + `idempotency_key` dari caller, savepoint pattern dipertahankan
- [x] `Store/Services/CheckoutService.php` — pakai initiator baru; diverifikasi via `Http::fake()` bahwa payload yang dikirim ke Satutera identik byte-per-byte dengan sebelum ekstraksi (termasuk `amount = total − fee`, format Idempotency-Key, redirect URLs, metadata)
- [x] `Shared/Controllers/SatuteraWebhookController.php` (pindah dari `Store/Controllers/`) — router per tipe payable (D34), route URL/nama tidak berubah (`POST /webhooks/satutera/payment`, `webhooks.satutera.payment`)
- [x] `Shared/Services/RsvpPaymentService.php` (baru) — `handle(Rsvp, status)`, idempoten, mapping status 'cancelled'→'failed' (rsvps.status enum tidak punya 'cancelled')
- [x] `Event/Controllers/PaymentPageController.php` — tambah `checkoutToken`/`expiresAt`/`satuteraWsUrl` ke props + method `status()` baru (`GET /payment/{hash}/status`), bentuk respons sama persis dengan versi toko

## 9b — Frontend bersama — SELESAI

- [x] `Components/Payment/SatuteraPanel.tsx` (baru) — ekstraksi VA/QRIS + copy-number + countdown + socket dari `Pages/Store/PaymentPage.tsx`. **Polling SENGAJA tidak diikutkan** — lihat catatan penyimpangan di bawah
- [x] `Pages/Store/PaymentPage.tsx` — pakai panel baru; polling tetap di level halaman (tidak berubah)
- [x] `Pages/Payment/PaymentPage.tsx` — tambah cabang `payment_provider === 'satutera'`; cabang manual/ipaymu JSX-nya tidak diubah, hanya sumber status diganti (lihat catatan di bawah)
- [x] `Shared/Controllers/PaymentChannelController.php` (pindah dari `Store/Controllers/`) — `/api/payment/channels` netral konteks baru, alias `/api/store/payment-channels` tetap jalan lewat handler yang sama
- [x] `config/payments.php` — `qris_only_below_amount` (D38) ditambahkan; `config/store.php` **sengaja tidak** melakukan cross-file `config()` forwarding (lihat catatan)

## Tidak disentuh (sengaja, milik 9c / koordinator)

- `RsvpController.php`
- Bagian form pendaftaran `Event/Show.tsx`
- `config('payments.drivers.satutera.contexts')` tetap `['store']` — diverifikasi lewat tinker
- Data migration `payment_gateways.contexts` untuk satutera tetap `['store']`

## Penyimpangan dari rencana awal (dengan alasan)

1. **Polling TIDAK diekstrak ke `SatuteraPanel`, tetap di level halaman.** Rencana awal menyebut
   "socket + countdown + polling" sebagai satu paket ekstraksi. Tapi polling di `Store/PaymentPage.tsx`
   ternyata dipakai BERSAMA oleh alur manual (dibangun Fase 7c) — bukan cuma satutera — karena
   approve/reject admin di god-mode mengubah status tanpa lewat socket sama sekali. Kalau polling
   ikut dipindah ke dalam panel yang hanya di-mount untuk satutera, alur manual akan **kehilangan**
   live-update-nya (regresi diam-diam). Jadi polling tetap di halaman, dipakai semua provider;
   `SatuteraPanel` cuma memegang mekanisme yang murni satutera-specific (countdown lokal + socket).
2. **`Pages/Payment/PaymentPage.tsx` sebelumnya sama sekali tidak punya state status di client**
   (semua statis dari prop `transaction.status`). Untuk memungkinkan `SatuteraPanel` melaporkan
   perubahan status realtime, saya perkenalkan `liveStatus` (state, mulai dari `transaction.status`)
   dan mengganti titik-titik yang tadinya membaca `transaction.status`/turunannya (`isPending`,
   `statusConfig[...]`, blok "Paid") supaya membaca `liveStatus`. Untuk transaksi manual/ipaymu,
   `liveStatus` tidak pernah berubah dari nilai awal (SatuteraPanel tidak pernah mount untuk mereka),
   jadi ini **no-op perilaku** untuk kedua provider itu — JSX di dalam blok manual/ipaymu sendiri
   sama sekali tidak diubah, cuma sumber boolean gate-nya. Tiga blok QRIS/VA/no-VA-yet iPaymu juga
   ditambah `&& !isSatutera` di kondisinya — **wajib**, karena tanpa itu blok iPaymu akan ikut
   render untuk transaksi satutera (keduanya sama-sama lolos `!isManual`).
3. **`config/store.php` TIDAK memanggil `config('payments.qris_only_below_amount')`** untuk
   "meneruskan" nilainya. Laravel tidak menjamin urutan pemuatan file config antar-environment/
   `config:cache` run, jadi cross-file `config()` call di level array-literal itu rapuh. Sebagai
   gantinya, kedua config membaca env var yang SAMA (`STORE_QRIS_ONLY_BELOW_AMOUNT`) secara
   independen — hasilnya identik, tanpa dependensi urutan muat. Dikonfirmasi lewat tinker: keduanya
   mengembalikan nilai yang sama.

## Verifikasi

- [x] Smoke test checkout toko satutera via tinker + `Http::fake()` — payload `createPayment()` dan
      write-back (`checkout_token`/`payment_detail`/`external_reference`/`expired_at`) identik
      dengan sebelum ekstraksi. Data uji dibersihkan.
- [x] `php -l` + `vendor/bin/pint` (file spesifik, bukan `--dirty`) — bersih
- [x] `pnpm build` + `tsc --noEmit` — bersih (SatuteraPanel jadi chunk terpisah, dipakai kedua halaman)
- [x] `php artisan test` — 1 kegagalan pre-existing tak terkait (sudah ada sebelum sesi ini), tidak ada regresi baru
- [x] Container resolution untuk semua service/controller baru/dipindah — OK
- [x] Route names & URL untuk webhook Satutera dan `/api/store/payment-channels` dikonfirmasi tidak berubah

## 9c (wiring) — Coordinator, setelah fork Fase 8 & 9 selesai — SELESAI

- [x] `RsvpController@store` — cabang `payment_provider === 'satutera'`: validasi `channel_provider`/`payment_method`/`payment_channel` (field baru, terpisah dari `payment_provider` yang tetap berarti "gateway" — lihat komentar di kode untuk alasan penamaan), `findChannel()`, cek `qris_only_below_amount` dari `config('payments.*')`, isi `payable_type`/`payable_id` **hanya** untuk satutera (D33) — manual/ipaymu sengaja tidak diisi supaya tidak menabrak asumsi `GodMode/Payments/Index.tsx` (fase 7c) yang menganggap `payable` terisi = order toko
- [x] `config/payments.php`: `drivers.satutera.contexts` → `['store', 'event']`
- [x] Migration data `2026_07_30_230430_enable_satutera_for_event_context.php` — `payment_gateways.contexts` untuk satutera dapat tambahan `'event'`, aditif (tidak menyentuh `is_enabled`/`credentials`), dijalankan setelah kode mendarat sesuai arahan dokumen
- [x] `EventController::show()` (publik) tambah prop `paymentGateways` (`PaymentSettingsService::gatewaysFor('event')`)
- [x] `Event/Show.tsx`: opsi radio "Pembayaran Otomatis via Satutera" (independen dari kill-switch iPaymu yang tetap `{false && ...}`) + channel picker QRIS/VA baru (fetch `/api/payment/channels`, tipe `SatuteraChannel` terpisah dari `PaymentChannel` iPaymu-shaped yang sudah mati) + kalkulasi `adminFee`/label biaya untuk satutera di `totals`
- [x] Smoke test terpadu (lihat detail di `tasks/22-event-product-integration-progress.md` §8c — satu rangkaian tes yang sama menutup fase 8 & 9 sekaligus): RSVP addon-tertaut + Satutera → transaksi `payable_type=Rsvp::class`, `amount = total+fee`, `payment_fee` terisi (D36); webhook `paid` via router baru → `RsvpPaymentService::handle()` terpanggil, RSVP `paid`; webhook `failed` → RSVP `failed`, reservasi dilepas; webhook dipanggil dua kali → idempoten (tidak dobel-proses, dikonfirmasi lewat `payment_webhook_events`)
- [x] Verifikasi kredensial: `verifyCallbackSignature()` teruji dengan HMAC nyata dari kredensial `.env` fallback (bukan hanya asersi kode)
