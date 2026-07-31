# Fase 7 — Pengaturan Pembayaran Global (dikelola admin)

Sumber kebutuhan: [`docs/human-notes/ecommerce-note.txt`](../../human-notes/ecommerce-note.txt) §"Idea Part 2"
poin 2.

> Sistem payment bisa kita set, saat ini kan kita pake payment dari satutera, buat admin bisa set
> untuk masukin payment gateway sendiri dan bisa atur pembayaran manual mulai dari toggle on-off,
> set nomor rekening pembayaran, dsb. Konsep payment atau setingan payment ini berlaku global baik
> itu untuk checkout store ataupun beli event.

Prasyarat: [Fase 4](./4-payment-satutera.md) selesai (sudah).

---

## 1. Review catatan — kondisi sekarang vs yang diminta

Note ini sebenarnya berisi **tiga permintaan berbeda** yang sering tercampur. Dipisah dulu:

1. **Kredensial gateway bisa diisi admin**, bukan hanya lewat `.env`.
2. **Transfer manual bisa dinyalakan/dimatikan** dan nomor rekeningnya bisa diatur admin.
3. **Pengaturannya berlaku global** — dipakai checkout toko maupun pembelian event.

### Kondisi kode hari ini

| Konteks | Provider yang bisa dipakai | Sumber kredensial | UI admin |
| --- | --- | --- | --- |
| Pendaftaran event | `manual` atau `ipaymu` — di-hardcode di `RsvpController` (`'required|in:manual,ipaymu'`) | `.env` → `config/services.php` | ❌ tidak ada |
| Checkout toko | `satutera` saja — di-hardcode di `CheckoutService::place()` | `.env` → `config/services.php` | ❌ tidak ada |
| Rekening transfer manual (event) | `Setting::get('bank_account_manual_transfer')` | **baris tabel `settings` yang harus diedit manual di database** | ❌ tidak ada |
| Baitul Maal / donasi | belum masuk pipeline pembayaran sama sekali | — | — |

Jadi yang diminta note bukan cuma fitur baru: ini juga **menutup lubang operasional yang sudah
ada**. Hari ini, mengganti nomor rekening transfer manual untuk event berarti seseorang harus
`UPDATE` tabel `settings` lewat psql. Itu sendiri sudah alasan cukup untuk mengerjakan fase ini.

### Yang perlu diluruskan dari note

| Kalimat di note | Tafsiran yang bisa dikerjakan |
| --- | --- |
| "masukin payment gateway sendiri" | Admin mengisi **kredensial** untuk driver yang sudah didukung kode (satutera, ipaymu, manual). Menambah gateway yang benar-benar baru tetap butuh kelas driver baru — tidak ada cara jujur mengelilingi itu, dan UI yang menjanjikan sebaliknya akan menyesatkan. |
| "berlaku global … store ataupun event" | Toggle-nya global, tapi **tidak semua driver bisa dipakai di semua konteks**: `ipaymu` terpasang di alur event (lewat `PaymentProviderInterface`), `satutera` terpasang di alur toko. Yang benar-benar baru lintas konteks adalah `manual`. Lihat D18. |
| "atur pembayaran manual" | Toggle + daftar rekening (banyak rekening, bisa diurutkan, bisa dinonaktifkan satuan) + instruksi tambahan. |

### Konsekuensi bisnis yang harus disadari sebelum mulai

Menyalakan transfer manual untuk **checkout toko** berarti uang pembeli masuk ke rekening komunitas
(rekening global), bukan ke rekening penjual. Ini sebenarnya konsisten dengan yang sudah berjalan —
dana Satutera pun mendarat di akun komunitas dan "payout ke pemilik toko" memang sudah tercatat
sebagai di luar lingkup MVP 2 ([5-fulfillment-and-admin.md](./5-fulfillment-and-admin.md) §8). Tapi
transfer manual membuat jeda itu terasa lebih panjang buat penjual: pesanan baru berubah `paid`
setelah **admin** memverifikasi bukti, bukan setelah callback otomatis. Konsekuensinya diakui
eksplisit di §6 (SLA verifikasi + notifikasi), bukan disembunyikan.

---

## 2. Keputusan desain

### D18 — Matriks (driver × konteks), bukan satu toggle datar

Tiap driver mendeklarasikan konteks yang **didukung kodenya** di `config/payments.php`; admin lalu
menyalakan/mematikan per konteks di dalam batas itu. Yang dipakai pembeli = irisan keduanya.

