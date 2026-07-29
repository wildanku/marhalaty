# Fase 1 — Store Foundation

Toko, keanggotaan, alamat origin, dan alur pengajuan → approval admin.

Prasyarat: tidak ada. Ini fase paling dasar; fase 2–5 bergantung padanya.

---

## 1. Aturan bisnis

1. Hanya user dengan `is_verified = true` yang boleh mengajukan toko.
2. Satu user boleh punya lebih dari satu toko.
3. Toko baru berstatus `pending` dan **belum tampil publik** sampai admin approve.
4. Admin (god-mode) juga bisa membuat toko, tapi **wajib** menunjuk satu user verified sebagai
   owner. Toko yang dibuat admin langsung `approved` dan `created_by_admin_id` terisi.
5. Satu toko bisa dikelola banyak user lewat invitation. Role MVP 2: `owner` (tepat satu, tidak bisa
   dihapus) dan `admin`. Hanya owner yang bisa mengundang dan mencabut anggota.
6. Yang boleh diundang hanya user yang sudah terdaftar **dan** verified.
7. Satu toko satu alamat origin di MVP 2. Skema sudah mendukung banyak alamat (`is_primary`), tapi
   UI hanya mengelola satu.
8. Reject harus menyertakan alasan, dan alasan itu ditampilkan ke pemohon supaya bisa mengajukan
   ulang.

---

## 2. Database

### 2.1 `stores`

```php
Schema::create('stores', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('name');
    $table->string('slug')->unique();
    $table->text('description')->nullable();

    $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();

    $table->enum('status', ['pending', 'approved', 'rejected', 'suspended'])
          ->default('pending')->index();
    $table->timestamp('verified_at')->nullable();
    $table->foreignId('verified_by')->nullable()->constrained('admins')->nullOnDelete();
    $table->text('rejection_reason')->nullable();
    $table->foreignId('created_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();

    $table->string('contact_phone')->nullable();
    $table->string('contact_email')->nullable();
    $table->boolean('is_active')->default(true);

    $table->timestamps();
});
```

Catatan:
- `verified_by` dan `created_by_admin_id` menunjuk ke tabel `admins` (guard `admin`), bukan `users` —
  konsisten dengan `rsvps.admin_id` yang sudah ada.
- `suspended` disiapkan untuk admin menonaktifkan toko bermasalah tanpa menghapus data.
- Logo toko lewat media library, bukan kolom (lihat §4).

### 2.2 `store_members`

```php
Schema::create('store_members', function (Blueprint $table) {
    $table->id();
    $table->foreignUlid('store_id')->constrained('stores')->cascadeOnDelete();
    $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
    $table->enum('role', ['owner', 'admin'])->default('admin');
    $table->enum('status', ['invited', 'active', 'revoked'])->default('invited')->index();

    $table->foreignId('invited_by_user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->string('invitation_token', 64)->nullable()->unique();
    $table->timestamp('invitation_expires_at')->nullable();
    $table->timestamp('accepted_at')->nullable();
    $table->timestamp('revoked_at')->nullable();

    $table->timestamps();
    $table->unique(['store_id', 'user_id']);
});
```

Owner otomatis dibuatkan baris `role = owner, status = active` saat toko dibuat, supaya semua
pengecekan izin cukup lewat satu tabel.

### 2.3 `store_addresses`

```php
Schema::create('store_addresses', function (Blueprint $table) {
    $table->id();
    $table->foreignUlid('store_id')->constrained('stores')->cascadeOnDelete();

    $table->string('label')->default('Alamat Utama');
    $table->string('recipient_name');
    $table->string('phone');
    $table->text('address_line');                      // jalan, RT/RW, patokan

    $table->char('village_id', 10);                    // FK ke indonesia_villages
    $table->char('postal_code', 5);
    $table->decimal('lat', 10, 7)->nullable();
    $table->decimal('lng', 10, 7)->nullable();

    // hasil resolusi ke provider ongkir (lihat fase 3)
    $table->unsignedBigInteger('rajaongkir_destination_id')->nullable()->index();
    $table->timestamp('destination_resolved_at')->nullable();

    $table->boolean('is_primary')->default(true);
    $table->timestamps();

    $table->foreign('village_id')->references('id')->on('indonesia_villages')->restrictOnDelete();
});
```

