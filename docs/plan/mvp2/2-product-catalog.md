# Fase 2 — Katalog Produk

Produk fisik & non-fisik, varian maksimal 2 opsi, stok, media, dan etalase publik.

Prasyarat: [Fase 1](./1-store-foundation.md) selesai (toko `approved` sudah ada).

---

## 1. Aturan bisnis

1. Dua tipe produk:
   - `physical` — dikirim, **wajib** punya berat (gram), ikut perhitungan ongkir.
   - `digital` — ebook/file, tanpa ongkir, dikirim sebagai link download setelah pembayaran lunas.
2. Harga bisa **tunggal** (satu harga, satu stok) atau **bervarian**.
3. Varian dibatasi **maksimal 2 opsi** (mis. Ukuran × Warna). Nama opsi bebas diketik penjual.
4. Setiap kombinasi varian punya harga, stok, SKU, dan berat sendiri.
5. Produk `draft` hanya terlihat oleh pengelola toko; `active` tampil publik; `archived` disembunyikan
   tapi tetap tertaut ke order lama.
6. Produk hanya bisa dipublikasikan kalau tokonya `approved` dan aktif.
7. SKU unik per toko (boleh sama antar toko).

---

## 2. Database

### 2.1 `products`

```php
Schema::create('products', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->foreignUlid('store_id')->constrained('stores')->cascadeOnDelete();

    $table->string('name');
    $table->string('slug');
    $table->text('description')->nullable();
    $table->enum('type', ['physical', 'digital'])->index();
    $table->string('sku')->nullable();

    $table->enum('status', ['draft', 'active', 'archived'])->default('draft')->index();
    $table->boolean('has_variants')->default(false);

    // dipakai hanya saat has_variants = false
    $table->decimal('price', 12, 2)->nullable();
    $table->integer('stock_quantity')->nullable();
    $table->integer('weight_grams')->nullable();

    // definisi opsi varian, maksimal 2 entri
    // [{"name":"Ukuran","values":["M","L","XL"]},{"name":"Warna","values":["Merah","Putih"]}]
    $table->json('options')->nullable();

    $table->timestamps();

    $table->unique(['store_id', 'slug']);
    $table->unique(['store_id', 'sku']);
});
```

### 2.2 `product_variants`

```php
Schema::create('product_variants', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->foreignUlid('product_id')->constrained('products')->cascadeOnDelete();

    $table->string('sku')->nullable();
    $table->string('option1_name');                 // "Ukuran"
    $table->string('option1_value');                // "L"
    $table->string('option2_name')->nullable();     // "Warna"
    $table->string('option2_value')->nullable();    // "Merah"

    $table->decimal('price', 12, 2);
    $table->integer('stock_quantity')->default(0);
    $table->integer('weight_grams')->nullable();
    $table->boolean('is_active')->default(true);

    $table->timestamps();
    $table->unique(['product_id', 'option1_value', 'option2_value']);
});
```

**Kenapa 2 kolom datar, bukan tabel opsi ternormalisasi?** Kebutuhan mengunci varian di maksimal 2
opsi. Skema ternormalisasi penuh (`product_options` + `product_option_values` + pivot) butuh 3 tabel
tambahan dan join bertingkat hanya untuk menampilkan "Ukuran L / Warna Merah". Bentuk datar ini
membuat query stok dan snapshot order jadi satu baris, dan batas 2 opsi ditegakkan di level skema —
bukan cuma di validasi. Kalau nanti butuh opsi ke-3, migrasinya lokal: tambah kolom `option3_*`
atau normalisasi saat itu juga.

### 2.3 Media

Lewat `spatie/laravel-medialibrary`, mengikuti pola `EventAddon`:

```php
public function registerMediaCollections(): void
{
    $this->addMediaCollection('product-images')
        ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp'])
        ->useDisk('public');

    // file produk digital — WAJIB disk privat, tidak boleh 'public'
    $this->addMediaCollection('product-digital-file')
        ->singleFile()
        ->useDisk('local');
}
```

> **Keamanan.** File produk digital **tidak boleh** di disk `public`. Kalau di `public`, URL-nya bisa
> ditebak/dibagikan dan produk berbayar bocor. Akses hanya lewat signed route + token per order item
> (dibahas di [fase 5](./5-fulfillment-and-admin.md)).

Accessor: `images` (array URL, urut) dan `primary_image_url` di `$appends`, mengikuti pola
`getImageUrlAttribute()` yang sudah dipakai `EventAddon`/`EventPackage`.

---

## 3. Model

