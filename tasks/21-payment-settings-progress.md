# Fase 7 — Pengaturan Pembayaran Global

Ref: `docs/plan/mvp2/7-payment-settings.md`

Dipecah 3 sub-rilis sesuai plan (§7): 7a aditif murni → 7b alur event → 7c transfer manual toko.

## 7a — Fondasi (aditif, aman) — SELESAI

- [x] Migration `payment_gateways`
- [x] Migration `payment_manual_accounts`
- [x] Migration trigger delete-tracking untuk kedua tabel
- [x] Migration data: seed 3 gateway (satutera/ipaymu/manual) mencerminkan perilaku produksi saat ini + migrasi `bank_account_manual_transfer` ke `payment_manual_accounts` — diverifikasi identik dengan perilaku sebelum migrate
- [x] Config `config/payments.php` (registri driver)
- [x] Model `PaymentGateway` (credentials terenkripsi via `encrypted:array`)
- [x] Model `PaymentManualAccount`
- [x] Registrasi observer `DeletedItemObserver`
- [x] Service `PaymentSettingsService` (cache array biasa — **bukan** cache model Eloquent, lihat catatan bug di bawah — fallback ke `.env`)
- [x] Refactor `IPaymuService` & `SatuteraPaymentService` — kredensial dibaca lazy lewat `PaymentSettingsService`, bukan di constructor
- [x] Controller `GodMode\PaymentSettingController` (index/update/test) + manual accounts CRUD
- [x] Route god-mode `/god-mode/settings/payments`
- [x] Halaman `Pages/GodMode/Settings/Payments.tsx` + menu sidebar
- [x] D23 (tidak bisa aktif tanpa tes koneksi) — diimplementasi & diverifikasi via tinker: ubah kredensial mereset `last_verified_at`, `is_enabled=true` ditolak sampai tes berhasil
- [x] Smoke test tinker: baca default (fallback .env), simpan kredensial DB, verifikasi override, kosongkan field = tidak menghapus nilai, toggle per-konteks langsung berlaku setelah `flush()`

**Bug pra-eksisting yang ditemukan & diperbaiki saat mengerjakan 7a (di luar lingkup asli, tapi berkaitan langsung):**
- `App\Contracts\PaymentProviderInterface` **tidak pernah di-bind** ke `IPaymuService` di provider manapun — `app(PaymentProviderInterface::class)` di `Event\PaymentController::ipaymuWebhook()` (endpoint webhook iPaymu produksi) selalu melempar `BindingResolutionException`. Dikonfirmasi rusak di kode sebelum perubahan ini (`git stash` lalu tes di tinker). Diperbaiki dengan menambah `$this->app->bind(PaymentProviderInterface::class, IPaymuService::class)` di `AppServiceProvider::register()`.
- Cache driver `database` di environment ini tidak bisa me-roundtrip koleksi model Eloquent (`Cache::remember` mengembalikan `__PHP_Incomplete_Class` pada cache-hit kedua) — bukan cuma untuk `PaymentGateway`, dites juga dengan `Admin::all()` dan gagal sama. `PaymentSettingsService` didesain ulang supaya hanya meng-cache array biasa (bukan model), dan kredensial (`storedCredentials()`) sengaja **tidak pernah** di-cache sama sekali — query langsung ke DB tiap kali, karena jarang dipanggil dan supaya secret tidak pernah duduk di tabel cache.

## 7b — Alur Event — SELESAI

- [x] `RsvpController`: validasi `payment_provider` dinamis via `enabledCodesFor('event')` (`Rule::in()`), plus penjagaan pesan jelas kalau tidak ada gateway aktif sama sekali
- [x] `Event\PaymentPageController`, `Event\PaymentController`, `GodMode\EmailTesterController`, `Mail\EventRegistrationPendingPayment`, `Jobs\SendEventRegistrationPendingPaymentEmail` — semua baca rekening manual lewat `PaymentSettingsService::manualAccounts()`; `Setting::get('bank_account_manual_transfer')` sudah tidak dipakai sama sekali di kode (diverifikasi via grep)
- [x] Field `bank` → `bank_name` disamakan di seluruh konsumen (blade `event-registration-payment.blade.php`, `Payment/PaymentPage.tsx`, `Payment/Show.tsx`) mengikuti kolom asli tabel `payment_manual_accounts`
- [x] `Event/Show.tsx` — opsi "Transfer Manual" disembunyikan kalau admin mematikannya untuk konteks event, dengan pesan jelas kalau tidak ada metode aktif sama sekali
- [x] Uji regresi: validasi `Rule::in()` diverifikasi menerima `manual`/`ipaymu` (kondisi produksi saat ini) dan menolak kode lain; semua controller yang disentuh resolve tanpa error lewat container; `php artisan test` & `pnpm build` tetap bersih

**Catatan penting (bukan bug, keputusan sadar):** opsi "Pembayaran Otomatis (iPaymu)" di `Event/Show.tsx` sudah dinonaktifkan sebelum Fase 7 lewat kill-switch `{false && (...)}` yang eksplisit di kode (independen dari pengaturan admin). Toggle iPaymu di god-mode Payment Settings sekarang memengaruhi validasi **backend**, tapi **tidak** menyalakan kembali opsi ini di form pendaftaran — form tetap hanya menawarkan Transfer Manual. Menghidupkan kembali UI iPaymu adalah keputusan produk terpisah, sengaja tidak dilakukan diam-diam di fase ini.

## 7c — Transfer Manual untuk Toko — SELESAI