Provinsi/kota/kecamatan **tidak diduplikasi** — diturunkan lewat relasi
`village → district → city → province` yang sudah ada di `app/Domains/Shared/Models/`.

### 2.4 Delete tracking

Tambahkan trigger untuk `stores`, `store_members`, `store_addresses` di migration baru dengan pola
yang sama seperti `2026_05_12_013000_create_delete_tracking_triggers.php`, dan daftarkan
`DeletedItemObserver` untuk model-model baru di `AppServiceProvider::boot()`.

---

## 3. Model

`app/Domains/Store/Models/Store.php`

```php
class Store extends Model implements HasMedia
{
    use HasUlids, HasSlug, InteractsWithMedia;

    protected $fillable = [
        'name', 'slug', 'description', 'owner_user_id', 'status',
        'contact_phone', 'contact_email', 'is_active', 'created_by_admin_id',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'is_active'   => 'boolean',
    ];

    protected $appends = ['logo_url'];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug')
            ->doNotGenerateSlugsOnUpdate();     // sama seperti Event: slug stabil untuk URL
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('store-logo')->singleFile()->useDisk('public');
        $this->addMediaCollection('store-banner')->singleFile()->useDisk('public');
    }

    public function owner(): BelongsTo   { return $this->belongsTo(User::class, 'owner_user_id'); }
    public function members(): HasMany   { return $this->hasMany(StoreMember::class); }
    public function addresses(): HasMany { return $this->hasMany(StoreAddress::class); }
    public function primaryAddress(): HasOne {
        return $this->hasOne(StoreAddress::class)->where('is_primary', true);
    }
    public function products(): HasMany  { return $this->hasMany(Product::class); }
    public function orders(): HasMany    { return $this->hasMany(StoreOrder::class); }

    public function scopePubliclyVisible(Builder $q): Builder
    {
        return $q->where('status', 'approved')->where('is_active', true);
    }

    public function isManagedBy(User $user): bool
    {
        return $this->members()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
    }
}
```

> **Penting — `HasUlids` + `HasSlug`.** Keduanya mengait ke event `creating`. `HasUlids` mengisi PK,
> `HasSlug` mengisi slug; tidak bentrok, tapi pastikan `$keyType = 'string'` dan
> `$incrementing = false` (sudah ditangani trait `HasUlids`) sebelum relasi `foreignUlid` dipakai.

`StoreMember` dan `StoreAddress` model biasa. `StoreAddress` menambah accessor turunan:

```php
public function getFullAddressAttribute(): string   // "Jl. X, Kel. A, Kec. B, Kota C, Prov. D 12345"
public function village(): BelongsTo                // IndonesiaVillage
```

Eager load standar untuk alamat: `->with('village.district.city.province')`.

---

## 4. Backend — controller, action, policy

### 4.1 Policy

`app/Domains/Store/Policies/StorePolicy.php`

| Ability | Aturan |
| --- | --- |
| `view` | store `approved` & aktif, **atau** pemohon adalah anggota aktif |
| `update` | anggota aktif (owner atau admin) |
| `manageMembers` | hanya `role = owner` |
| `manageProducts` | anggota aktif |
| `manageOrders` | anggota aktif |

Didaftarkan lewat `Gate::policy(Store::class, StorePolicy::class)` di `AppServiceProvider::boot()`
(repo belum punya `AuthServiceProvider`).

### 4.2 Alur user