| Driver | Konteks yang didukung kode hari ini | Catatan |
| --- | --- | --- |
| `satutera` | `store` | `event` menyusul kalau alur event dipindah dari iPaymu (di luar lingkup, sudah tercatat di fase 5 §8) |
| `ipaymu` | `event` | Tetap dipertahankan; tidak ada alasan membongkar alur produksi yang jalan |
| `manual` | `store`, `event` | `store` adalah kemampuan **baru** dari fase ini |

UI god-mode menampilkan konteks yang tidak didukung sebagai kotak centang nonaktif dengan
keterangan — bukan disembunyikan, supaya admin paham peta kemampuannya.

### D19 — Tabel `payment_gateways`, bukan menambah key di tabel `settings`

Tabel `settings` (key → JSON) sudah ada dan dipakai `bank_account_manual_transfer`. Tetap dipakai
untuk hal-hal remeh, tapi **bukan** untuk ini: kredensial butuh enkripsi at-rest, butuh kolom yang
bisa di-query (`is_enabled`), butuh jejak "kapan terakhir diverifikasi", dan bentuknya harus
divalidasi. Semua itu jadi konvensi lisan kalau ditumpuk di satu blob JSON.

### D20 — Kredensial dari database menimpa `.env`, `.env` tetap jadi fallback

Urutan resolusi: baris `payment_gateways.credentials` → kalau kosong, `config('services.*')`. Efeknya:

- Deploy yang sudah ada terus jalan tanpa mengisi apa pun setelah migrate.
- Migrasi bisa bertahap, gateway per gateway.
- Lingkungan lokal/CI cukup pakai `.env` seperti biasa.

Konsekuensi teknis: `IPaymuService` dan `SatuteraPaymentService` sekarang membaca
`config('services.*')` **di constructor**. Keduanya harus diubah agar membaca kredensial secara
lazy (saat method dipanggil) lewat `PaymentSettingsService`, supaya perubahan setting oleh admin
langsung berlaku dan tidak terkunci di instance yang sudah terlanjur dibuat container.

### D21 — Transfer manual jadi driver ketiga, bukan cabang khusus

`transactions.payment_provider` sudah menyimpan `'manual' | 'ipaymu' | 'satutera'`, dan
`Transaction::isManual()` sudah ada. Jadi `payment_gateways.code` = nilai `payment_provider` yang
sama persis — tidak ada kolom baru di `transactions`, tidak ada pemetaan yang perlu dihafal.

### D22 — `/god-mode/payments` harus jadi sadar-polymorphic sebelum manual dibuka untuk toko

Query di `GodMode\PaymentController` sekarang:

```php
->where('payment_provider', 'manual')
->whereNotNull('rsvp_id')        // penjagaan sementara yang dipasang di fase 5
```

Penjagaan `whereNotNull('rsvp_id')` itu memang dipasang untuk saat ini. Begitu order toko bisa
memakai transfer manual, penjagaan itu berubah dari pelindung jadi **bug**: transaksi toko yang
menunggu verifikasi tidak akan pernah muncul di halaman admin, dan pembeli menunggu selamanya. Jadi
langkah 7c wajib merombak halaman itu — bukan opsional, dan bukan "nanti saja".

### D23 — Gateway tidak boleh dinyalakan sebelum tes koneksi berhasil

Salah ketik kredensial = seluruh checkout gagal untuk semua orang sekaligus. Tombol "Tes koneksi"
memanggil endpoint ringan milik provider, dan `is_enabled` hanya bisa disetel `true` kalau
`last_verified_at` terisi setelah perubahan kredensial terakhir. Murah dipasang, mahal kalau tidak.

---

## 3. Skema database

```php
// database/migrations/xxxx_create_payment_gateways_table.php
Schema::create('payment_gateways', function (Blueprint $table) {
    $table->id();
    $table->string('code')->unique();               // satutera | ipaymu | manual
    $table->string('label');                        // teks yang dibaca pembeli, mis. "Transfer Bank"
    $table->text('description')->nullable();        // instruksi singkat di halaman checkout
    $table->boolean('is_enabled')->default(false);
    $table->json('contexts')->nullable();           // ["store","event"] — dipilih admin
    $table->json('credentials')->nullable();        // cast encrypted:array — TIDAK PERNAH ke klien
    $table->json('options')->nullable();            // sandbox flag, batas nominal, dll.
    $table->timestamp('last_verified_at')->nullable();
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
});
```

