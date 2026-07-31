# Fase 6 — Badge Toko (dikelola admin)

Sumber kebutuhan: [`docs/human-notes/ecommerce-note.txt`](../../human-notes/ecommerce-note.txt) §"Idea Part 2"
poin 1.

> Untuk store kita ada tambahan badge "Official", "Top Seller", "Trusted" dan mungkin ada tambahan
> badge lainnya. Untuk mengatur badge tersebut hanya admin yg bisa melalui god-mode.

Prasyarat: [Fase 1](./1-store-foundation.md) (tabel `stores` + panel god-mode toko) sudah jalan —
dan memang sudah, jadi fase ini bisa dikerjakan kapan saja, independen dari Fase 7.

---

## 1. Review catatan — yang jelas, yang perlu diputuskan

| Poin di note | Status | Keputusan |
| --- | --- | --- |
| Tiga badge awal: Official, Top Seller, Trusted | Jelas | Diseed sebagai data, bukan enum di kode |
| "mungkin ada tambahan badge lainnya" | Jelas | Katalog badge jadi tabel yang bisa ditambah admin **tanpa migration** |
| Hanya admin yang boleh mengatur | Jelas | Route di bawah `god-mode.auth`, tidak ada endpoint untuk pemilik toko |
| Satu toko boleh berapa badge? | Tidak disebut | Boleh banyak; unik per (toko, badge) |
| Badge kedaluwarsa? | Tidak disebut | `expires_at` nullable — "Top Seller" biasanya musiman; kalau null artinya permanen |
| "Top Seller" dihitung otomatis? | Tidak disebut | **Tidak** di fase ini. Note bilang hanya admin yang mengatur; skema sudah siap untuk otomatisasi nanti (`assigned_by` nullable) |

### Catatan penting: badge ≠ status verifikasi

`stores.verified_at` / `stores.status = approved` sudah ada dari Fase 1 dan artinya "pengajuan toko
disetujui admin" — itu **syarat toko bisa tampil sama sekali**, bukan penanda pemasaran. Badge
"Official" adalah lapisan lain di atasnya. Jangan gabungkan keduanya, dan jangan menampilkan
"Official" hanya karena `verified_at` terisi — semua toko yang tampil pasti terverifikasi.

---

## 2. Keputusan desain

### D15 — Katalog badge sebagai tabel, bukan enum atau kolom JSON di `stores`

Tiga alternatif yang dipertimbangkan:

| Opsi | Kenapa ditolak / dipilih |
| --- | --- |
| `enum` di kolom `stores.badge` | Satu toko cuma bisa punya satu badge, dan menambah badge = migration. Ditolak. |
| Kolom `stores.badges` bertipe JSON array | Bisa banyak badge, tapi tidak ada tempat menyimpan siapa yang memberi, kapan, sampai kapan; juga tidak bisa di-query/di-filter dengan enak. Ditolak. |
| **Tabel katalog `store_badges` + pivot `store_badge_assignments`** | Admin bisa menambah jenis badge lewat UI, tiap pemberian terekam (admin, waktu, alasan, masa berlaku), dan filter "semua toko ber-badge X" jadi query biasa. **Dipilih.** |

### D16 — Warna badge dibatasi ke token tema, bukan hex bebas

Admin memilih warna dari daftar tetap yang dipetakan ke token yang **benar-benar ada** di
`resources/css/app.css` — repo ini cuma mendefinisikan `primary`, `secondary`, `tertiary`, `error`,
dan surface/neutral (tidak ada `success`/`warning` M3 terpisah, beda dari asumsi awal). Jadi lima
pilihan warnanya: `primary`, `secondary`, `tertiary`, `error`, `neutral`. Alasannya: input hex bebas
akan cepat merusak koherensi visual dan hampir pasti pecah di salah satu mode terang/gelap. Ikon
pun dibatasi ke nama Material Symbols (repo tidak memakai icon library) dan divalidasi terhadap
allowlist kecil di `config/store.php`, supaya typo tidak menghasilkan ikon kosong di produksi.