| Method | Route | Nama | Keterangan |
| --- | --- | --- | --- |
| GET | `/my/stores` | `stores.mine` | Daftar toko milik/dikelola user + status pengajuan |
| GET | `/my/stores/create` | `stores.create` | Form pengajuan (gate: `is_verified`) |
| POST | `/my/stores` | `stores.store` | Simpan pengajuan → status `pending` |
| GET | `/my/stores/{store}` | `stores.manage` | Dashboard toko (produk, order, anggota, alamat) |
| PATCH | `/my/stores/{store}` | `stores.update` | Ubah profil toko |
| POST | `/my/stores/{store}/address` | `stores.address.store` | Simpan/ubah alamat origin |
| POST | `/my/stores/{store}/members` | `stores.members.invite` | Undang anggota (owner saja) |
| DELETE | `/my/stores/{store}/members/{member}` | `stores.members.revoke` | Cabut anggota (owner saja) |
| GET | `/store-invitations/{token}` | `stores.invitations.show` | Halaman terima undangan |
| POST | `/store-invitations/{token}` | `stores.invitations.accept` | Terima undangan |

Semua di dalam `Route::middleware('auth')`. Gate `is_verified` dicek di controller
(`abort_unless($request->user()->is_verified, 403)`) — repo belum punya middleware `verified`.

Validasi pengajuan toko:

```php
$request->validate([
    'name'          => 'required|string|max:100|unique:stores,name',
    'description'   => 'required|string|max:2000',
    'contact_phone' => 'required|string|max:30',
    'contact_email' => 'nullable|email|max:100',
    'logo'          => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
    // alamat origin
    'recipient_name' => 'required|string|max:100',
    'phone'          => 'required|string|max:30',
    'address_line'   => 'required|string|max:500',
    'village_id'     => 'required|exists:indonesia_villages,id',
    'lat'            => 'nullable|numeric|between:-90,90',
    'lng'            => 'nullable|numeric|between:-180,180',
]);
```

`postal_code` **tidak** diambil dari input — diisi server dari `IndonesiaVillage::find($village_id)->postal_code`
supaya tidak bisa dipalsukan.

### 4.3 Undangan anggota

`InviteStoreMember` action:

1. Cari user by email dengan `User::withoutGlobalScope(MarhalahScope::class)->where('email', $email)`.
   **Wajib** tanpa global scope — kalau tidak, saat `COMMUNITY_SCOPE=single` alumni marhalah lain
   tidak akan ketemu dan errornya menyesatkan ("user tidak ditemukan" padahal ada).
2. Tolak kalau user tidak ada, tidak verified, atau sudah jadi anggota aktif.
3. Buat `store_members` status `invited` + `invitation_token` (`Str::random(64)`) + kedaluwarsa 7 hari.
4. Dispatch `SendStoreInvitationEmail` (job Brevo, pola `app/Jobs/Send*Email.php`).

Terima undangan: cocokkan token, pastikan belum kedaluwarsa **dan** `auth()->id()` sama dengan
`user_id` di baris undangan, lalu set `status = active`, `accepted_at = now()`.

### 4.4 Alur admin (god-mode)

| Method | Route | Keterangan |
| --- | --- | --- |
| GET | `/god-mode/stores` | Daftar toko + filter status (default `pending` di atas) |
| GET | `/god-mode/stores/{id}` | Detail pengajuan: profil, owner, alamat, kontak |
| POST | `/god-mode/stores/{id}/approve` | Set `approved`, `verified_at`, `verified_by` |
| POST | `/god-mode/stores/{id}/reject` | Wajib `rejection_reason`, set `rejected` |
| POST | `/god-mode/stores/{id}/suspend` | Set `suspended` (+ alasan) |
| GET | `/god-mode/stores/create` | Form admin membuat toko + pilih owner |
| POST | `/god-mode/stores` | Buat toko `approved` dengan `created_by_admin_id` |

Approve/reject dibungkus `DB::transaction()`, mencatat `AdminActivityLog`, lalu dispatch job email
(`SendStoreApprovedEmail` / `SendStoreRejectedEmail`) dan `TelegramService` untuk memberi tahu
channel admin ketika ada pengajuan baru masuk.