```php
// database/migrations/xxxx_create_payment_manual_accounts_table.php
Schema::create('payment_manual_accounts', function (Blueprint $table) {
    $table->id();
    $table->string('bank_name');
    $table->string('account_number');
    $table->string('account_holder');
    $table->string('branch')->nullable();
    $table->text('instructions')->nullable();
    $table->boolean('is_active')->default(true);
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
});
```

Plus migration trigger delete-tracking untuk kedua tabel, dan registrasi
`PaymentGateway::observe(DeletedItemObserver::class)` +
`PaymentManualAccount::observe(...)` di `AppServiceProvider` — riwayat perubahan kredensial
pembayaran justru yang paling perlu diaudit.

### Migrasi data

Satu migration data (bukan seeder — harus jalan di produksi sekali):

1. Baca `Setting::get('bank_account_manual_transfer', [])`, tulis tiap entri ke
   `payment_manual_accounts`. Key lama **tidak dihapus** di rilis ini; ditandai usang dan dibuang di
   rilis berikutnya setelah terbukti tidak ada yang membacanya lagi.
2. Buat tiga baris `payment_gateways` (`satutera`, `ipaymu`, `manual`) dengan `credentials = null`
   (artinya: pakai `.env`), `contexts` sesuai perilaku hari ini, dan `is_enabled` mencerminkan
   kondisi produksi saat ini — **bukan** `false` semua, karena itu akan mematikan pembayaran begitu
   migration jalan.

> Ini bagian paling berbahaya di seluruh fase. Tulis test yang menjalankan migration di atas
> snapshot data lama dan memastikan `enabledCodesFor('event')` menghasilkan `['manual','ipaymu']`
> persis seperti sebelum migrate.

---

## 4. Backend

### Model & config

```
app/Models/PaymentGateway.php          casts: ['credentials' => 'encrypted:array', 'contexts' => 'array',
                                              'options' => 'array', 'is_enabled' => 'boolean',
                                              'last_verified_at' => 'datetime']
app/Models/PaymentManualAccount.php
```

`config/payments.php` — registri driver (kode, bukan data):

```php
return [
    'drivers' => [
        'satutera' => [
            'label' => 'Satutera',
            'contexts' => ['store'],
            'credential_fields' => ['client_id', 'client_secret', 'api_key', 'webhook_secret'],
            'env_fallback' => 'services.satutera',
            'requires_channel' => true,   // pembeli harus memilih channel VA/QRIS
        ],
        'ipaymu' => [
            'label' => 'iPaymu',
            'contexts' => ['event'],
            'credential_fields' => ['va', 'api_key'],
            'env_fallback' => 'services.ipaymu',
            'requires_channel' => true,
        ],
        'manual' => [
            'label' => 'Transfer Manual',
            'contexts' => ['store', 'event'],
            'credential_fields' => [],
            'env_fallback' => null,
            'requires_channel' => false,
        ],
    ],
];
```

### `app/Domains/Shared/Services/PaymentSettingsService.php`

```php
public function gatewaysFor(string $context): array;   // deskriptor publik, tanpa kredensial
public function enabledCodesFor(string $context): array;
public function isEnabled(string $code, string $context): bool;
public function credentials(string $code): array;      // DB → fallback .env (D20)
public function manualAccounts(): array;               // is_active, terurut
public function flush(): void;                         // dipanggil setelah tiap perubahan admin
```

- Semua pembacaan lewat `Cache::remember` dengan key berversi (`payments:settings:v1:*`) dan
  dibuang eksplisit di `flush()`. Jangan mengandalkan TTL saja — admin yang mengubah setting harus
  melihat efeknya seketika.
- `credentials()` menangkap `DecryptException` dan melempar exception domain yang bisa dibaca
  ("kredensial gateway perlu diisi ulang"), bukan 500 telanjang. Ini terjadi kalau `APP_KEY` pernah
  dirotasi.
- Deskriptor publik yang boleh keluar: `code`, `label`, `description`, `requires_channel`. Tidak
  ada yang lain.

### Perubahan pada service yang sudah ada