Panel god-mode (`GodModeLayout` + turunannya) memakai tema gelap tersendiri (`#161b22`/`#0f1117` +
aksen emerald/amber/red), bukan token M3 di atas — itu dipetakan terpisah di komponen chip badge
versi admin, dengan padanan yang sudah dipakai pola status di sana (`primary`→emerald,
`tertiary`→amber, `error`→red, `neutral`→putih transparan, `secondary`→sky supaya tidak tabrakan
warna dengan `error`).

### D17 — Badge dibaca lewat relasi yang di-eager-load, bukan accessor `$appends`

Menambah `$appends = ['badges']` di model `Store` akan memicu query per baris di setiap listing —
persis N+1 yang dilarang di DoD MVP 2. Yang dipakai: relasi `activeBadges()` yang **selalu**
di-`with()` di controller yang menampilkannya, lalu diserialisasi sebagai `store.active_badges`.

---

## 3. Skema database

Dua migration baru + satu migration trigger (konvensi delete-tracking repo ini).

```php
// database/migrations/xxxx_create_store_badges_table.php
Schema::create('store_badges', function (Blueprint $table) {
    $table->id();
    $table->string('code')->unique();                  // official, top_seller, trusted, ...
    $table->string('name');                            // label bahasa Indonesia
    $table->string('name_en')->nullable();             // label bahasa Inggris (i18n)
    $table->string('description')->nullable();         // tooltip singkat untuk pembeli
    $table->string('icon')->default('verified');       // nama Material Symbols
    $table->string('color_token')->default('primary'); // lihat D16
    $table->boolean('is_active')->default(true);
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
});
```

```php
// database/migrations/xxxx_create_store_badge_assignments_table.php
Schema::create('store_badge_assignments', function (Blueprint $table) {
    $table->id();

    // WAJIB ulid, bukan foreignId() — stores.id adalah ULID (keputusan D2 di README).
    $table->ulid('store_id');
    $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();

    $table->foreignId('store_badge_id')->constrained('store_badges')->cascadeOnDelete();
    $table->foreignId('assigned_by')->nullable()->constrained('admins')->nullOnDelete();

    $table->timestamp('assigned_at');
    $table->timestamp('expires_at')->nullable();       // null = permanen
    $table->string('note')->nullable();                // alasan pemberian, terlihat di god-mode saja

    $table->timestamps();
    $table->unique(['store_id', 'store_badge_id']);
    $table->index(['store_badge_id', 'expires_at']);
});
```

```php
// database/migrations/xxxx_create_store_badges_delete_tracking_triggers.php
// Pola sama persis dengan xxxx_create_store_shipping_methods_delete_tracking_trigger.php
CREATE TRIGGER tr_store_badges_delete BEFORE DELETE ON store_badges ...
CREATE TRIGGER tr_store_badge_assignments_delete BEFORE DELETE ON store_badge_assignments ...
```

Seeder `database/seeders/StoreBadgeSeeder.php` (idempoten, pakai `updateOrCreate` supaya aman
dijalankan ulang di produksi):

| code | name | icon | color_token |
| --- | --- | --- | --- |
| `official` | Official | `verified` | `primary` |
| `top_seller` | Top Seller | `trophy` | `tertiary` |
| `trusted` | Trusted | `shield_person` | `secondary` |

---

## 4. Model & relasi

```
app/Domains/Store/Models/StoreBadge.php
app/Domains/Store/Models/StoreBadgeAssignment.php
```

`StoreBadge`: `$fillable` untuk semua kolom editable, cast `is_active` → bool. Scope
`scopeActive()`.

Tambahan di `app/Domains/Store/Models/Store.php`:

```php
public function badges(): BelongsToMany
{
    return $this->belongsToMany(StoreBadge::class, 'store_badge_assignments')
        ->withPivot(['assigned_at', 'expires_at', 'note', 'assigned_by'])
        ->withTimestamps()
        ->orderBy('store_badges.sort_order');
}

/**
 * Badge yang benar-benar layak ditampilkan ke publik: jenis badge-nya masih aktif dan
 * pemberiannya belum kedaluwarsa. Ini yang dipakai semua halaman publik.
 */
public function activeBadges(): BelongsToMany
{
    return $this->badges()
        ->where('store_badges.is_active', true)
        ->where(fn ($q) => $q
            ->whereNull('store_badge_assignments.expires_at')
            ->orWhere('store_badge_assignments.expires_at', '>', now()));
}
```