`Product` memakai `HasUlids`, `HasSlug` (slug dari `name`, `doNotGenerateSlugsOnUpdate()`),
`InteractsWithMedia`.

```php
protected $casts = [
    'options'        => 'json',
    'price'          => 'decimal:2',
    'has_variants'   => 'boolean',
];

public function store(): BelongsTo    { return $this->belongsTo(Store::class); }
public function variants(): HasMany   { return $this->hasMany(ProductVariant::class); }

public function scopeActive(Builder $q): Builder
{
    return $q->where('status', 'active')
             ->whereHas('store', fn ($s) => $s->publiclyVisible());
}

public function isPhysical(): bool { return $this->type === 'physical'; }

/** Harga terendah untuk ditampilkan di kartu produk ("mulai dari"). */
public function getDisplayPriceAttribute(): string { ... }

/** Total stok tersedia (produk tunggal atau jumlah stok semua varian aktif). */
public function getAvailableStockAttribute(): int { ... }
```

`ProductVariant` menambahkan:

```php
public function getLabelAttribute(): string   // "L / Merah" atau "L"
public function getEffectiveWeightAttribute(): int  // weight_grams ?? product->weight_grams
```

Daftarkan `Product` dan `ProductVariant` ke `DeletedItemObserver` + trigger delete-tracking.

---

## 4. Backend

### 4.1 Validasi (Form Request `StoreProductRequest`)

```php
'name'          => 'required|string|max:150',
'description'   => 'nullable|string|max:5000',
'type'          => 'required|in:physical,digital',
'sku'           => ['nullable','string','max:50', Rule::unique('products','sku')
                        ->where('store_id', $storeId)->ignore($productId)],
'status'        => 'required|in:draft,active,archived',
'has_variants'  => 'required|boolean',

// mode harga tunggal
'price'          => 'required_if:has_variants,false|nullable|numeric|min:0',
'stock_quantity' => 'required_if:has_variants,false|nullable|integer|min:0',
'weight_grams'   => 'required_if:type,physical|nullable|integer|min:1|max:500000',

// mode varian — maksimal 2 grup opsi
'options'                => 'required_if:has_variants,true|array|max:2',
'options.*.name'         => 'required|string|max:50',
'options.*.values'       => 'required|array|min:1|max:30',
'options.*.values.*'     => 'required|string|max:50',

'variants'                  => 'required_if:has_variants,true|array|min:1|max:200',
'variants.*.option1_value'  => 'required|string|max:50',
'variants.*.option2_value'  => 'nullable|string|max:50',
'variants.*.price'          => 'required|numeric|min:0',
'variants.*.stock_quantity' => 'required|integer|min:0',
'variants.*.weight_grams'   => 'nullable|integer|min:1|max:500000',
'variants.*.sku'            => 'nullable|string|max:50',

'images'        => 'nullable|array|max:5',
'images.*'      => 'image|mimes:jpg,jpeg,png,webp|max:2048',
'digital_file'  => 'required_if:type,digital|nullable|file|mimes:pdf,epub,zip,mp3,mp4|max:51200',
```

Validasi tambahan di service (tidak bisa diekspresikan sebagai rule sederhana):

1. `variants.*.option1_value` harus ada di `options[0].values`; kalau ada `options[1]`, semua
   `option2_value` wajib terisi dan ada di `options[1].values`.
2. Kombinasi `(option1_value, option2_value)` tidak boleh duplikat.
3. Produk `digital` tidak boleh `has_variants = true` di MVP 2 (satu file per produk).
4. Ganti `type` dari `physical` ke `digital` (atau sebaliknya) ditolak kalau produk sudah pernah
   dipesan — hindari order lama jadi tidak konsisten.

### 4.2 `ProductService`

`saveProduct(Store $store, array $data, ?Product $product): Product` — dalam satu
`DB::transaction()`:

1. Simpan/update baris `products`.
2. Kalau `has_variants`: sinkronkan `product_variants` (upsert berdasarkan kombinasi opsi, nonaktifkan
   varian yang hilang alih-alih menghapusnya — varian bisa masih tertaut ke order lama).
3. Simpan media (gambar dan/atau file digital).

### 4.3 Route

Pengelola toko (di dalam `auth`, dijaga `StorePolicy@manageProducts`):

| Method | Route |
| --- | --- |
| GET | `/my/stores/{store}/products` |
| GET | `/my/stores/{store}/products/create` |
| POST | `/my/stores/{store}/products` |
| GET | `/my/stores/{store}/products/{product}/edit` |
| PUT | `/my/stores/{store}/products/{product}` |
| PATCH | `/my/stores/{store}/products/{product}/status` |
| DELETE | `/my/stores/{store}/products/{product}` (tolak kalau sudah pernah dipesan → arahkan ke `archived`) |