`IPaymuService` dan `SatuteraPaymentService`: pindahkan pembacaan kredensial dari constructor ke
method privat `credentials()` yang memanggil `PaymentSettingsService`. Perilaku default tidak
berubah (fallback `.env`), jadi test yang ada harus tetap hijau tanpa diubah — itu ukuran bahwa
refactor-nya benar.

---

## 5. God-mode: halaman pengaturan

Route (di dalam grup `god-mode.auth`):

```php
Route::get('/settings/payments', [PaymentSettingController::class, 'index'])->name('settings.payments.index');
Route::put('/settings/payments/{code}', [PaymentSettingController::class, 'update'])->name('settings.payments.update');
Route::post('/settings/payments/{code}/test', [PaymentSettingController::class, 'test'])->name('settings.payments.test');

Route::post('/settings/payments/manual-accounts', [ManualAccountController::class, 'store'])->name('settings.manual-accounts.store');
Route::put('/settings/payments/manual-accounts/{id}', [ManualAccountController::class, 'update'])->name('settings.manual-accounts.update');
Route::delete('/settings/payments/manual-accounts/{id}', [ManualAccountController::class, 'destroy'])->name('settings.manual-accounts.destroy');
```

Halaman `Pages/GodMode/Settings/Payments.tsx`, menu baru di `GodModeLayout.tsx`:

```ts
{ href: "/god-mode/settings/payments", label: "Payment Settings", icon: "credit_card" },
```

Isi halaman:

1. **Kartu per gateway** — toggle aktif, label & deskripsi yang dilihat pembeli, kotak centang
   konteks (`store` / `event`, yang tidak didukung tampil nonaktif), form kredensial, tombol "Tes
   koneksi", dan waktu verifikasi terakhir.
2. **Bagian transfer manual** — daftar rekening (bank, nomor, atas nama, cabang, instruksi), tambah/
   ubah/hapus, urutan tampil, aktif/nonaktif per rekening.
3. **Ringkasan** di atas: "Checkout toko: Satutera, Transfer Manual · Event: iPaymu, Transfer
   Manual" — supaya efek pengaturan langsung terbaca tanpa menafsirkan matriks.

Aturan penanganan kredensial di UI:

- Nilai tersimpan **tidak pernah** dikirim ke klien. Field yang sudah terisi ditampilkan sebagai
  placeholder `••••••1234` (empat karakter terakhir saja untuk identifikasi) dan **field kosong saat
  submit berarti "jangan ubah"** — bukan "kosongkan".
- Setiap perubahan menulis `AdminActivityLog` (`update_payment_gateway:{code}`,
  `toggle_payment_gateway:{code}:{on|off}`, `create_manual_account:{id}`, …). Yang dicatat adalah
  *field mana* yang berubah, bukan nilainya.
- Endpoint tes dibatasi rate limit (mis. 10/menit per admin) — ia memanggil pihak ketiga.

---

## 6. Perubahan alur pembeli

### 6a. Checkout toko menerima transfer manual

`CheckoutController::store()`:

```php
'payment_gateway' => ['required', Rule::in($settings->enabledCodesFor('store'))],
// channel hanya wajib untuk driver yang requires_channel
'payment_provider' => 'required_if:payment_gateway,satutera|string|max:30',
'payment_method'   => 'required_if:payment_gateway,satutera|string|max:20',
'payment_channel'  => 'required_if:payment_gateway,satutera|string|max:30',
```

`CheckoutService::place()` bercabang setelah total dihitung:

| | Satutera (sekarang) | Manual (baru) |
| --- | --- | --- |
| `payment_fee` | dari channel | `0` |
| Panggilan provider | `createPayment()` | tidak ada |
| `transactions.payment_provider` | `satutera` | `manual` |
| Status order | `pending_payment` | `pending_payment` |
| Halaman berikutnya | `/store/payment/{hash}` (VA/QRIS + socket) | `/store/payment/{hash}` (rekening + unggah bukti) |

Semua perhitungan uang tetap di server, pengurangan stok dan `expires_at` tidak berubah — cabang
manual hanya melewati bagian pemanggilan provider.

`StorePaymentPageController` sekarang memfilter `->where('payment_provider', 'satutera')` di
`show()` dan `status()`. Filter itu harus dilonggarkan, lalu halaman merender dua mode berdasarkan
`transaction.payment_provider`. Route baru untuk unggah bukti (pola `Event\PaymentProofController`,
`payment_proofs` sudah ber-FK ke `transactions` jadi tidak perlu perubahan skema):