Registrasi observer di `AppServiceProvider::boot()` (wajib — audit delete tidak otomatis):

```php
StoreBadge::observe(DeletedItemObserver::class);
StoreBadgeAssignment::observe(DeletedItemObserver::class);
```

---

## 5. Backend — god-mode

Action baru di `app/Domains/Store/Actions/`:

```
AssignStoreBadge.php    execute(Store $store, StoreBadge $badge, Admin $admin, ?Carbon $expiresAt, ?string $note)
RevokeStoreBadge.php    execute(Store $store, StoreBadge $badge, Admin $admin)
```

Keduanya membungkus perubahan dalam `DB::transaction()` dan menulis `AdminActivityLog`
(`assign_store_badge:{store_id}:{badge_code}` / `revoke_store_badge:...`), mengikuti pola
`ApproveStore`/`RejectStore` yang sudah ada.

Controller: `app/Domains/GodMode/Controllers/StoreBadgeController.php`.

Route baru di grup `god-mode.auth` (`routes/web.php`):

```php
// Katalog badge
Route::get('/store-badges', [StoreBadgeController::class, 'index'])->name('store-badges.index');
Route::post('/store-badges', [StoreBadgeController::class, 'store'])->name('store-badges.store');
Route::put('/store-badges/{id}', [StoreBadgeController::class, 'update'])->name('store-badges.update');
Route::delete('/store-badges/{id}', [StoreBadgeController::class, 'destroy'])->name('store-badges.destroy');

// Pemberian badge ke satu toko (dipakai dari halaman detail toko)
Route::post('/stores/{id}/badges', [StoreBadgeController::class, 'assign'])->name('stores.badges.assign');
Route::delete('/stores/{id}/badges/{badgeId}', [StoreBadgeController::class, 'revoke'])->name('stores.badges.revoke');
```

Form Request `app/Domains/Store/Requests/StoreBadgeRequest.php`:

```php
'code'        => ['required', 'string', 'max:40', 'regex:/^[a-z0-9_]+$/', Rule::unique('store_badges')->ignore($id)],
'name'        => 'required|string|max:50',
'name_en'     => 'nullable|string|max:50',
'description' => 'nullable|string|max:200',
'icon'        => ['required', 'string', Rule::in(config('store.badge_icons'))],
'color_token' => ['required', Rule::in(config('store.badge_colors'))],
'is_active'   => 'boolean',
'sort_order'  => 'integer|min:0|max:999',
```

Aturan penghapusan: `destroy()` **menolak** (422) kalau badge masih terpasang di toko mana pun, dan
mengarahkan admin untuk menonaktifkan (`is_active = false`) alih-alih menghapus. Menghapus badge
yang sedang dipakai berarti kehilangan jejak riwayat pemberian — dan `cascadeOnDelete` di pivot
membuatnya senyap.

Tambahan di `config/store.php`:

```php
'badge_icons'  => ['verified', 'trophy', 'shield_person', 'workspace_premium', 'local_fire_department', 'star'],
'badge_colors' => ['primary', 'secondary', 'tertiary', 'error', 'neutral'],
```

---

## 6. Frontend

### Komponen

`resources/js/Components/Store/StoreBadgeList.tsx` — satu komponen kecil dipakai di semua tempat:

```tsx
type Props = { badges: StoreBadgeSummary[]; size?: "sm" | "md"; max?: number };
```

Chip: ikon Material Symbols + label, warna dari peta `color_token` → kelas Tailwind (peta statis di
komponen, bukan string kelas dinamis — Tailwind v4 tidak bisa memindai kelas yang dirangkai saat
runtime). `title` berisi `description` supaya tooltip native jalan tanpa library.

### Tipe

`resources/js/types/index.d.ts`:

```ts
export interface StoreBadgeSummary {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  icon: string;
  color_token: "primary" | "secondary" | "tertiary" | "success" | "warning" | "neutral";
}

// di interface Store yang sudah ada:
active_badges?: StoreBadgeSummary[];
```

### Tempat tampil