- [x] `CheckoutController` + `CheckoutService`: dukung `payment_gateway=manual` (fee 0, tanpa panggilan Satutera); validasi gateway diverifikasi ulang di service (never trust client), bukan cuma di controller
- [x] `StorePaymentPageController`: filter `payment_provider=satutera` diperluas jadi `whereIn(['satutera','manual'])`, render mode manual dengan `manualAccounts` prop
- [x] Controller baru `StorePaymentProofController@store` + route `POST /store/payment/{hash}/proof` — pola sama dengan `Event\PaymentProofController`, model `PaymentProof` dipakai ulang (tabel sudah generik, FK ke `transactions`)
- [x] `Pages/Store/PaymentPage.tsx`: cabang UI manual (rekening + form unggah bukti, komponen `ManualPaymentBlock`) vs satutera (sudah ada, tidak diubah)
- [x] `Pages/Store/Checkout.tsx`: pemilihan gateway (satutera/manual) sebelum memilih channel; kalau cuma 1 gateway aktif, auto-pilih tanpa selector redundan (kondisi default hari ini: cuma satutera, sama seperti sebelum fase ini)
- [x] `GodMode\PaymentController` dirombak jadi polymorphic: `whereNotNull('rsvp_id')` dicabut, approve/reject memanggil `OrderFulfillmentService::onPaid()` untuk order toko (jalur sama dengan webhook Satutera), tetap alur lama utuh untuk RSVP
- [x] `Pages/GodMode/Payments/Index.tsx` dirombak polymorphic: kolom "Event / Toko" menampilkan order number + nama toko untuk order toko
- [x] `store:expire-orders`: `whereDoesntHave` mengecualikan order dengan transaksi manual `pending` yang proof-nya belum direview
- [x] Smoke test end-to-end via tinker (lihat detail di bawah) — semua skenario lulus, data uji sudah dibersihkan dari database dev

**Bug pra-eksisting tambahan yang ditemukan & diperbaiki saat mengerjakan 7c:**
- `GodMode\PaymentController::downloadProof()` membaca dari disk `'local'`, padahal semua upload bukti (event maupun toko) disimpan di disk `'public'` — tombol "Lihat Bukti" di `/god-mode/payments` pasti 404 di produksi sebelum perbaikan ini. Dikonfirmasi dengan membandingkan kode upload vs download, dan `config/filesystems.php` (root disk berbeda: `storage/app/private` vs `storage/app/public`).
- `resources/js/Pages/GodMode/Payments/Index.tsx` membaca `tx.rsvp?.user` untuk kolom "Peserta", padahal controller cuma eager-load `rsvp.event` (bukan `rsvp.user`) — kolom nama/email peserta pasti selalu kosong ("—") di produksi. Diperbaiki dengan memakai `tx.user` (relasi langsung di transaksi, sudah di-eager-load) dan menambahkan field `user?: User` ke tipe `Transaction`.
- `TelegramWebhookController::handleApprove()`/`handleReject()` (command bot `approve <id>`/`reject <id> <alasan>`) memfilter transaksi cuma dari `payment_provider='manual'` tanpa peduli RSVP atau order toko, tapi fulfillment-nya cuma menangani RSVP — begitu transfer manual dibuka untuk toko, admin yang approve lewat Telegram akan menandai transaksi & order `paid` tanpa pernah memicu `OrderFulfillmentService::onPaid()` (stok tidak terkonfirmasi, produk digital tidak terkirim, order macet selamanya di `pending_payment`... eh, macet di status lama karena transaksi sudah `paid` tapi order belum). Diperbaiki dengan cabang polymorphic yang sama seperti god-mode web UI, plus `TelegramService::notifyPaymentProof()` diperluas menampilkan info order/toko alih-alih "N/A" untuk order toko.

**Smoke test yang dijalankan (semua via tinker, data dibersihkan setelahnya):**
1. `CheckoutService::place()` dengan `payment_gateway=manual` + metode pickup → order `pending_payment`, `payment_fee=0`, transaksi `payment_provider=manual`, `checkout_token=null` (tidak ada panggilan ke Satutera).
2. `StorePaymentPageController::show()`/`status()` untuk transaksi manual — render tanpa error.
3. `StorePaymentProofController::store()` dengan file dummy — proof tersimpan, Telegram notify tidak crash (bot token kosong di dev, log warning saja).
4. `GodMode\PaymentController::approve()` — order & transaksi jadi `paid`, `OrderFulfillmentService::onPaid()` terpanggil (dikonfirmasi lewat job `SendStoreOrderPaidEmail`/`SendStoreNewOrderEmail` masuk antrean).
5. `GodMode\PaymentController::reject()` (order kedua) — transaksi kembali `pending`, order tetap `pending_payment` dengan `expires_at` diperpanjang, `review_note` tersimpan di proof.
6. `store:expire-orders` — order dengan proof belum direview **tidak** ikut expired; order tanpa proof di waktu yang sama tetap expired normal (regresi aman).
7. Kredensial tidak bocor ke payload Inertia — hanya `credential_previews` (masked, 4 karakter terakhir) yang terkirim, dikonfirmasi lewat request nyata ke `PaymentSettingController::index()`.

## Verifikasi akhir

- [x] `php artisan test` tanpa regresi baru (1 kegagalan pre-existing tak terkait, sudah ada sebelum Fase 7)
- [x] `pnpm build` + `tsc --noEmit` bersih di setiap tahap (7a/7b/7c)
- [x] `vendor/bin/pint --dirty` bersih (passed, tidak ada perubahan gaya tersisa)
- [x] Kredensial tidak pernah muncul di payload Inertia — diverifikasi lewat request nyata ke `/god-mode/settings/payments`, cuma `credential_previews` masked yang terkirim