```php
Route::post('/store/payment/{hash}/proof', [StorePaymentProofController::class, 'store'])
    ->name('store.payment.proof.store');
```

**Interaksi dengan `store:expire-orders`:** order manual yang buktinya sudah diunggah dan belum
direview **tidak boleh** dianggap kedaluwarsa — kalau tidak, pembeli yang sudah transfer akan
kehilangan pesanannya sementara admin belum sempat memverifikasi. Command harus mengecualikan
transaksi `pending` yang punya `payment_proof` belum direview. Ini bagian yang paling mudah
terlewat; masukkan sebagai test, bukan sebagai catatan.

### 6b. Verifikasi admin memicu fulfillment

`GodMode\PaymentController::approve()` sekarang hanya tahu `Rsvp`. Setelah dirombak (D22):

```php
match (true) {
    $transaction->rsvp !== null            => /* alur event lama, tidak disentuh */,
    $transaction->payable instanceof StoreOrder => app(OrderFulfillmentService::class)->onPaid($transaction->payable),
};
```

`onPaid()` sudah idempoten karena dipakai callback Satutera — jalur manual masuk ke pintu yang sama,
di dalam `DB::transaction()` dengan `lockForUpdate()`. Jangan membuat jalur fulfillment kedua.

Penolakan bukti: transaksi jadi `failed`, tapi order **kembali** ke `pending_payment` dengan
`expires_at` diperpanjang, supaya pembeli bisa mengunggah ulang. Membatalkan order langsung
menghukum pembeli untuk kesalahan yang biasanya cuma salah unggah berkas.

Notifikasi tambahan (queued, pola `app/Jobs/Send*Email.php`): bukti diunggah → Telegram admin;
bukti disetujui/ditolak → email pembeli; order toko lunas → pengelola toko (sudah ada dari fase 5).

### 6c. Event memakai pengaturan yang sama

- `RsvpController`: `'payment_provider' => ['required', Rule::in($settings->enabledCodesFor('event'))]`
  menggantikan `'required|in:manual,ipaymu'`.
- Halaman event menerima daftar gateway aktif sebagai prop Inertia (kecil dan terbatas — aman).
- Semua pembaca `Setting::get('bank_account_manual_transfer')` dialihkan ke
  `PaymentSettingsService::manualAccounts()`: `Event\PaymentPageController`, `Event\PaymentController`,
  `GodMode\EmailTesterController`, `app/Mail/EventRegistrationPendingPayment.php`,
  `app/Jobs/SendEventRegistrationPendingPaymentEmail.php`.
- Kalau **tidak ada** gateway aktif untuk event berbayar, tolak dengan pesan jelas dan tampilkan
  peringatan di halaman event — jangan diam-diam menampilkan form yang pasti gagal saat submit.

---

## 7. Urutan pengerjaan

Dipecah tiga langkah yang masing-masing bisa dirilis sendiri:

| Langkah | Isi | Risiko rilis |
| --- | --- | --- |
| **7a** | Tabel + model + `PaymentSettingsService` + halaman god-mode + migrasi data. Alur pembeli **belum** diubah sama sekali; service lama masih membaca `.env` lewat fallback. | Rendah — murni aditif |
| **7b** | Konteks event pindah ke pengaturan: validasi dinamis di `RsvpController`, rekening manual dibaca dari tabel baru. | Sedang — menyentuh alur produksi; butuh uji regresi RSVP |
| **7c** | Transfer manual untuk checkout toko + rombak `/god-mode/payments` jadi polymorphic + pengecualian expiry. | Tinggi — alur uang baru |

Checklist per konvensi repo: `tasks/21-payment-settings-progress.md` (dan
`tasks/20-store-badges-progress.md` untuk Fase 6), dibuat sebelum baris kode pertama.

---