| Halaman | Berkas | Catatan |
| --- | --- | --- |
| Direktori toko | `Pages/Store/Directory.tsx` | Di bawah nama toko, `size="sm"`, `max={2}` |
| Etalase toko | `Pages/Store/Show.tsx` | Di header toko, ukuran penuh |
| Detail produk | `Pages/Store/ProductShow.tsx` | Di baris info penjual |
| Checkout | `Pages/Store/Checkout.tsx` | Header toko, `size="sm"` — menambah keyakinan tepat sebelum bayar |
| Toko saya | `Pages/Store/MyStores.tsx` | Read-only; pemilik toko tidak bisa mengubah |
| God-mode detail toko | `Pages/GodMode/Stores/Show.tsx` | Panel kelola: pasang/cabut + masa berlaku + catatan |

Halaman god-mode baru: `Pages/GodMode/StoreBadges/Index.tsx` (katalog + form tambah/ubah), dan menu
di `Layouts/GodModeLayout.tsx`:

```ts
{ href: "/god-mode/store-badges", label: "Store Badges", icon: "verified" },
```

### Wajib: eager load di setiap controller yang menampilkan

`StoreDirectoryController@index`, `@show`, `@productShow`, `CheckoutController@show`,
`StoreApplicationController@index` — semuanya harus `->with('activeBadges')`. Tanpa ini, direktori
toko langsung jadi N+1. Verifikasi lewat Telescope sebelum menandai selesai.

Payload badge kecil dan terbatas (maksimal beberapa baris per toko), jadi aman dikirim sebagai prop
Inertia — ini bukan pelanggaran aturan "jangan kirim dataset besar sebagai prop Inertia".

### i18n

Label badge disimpan di database dua bahasa (`name`, `name_en`), jadi **tidak** masuk
`lang/*.json`. Yang masuk `lang/{id,en}.json` hanya teks UI god-mode ("Kelola Badge", "Masa
berlaku", "Cabut badge", dst.). Pemilihan bahasa label dilakukan di komponen berdasarkan locale
aktif, dengan fallback ke `name` kalau `name_en` kosong.

---

## 7. Definition of Done

- [ ] Migration `store_badges`, `store_badge_assignments`, dan trigger delete-tracking sudah jalan.
- [ ] `StoreBadge` + `StoreBadgeAssignment` terdaftar di `AppServiceProvider` sebagai `DeletedItemObserver`.
- [ ] Seeder menghasilkan tiga badge awal dan aman dijalankan dua kali.
- [ ] Admin bisa membuat jenis badge baru dari god-mode tanpa deploy kode.
- [ ] Admin bisa memasang & mencabut badge dari halaman detail toko; keduanya tercatat di `admin_activity_logs`.
- [ ] Badge kedaluwarsa (`expires_at` lewat) otomatis hilang dari halaman publik tanpa job apa pun.
- [ ] Menonaktifkan jenis badge menyembunyikannya dari semua toko sekaligus.
- [ ] Menghapus jenis badge yang masih terpasang ditolak dengan pesan yang jelas.
- [ ] Tidak ada endpoint yang membuat pemilik toko bisa memberi badge ke dirinya sendiri (uji kirim request langsung ke route god-mode sebagai user biasa → 403).
- [ ] Direktori toko dengan 20 toko ber-badge tetap satu query untuk badge (cek Telescope).
- [ ] Chip badge benar di mode terang dan gelap, dan tidak melebar merusak kartu toko di layar sempit.
- [ ] `pnpm build` lolos tanpa error TypeScript; tidak ada `any` di kode baru.

---

## 8. Di luar lingkup fase ini

- **Pemberian otomatis** ("Top Seller" dari jumlah order `completed` 30 hari terakhir). Skema sudah
  mendukung: `assigned_by` nullable untuk penanda "diberikan sistem", `expires_at` untuk masa
  berlaku. Tinggal menambah command terjadwal saat dibutuhkan.
- Badge tingkat produk (mis. "Best Seller" per produk).
- Filter direktori toko berdasarkan badge — mudah ditambah nanti karena datanya sudah relasional.
- Gambar/lencana kustom yang diunggah admin; MVP cukup ikon + warna.