Publik:

| Method | Route | Keterangan |
| --- | --- | --- |
| GET | `/stores` | Direktori toko approved (search + paginasi) |
| GET | `/stores/{store:slug}` | Etalase toko + daftar produk aktif |
| GET | `/stores/{store:slug}/products/{product:slug}` | Detail produk + pemilih varian |

Listing publik pakai `spatie/laravel-query-builder` (sudah terpasang, dipakai
`DirectoryController`) dengan `allowedFilters(['search', 'type', 'store_id'])` dan
`allowedSorts(['created_at', 'price'])`.

Eager load wajib supaya tidak N+1: `Product::with(['store', 'variants', 'media'])`.

---

## 5. Frontend

```
resources/js/Pages/Store/
├── Manage/
│   ├── Products/Index.tsx      tabel produk + status + stok + aksi cepat
│   └── Products/Form.tsx       form create/edit (dipakai dua-duanya)
├── Directory.tsx               daftar toko publik
├── Show.tsx                    etalase satu toko
└── ProductShow.tsx             detail produk + pemilih varian + tombol tambah ke keranjang
```

### Editor varian (`Components/Store/VariantEditor.tsx`)

Bagian paling rumit di fase ini. Perilaku:

1. Penjual menambah grup opsi (maks 2): ketik nama ("Ukuran") lalu nilai-nilainya sebagai chip.
2. Setiap perubahan opsi → **regenerasi matriks kombinasi** di klien, sambil mempertahankan
   harga/stok yang sudah diisi untuk kombinasi yang masih ada.
3. Matriks tampil sebagai tabel: kolom Kombinasi, Harga (`CurrencyInput` yang sudah ada), Stok, SKU,
   Berat.
4. Aksi massal "isi semua harga" karena mengetik 20 baris satu-satu itu menyiksa.
5. Peringatan sebelum submit kalau ada kombinasi berharga 0 atau berstok 0.

Batas keras: `options.length <= 2` ditegakkan di UI **dan** di validasi server.

### Pemilih varian di halaman produk (`Components/Store/VariantPicker.tsx`)

- Render satu grup tombol per opsi.
- Nilai yang tidak menghasilkan kombinasi tersedia → dinonaktifkan, bukan disembunyikan (pembeli
  perlu tahu bahwa "XL Merah" itu ada tapi habis).
- Harga, stok, dan gambar diperbarui begitu kombinasi lengkap dipilih.
- Tombol keranjang nonaktif sampai kombinasi lengkap.

Tipe TypeScript ditambahkan ke `resources/js/types/index.d.ts` mengikuti pola yang ada
(`EventAddon`, `EventPackage`):

```ts
export interface ProductOption { name: string; values: string[]; }

export interface ProductVariant {
  id: string;
  sku: string | null;
  option1_name: string; option1_value: string;
  option2_name: string | null; option2_value: string | null;
  price: string; stock_quantity: number;
  weight_grams: number | null; is_active: boolean;
  label: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string; slug: string; description: string | null;
  type: "physical" | "digital";
  sku: string | null;
  status: "draft" | "active" | "archived";
  has_variants: boolean;
  price: string | null; stock_quantity: number | null; weight_grams: number | null;
  options: ProductOption[] | null;
  variants?: ProductVariant[];
  images: string[]; primary_image_url: string | null;
  store?: Store;
}
```

---

## 6. Definition of Done

- [ ] Owner bisa membuat produk fisik harga tunggal, lengkap dengan berat, dan mempublikasikannya.
- [ ] Owner bisa membuat produk dengan 2 opsi (mis. Ukuran × Warna); tiap kombinasi punya harga & stok sendiri.
- [ ] Menambah opsi ke-3 ditolak di UI **dan** server (uji lewat request langsung, bukan cuma lewat form).
- [ ] Mengubah nilai opsi mempertahankan harga/stok kombinasi yang masih ada.
- [ ] Produk digital menolak input berat, mewajibkan unggah file, dan file itu **tidak** bisa diakses lewat URL publik.
- [ ] Produk `draft` tidak muncul di etalase publik; produk toko `pending`/`suspended` juga tidak.
- [ ] Slug produk unik per toko; dua toko boleh punya slug sama.
- [ ] Menghapus produk yang sudah pernah dipesan ditolak dan diarahkan ke `archived`.
- [ ] Halaman etalase (12 produk) memicu jumlah query tetap — diverifikasi di Telescope.
- [ ] `pnpm build` lolos; tidak ada `any` di komponen baru.