## 8. Risiko

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Migrasi data menyetel `is_enabled = false` | Semua pembayaran mati begitu deploy | Migration menyalin kondisi produksi saat ini; ditutup test yang membandingkan hasil sebelum/sesudah |
| Kredensial salah ketik | Checkout gagal untuk semua orang | Tes koneksi wajib sebelum bisa diaktifkan (D23) + `last_verified_at` |
| Gateway dimatikan saat masih ada transaksi berjalan | Pembeli yang sudah dapat VA tidak bisa menyelesaikan pembayaran / callback ditolak | **Webhook dan halaman pembayaran tidak boleh memeriksa toggle** — toggle hanya menyaring pilihan di titik checkout. Tulis ini sebagai komentar di handler webhook, bukan cuma di dokumen |
| `APP_KEY` dirotasi | `credentials` gagal didekripsi, 500 di halaman admin | Tangkap `DecryptException` → pesan "isi ulang kredensial"; catat di `DEPLOYMENT.md` |
| Kredensial bocor ke payload Inertia | Kompromi akun payment gateway | Deskriptor publik dibatasi 4 field (§4); tambahkan test yang menegaskan respons `/god-mode/settings/payments` tidak memuat nilai kredensial |
| `whereNotNull('rsvp_id')` tertinggal saat manual dibuka untuk toko | Pesanan toko menunggu verifikasi selamanya, tanpa error apa pun | D22 — jadikan bagian wajib langkah 7c, dengan test |
| Order manual kedaluwarsa padahal bukti sudah diunggah | Pembeli sudah transfer tapi stok dilepas dan order hangus | Pengecualian di `store:expire-orders` + test |
| Verifikasi manual lambat | Penjual mengira sistem rusak | Tampilkan status "menunggu verifikasi admin" di halaman pesanan penjual & pembeli; notifikasi Telegram saat bukti masuk |

---

## 9. Definition of Done

- [ ] Migration + trigger delete-tracking untuk `payment_gateways` & `payment_manual_accounts`; observer terdaftar di `AppServiceProvider`.
- [ ] Migrasi data memindahkan `bank_account_manual_transfer` tanpa kehilangan satu rekening pun, dan menghasilkan gateway aktif yang identik dengan perilaku sebelum migrate (ditutup test).
- [ ] Admin bisa menyalakan/mematikan tiap gateway per konteks dari god-mode, dan efeknya terasa di permintaan berikutnya (cache dibuang, bukan menunggu TTL).
- [ ] Admin bisa menambah/mengubah/menghapus/mengurutkan rekening transfer manual dari god-mode — tanpa menyentuh database.
- [ ] Kredensial tersimpan terenkripsi; nilainya **tidak pernah** muncul di payload Inertia, log, atau `AdminActivityLog` (ditutup test).
- [ ] Field kredensial kosong saat submit tidak menghapus nilai yang tersimpan.
- [ ] Gateway tidak bisa diaktifkan tanpa tes koneksi berhasil.
- [ ] Checkout toko dengan transfer manual menghasilkan order `pending_payment`, stok terkunci, tanpa `payment_fee`, dan mengarah ke halaman rekening + unggah bukti.
- [ ] Persetujuan admin atas bukti order toko menjalankan `OrderFulfillmentService::onPaid()` — jalur yang sama dengan callback Satutera; dijalankan dua kali tidak menggandakan fulfillment.
- [ ] Penolakan bukti mengembalikan order ke `pending_payment` dengan tenggat baru, bukan membatalkannya.
- [ ] `/god-mode/payments` menampilkan transaksi manual event **dan** toko, masing-masing dengan konteks yang benar, tanpa error `rsvp` null.
- [ ] `store:expire-orders` tidak menghanguskan order yang buktinya menunggu review.
- [ ] Pendaftaran event lama (manual & iPaymu) tetap berjalan persis seperti sebelumnya — uji regresi penuh sebelum rilis 7b.
- [ ] Webhook Satutera & iPaymu tetap memproses transaksi lama meski gateway-nya sudah dimatikan admin.
- [ ] `pnpm build` lolos tanpa error TypeScript; tidak ada `any` di kode baru.

---

## 10. Di luar lingkup fase ini

- Memindahkan pembayaran event dari iPaymu ke Satutera (sudah tercatat di fase 5 §8).
- Rekening/gateway **per toko** — sekarang semua dana mendarat di akun komunitas. Ini keputusan
  produk, bukan sekadar pekerjaan teknis; berpasangan dengan payout & pembagian komisi di MVP 2.1.
- Memasukkan donasi Baitul Maal ke pipeline pembayaran yang sama (hari ini belum masuk sama sekali).
- Driver gateway baru (Midtrans/Xendit/dll.) — arsitekturnya sudah siap menerima, tapi tetap butuh
  kelas driver + implementasi kontrak.
- Rekonsiliasi otomatis mutasi rekening bank (mencocokkan transfer masuk tanpa unggah bukti).