Tambahkan item nav `{ href: "/god-mode/stores", label: "Stores", icon: "storefront" }` di
`resources/js/Layouts/GodModeLayout.tsx`.

---

## 5. Frontend

Halaman baru (semua `.tsx`, strict typing, tanpa `any`):

```
resources/js/Pages/Store/
├── MyStores.tsx           daftar toko user + status badge (pending/approved/rejected + alasan)
├── Create.tsx             form pengajuan toko + alamat origin
├── Manage/
│   ├── Dashboard.tsx      ringkasan toko (produk, order, saldo order masuk)
│   ├── Settings.tsx       profil toko + logo/banner
│   ├── Address.tsx        alamat origin (cascading wilayah)
│   └── Members.tsx        daftar anggota + form undangan (hanya owner)
└── InvitationAccept.tsx   halaman terima undangan

resources/js/Pages/GodMode/Stores/
├── Index.tsx              tabel pengajuan + filter status
├── Show.tsx               detail + tombol Approve / Reject (modal alasan)
└── Create.tsx             admin membuat toko + pilih owner (AsyncSelect user)
```

Titik masuk untuk user: tambahkan section **Toko Saya** di `Pages/Profile/Edit.tsx` (sesuai note:
"user bisa klik di halaman my profile dan disana ada section atau menu (Store)") dan tautan di
dropdown `Components/Header.tsx`. Untuk user yang belum verified, section itu tampil sebagai
keadaan terkunci dengan penjelasan cara mendapat verifikasi — bukan disembunyikan, supaya fiturnya
tetap bisa ditemukan.

### Pemilih wilayah

`LocationController` yang ada hanya punya endpoint `cities`. Fase ini menambah endpoint cascading:

```
GET /api/locations/provinces
GET /api/locations/cities?province_id=
GET /api/locations/districts?city_id=
GET /api/locations/villages?district_id=          // response menyertakan postal_code
```

Semua `->limit(100)`, pencarian pakai `ilike` (Postgres) mengikuti pola `LocationController` yang
sudah ada. Di FE pakai `Components/AsyncSelect.tsx` yang sudah tersedia; kode pos terisi otomatis
(read-only) begitu kelurahan dipilih.

---

## 6. Notifikasi

| Kejadian | Kanal | Penerima |
| --- | --- | --- |
| Pengajuan toko baru | Telegram (`TelegramService`) | Channel admin |
| Toko disetujui | Email (Brevo job) | Owner |
| Toko ditolak | Email (Brevo job) + alasan | Owner |
| Undangan anggota | Email (Brevo job) + link token | User yang diundang |

Semua email lewat queued job (`QUEUE_CONNECTION=database`) — jangan kirim sinkron di controller.

---

## 7. Definition of Done

- [ ] Migration `stores`, `store_members`, `store_addresses` + trigger delete-tracking jalan di Postgres.
- [ ] `Store` menghasilkan ULID dan slug unik otomatis; slug tidak berubah saat nama diubah.
- [ ] User belum verified mendapat 403 dan pesan yang jelas saat mencoba mengajukan toko.
- [ ] Pengajuan tersimpan `pending` dan tidak muncul di listing publik mana pun.
- [ ] Admin bisa approve (isi `verified_at` + `verified_by`) dan reject (wajib alasan); keduanya tercatat di `admin_activity_logs`.
- [ ] Owner menerima email approve/reject; channel Telegram admin menerima notifikasi pengajuan baru.
- [ ] Owner bisa mengundang user verified lintas marhalah (uji dengan `COMMUNITY_SCOPE=single`) dan mencabutnya; non-owner mendapat 403.
- [ ] Undangan kedaluwarsa (>7 hari) ditolak dengan pesan yang jelas.
- [ ] Alamat origin tersimpan dengan `village_id`, `postal_code` terisi server-side, dan relasi kecamatan/kota/provinsi terbaca.
- [ ] Admin bisa membuat toko dan menunjuk owner; `created_by_admin_id` terisi, owner otomatis jadi `store_members.role = owner`.
