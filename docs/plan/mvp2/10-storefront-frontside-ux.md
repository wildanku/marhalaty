# Fase 10 — Beranda: Highlight Produk, Menu Store, dan Flow Keranjang

Sumber kebutuhan: permintaan langsung dari pemilik produk pada sesi kerja 2026-07-31 (bukan dari
[`ecommerce-note.txt`](../../human-notes/ecommerce-note.txt) seperti fase-fase lain) — perbaikan sisi
**frontside** modul Store, bukan penambahan kapabilitas baru di backend toko.

> Buat section store dan taruh di halaman beranda … mungkin kita perlu semacam setting di sisi admin
> untuk menaruh highlight produk atau store di beranda. Store di site ini mungkin hanya 1 atau max 3
> untuk di awal jadi kita buat highlight produk aja, dan admin bisa set highlight product apa saja
> yg ada disana. Kemudian perlu kita masukkan store ke dalam menu dan highlighted section jg di
> beranda. Kemudian flow add to cart jg masih membingungkan, perlu ada tambahan button "Beli" dan
> "Keranjang" dan ketika user masukkan ke keranjang langsung muncul animated floating button di sisi
> kanan bawah yg mana merupakan button Cart yg hanya muncul jika ada barang di keranjang.

Prasyarat: [Fase 1](./1-store-foundation.md)–[Fase 3](./3-cart-checkout-shipping.md) (toko, katalog
produk, cart) sudah ada dan menjadi fondasi murni fase ini — tidak menambah tabel transaksional baru,
tidak menyentuh pembayaran, dan tidak bergantung pada fase 6–9.

---

## 1. Review kondisi sekarang (audit)

| Area | Kondisi hari ini | Berkas |
| --- | --- | --- |
| Beranda | `WelcomeController@index` cuma mengirim `upcomingEvents`; `Welcome.tsx` punya kartu statis "Directory" & "Latest Events", tidak ada apa pun tentang Store | `app/Http/Controllers/WelcomeController.php`, `resources/js/Pages/Welcome.tsx` |
| Menu utama | `Header.tsx` desktop & mobile cuma punya Directory / Events / Baitul Maal. Link Store (`/stores`, "My Stores", "Cart", "My Orders") **hanya** ada di dropdown akun setelah login — pengunjung yang belum login sama sekali tidak melihat toko ada | `resources/js/Components/Header.tsx` |
| Tambah ke keranjang | Satu tombol "Tambah ke Keranjang" di `ProductShow.tsx`, kuantitas selalu 1 (tidak ada stepper), `router.post` full-page dengan `preserveScroll` lalu diam — tidak ada indikasi visual bahwa item benar-benar masuk keranjang selain scroll tidak bergerak | `resources/js/Pages/Store/ProductShow.tsx`, `app/Domains/Store/Controllers/CartController.php` |
| Beli langsung | Tidak ada. Satu-satunya jalan ke checkout adalah: tambah ke keranjang → buka `/cart` manual → klik toko → `/checkout/{store}` | — |
| Indikator keranjang | Tidak ada badge/counter di mana pun. `Header.tsx` dropdown cuma link teks "Cart" tanpa jumlah item | `resources/js/Components/Header.tsx` |
| Notifikasi/toast | **Tidak ada infrastruktur flash message sama sekali.** `redirect()->back()->with('success', …)` dipanggil di beberapa controller toko tapi tidak ada satu pun halaman yang membaca `usePage().props.flash` — pesannya hilang begitu saja | dicek lewat pencarian `flash` di `resources/js` — nihil |
| Highlight/kurasi konten | Tidak ada tabel atau panel god-mode untuk mengurasi apa yang tampil di beranda. Yang paling dekat adalah katalog `store_badges` (fase 6) — pola kurasi admin lewat tabel, bukan kolom JSON — dan endpoint `GET /god-mode/api/products/search` (`ProductSearchController`, dibuat untuk fase 8) yang sudah bisa mencari produk lintas toko | `app/Domains/GodMode/Controllers/StoreBadgeController.php`, `app/Domains/GodMode/Controllers/ProductSearchController.php` |
| Layout root | `resources/js/app.tsx` me-resolve tiap halaman langsung dari `Pages/**/*.tsx`, tidak ada layout persisten yang membungkus semua halaman publik — setiap page merender `<Header/>`/`<Footer/>`-nya sendiri | `resources/js/app.tsx` |

Kesimpulan audit: fase ini murni **frontside + satu panel kurasi admin ringan**. Tidak ada perubahan
pada `CartService`, `CheckoutService`, atau apa pun yang menyentuh uang.

---

## 2. Ruang lingkup fase ini

**Termasuk**

1. Section "Produk Pilihan" di beranda (`Welcome.tsx`), menampilkan produk yang dikurasi admin.
2. Panel god-mode untuk memilih produk mana yang tampil di section itu (lintas toko, tidak dibatasi
   satu toko), dengan urutan tampil dan batas jumlah slot.
3. Link "Store" di menu utama (`Header.tsx`, desktop & mobile, terlihat oleh pengunjung yang belum
   login sekalipun) mengarah ke direktori toko publik (`/stores`, sudah ada).
4. Tombol ganda "Beli" dan "Keranjang" di halaman produk (`ProductShow.tsx`), plus stepper kuantitas.
5. Floating cart button global: muncul di kanan-bawah begitu keranjang pembeli berisi item, dengan
   badge jumlah item dan animasi saat bertambah; hilang total kalau keranjang kosong atau pengguna
   belum login.

**Tidak termasuk (lihat §12)**

- Highlight **toko** (bukan produk) — sudah diputuskan eksplisit oleh pemilik produk untuk ditunda,
  karena jumlah toko masih 1–3.
- "Beli Sekarang" sebagai jalur checkout terisolasi dari keranjang tersimpan (lihat trade-off D46).
- Sistem toast/flash-message umum untuk seluruh aplikasi.
- Kurasi otomatis (mis. "produk terlaris minggu ini") — kurasi tetap manual oleh admin, sama seperti
  keputusan D15 di fase 6 untuk badge.

---

## 3. Keputusan desain

### D41 — Highlight beranda mengurasi **produk**, bukan **toko**

Konsisten dengan arahan eksplisit pemilik produk. Dengan hanya 1–3 toko di awal, "toko unggulan" akan
kosong secara visual (tidak ada cukup toko untuk terasa seperti kurasi) sementara katalog produk sudah
cukup besar untuk itu, dan kurasi per-produk juga lebih fleksibel: admin bisa mengangkat produk
spesifik dari toko yang sama tanpa harus "mempromosikan" seluruh tokonya.

### D42 — Tabel katalog `featured_products`, bukan kolom JSON di `products` atau `Setting` key-value

Tiga opsi dipertimbangkan, sama seperti D15 di fase 6:

| Opsi | Kenapa ditolak / dipilih |
| --- | --- |
| Kolom `products.is_featured` (boolean) | Tidak ada urutan tampil, tidak ada jejak siapa/kapan memasang, dan query "8 produk pilihan urut" jadi bergantung pada kolom lain (`created_at`) yang tidak berarti apa-apa untuk kurasi. Ditolak. |
| `App\Models\Setting` (`key = 'homepage.featured_products'`, `value = json array of product_id`) | Pola ini sudah dipakai untuk pengaturan skalar (lihat `PaymentSettingsService`), tapi untuk daftar berelasi dengan urutan + toggle per-item, representasi array JSON kehilangan integritas referensial (produk terhapus meninggalkan ID mati di array) dan tidak bisa di-`with()` secara wajar. Ditolak. |
| **Tabel `featured_products`** (`product_id` ulid FK, `sort_order`, `is_active`, `created_by_admin_id`) | FK menjaga integritas referensial (`cascadeOnDelete`), urutan & status per-entry query biasa, dan pola persis meniru `store_badges` yang sudah terbukti di fase 6. **Dipilih.** |

### D43 — Slot dibatasi lewat config, bukan angka bebas

`config('store.max_homepage_highlights')` (default 8, env `STORE_MAX_HOMEPAGE_HIGHLIGHTS`).
Validasi insert di controller admin menolak entry baru begitu jumlah `is_active = true` mencapai batas
— pesannya eksplisit ("Slot penuh (8/8), nonaktifkan salah satu dulu"), bukan diam-diam terpotong di
query publik. Alasan batas ada sama sekali: section beranda harus terasa terkurasi, bukan jadi tempat
sampah "tambahkan semua produk" — relevan justru **karena** jumlah toko sedikit, supaya section tidak
didominasi satu toko.

### D44 — Jumlah item keranjang dikirim lewat shared Inertia prop, bukan endpoint axios/React Query baru

`CLAUDE.md` melarang mengirim **dataset besar/tak terbatas** sebagai prop Inertia dan mewajibkan
axios + TanStack Query untuk itu. Jumlah item keranjang bukan dataset — dia satu angka (`cart.item_count`),
kecil dan murah dihitung, persis kelas data yang dokumen itu sendiri sebut sebagai pengecualian yang sah
("shell": user, opsi kecil, dsb). Menambahkannya ke `HandleInertiaRequests::share()` berarti dia otomatis
segar di **setiap** kunjungan Inertia — termasuk kunjungan `POST /cart/items` yang memicunya — tanpa
komponen manapun perlu fetch manual. Query-nya satu `SUM` terindeks, dan **hanya** dijalankan ketika
`$request->user()` ada (pengunjung anonim tidak kena query tambahan sama sekali).

```php
// app/Http/Middleware/HandleInertiaRequests.php
'cart' => $request->user()
    ? ['item_count' => (int) CartItem::whereHas(
        'cart', fn ($q) => $q->where('user_id', $request->user()->id)
      )->sum('quantity')]
    : null,
```

### D45 — Floating Cart Button dipasang sekali secara global lewat `resources/js/app.tsx`, bukan ditempel manual di ~25 halaman

Tidak ada layout persisten publik di repo ini hari ini — tiap halaman merender `<Header/>`/`<Footer/>`
sendiri. Menyisipkan `<FloatingCartButton />` ke setiap `Pages/**/*.tsx` yang relevan (Welcome,
Dashboard, semua halaman Store, Alumni, Event, Donation, Profile, …) rapuh — halaman baru di masa
depan akan lupa menyertakannya. Sebagai gantinya, `resolve()` di `app.tsx` membungkus komponen halaman
hasil resolusi (pola "persistent layout" Inertia), dan `<FloatingCartButton />` dirender sebagai anak
dari hasil bungkusan itu — sehingga tetap berada di dalam pohon konteks Inertia dan `usePage()` di
dalamnya tetap berfungsi:

```tsx
// resources/js/app.tsx
import FloatingCartButton from "@/Components/Store/FloatingCartButton";

resolve: (name) =>
  pages[`./Pages/${name}.tsx`]().then((module) => {
    const Page = module.default;
    if (name.startsWith("GodMode/")) return Page; // panel admin tidak punya keranjang belanja

    const Wrapped = (props: Record<string, unknown>) => (
      <>
        <Page {...props} />
        <FloatingCartButton />
      </>
    );
    Wrapped.displayName = `WithFloatingCart(${name})`;
    return Wrapped;
  }),
```

`FloatingCartButton` sendiri yang memutuskan tampil/tidak (tidak ada item, belum login, atau sedang di
`/cart` / `/checkout/*` — halaman yang sudah *tentang* keranjang, tombol jadi mubazir di sana).

### D46 — "Beli" memakai jalur keranjang→checkout yang sudah ada, bukan checkout satu-item yang terisolasi

`CheckoutController::store()` membaca `Cart` per toko milik pembeli — bukan daftar item pilihan.
Membangun jalur "beli langsung" yang benar-benar terisolasi dari keranjang tersimpan (pola Shopee/Tokopedia)
berarti `CheckoutService` harus menerima subset item, bukan seluruh cart — perubahan yang menyentuh
alur uang yang sudah produksi, di luar skala "perbaikan frontside" yang diminta.

**Keputusan**: tombol "Beli" memanggil endpoint yang sama dengan "Keranjang" (`POST /cart/items`),
lalu begitu sukses langsung redirect ke `/checkout/{store.slug}` alih-alih diam di halaman produk.

**Trade-off yang harus disadari** (dan pemilik produk perlu setuju): kalau pembeli sudah punya item
lama di keranjang toko yang sama, "Beli" akan mengajak checkout **semua** isi keranjang toko itu, bukan
cuma item yang baru diklik. Ini bukan bug tersembunyi — halaman `/checkout/{store}` menampilkan ringkasan
lengkap isi keranjang sebelum pembeli membayar, jadi item lain terlihat jelas dan bisa dihapus dari sana
sebelum bayar. Untuk skala 1–3 toko dan katalog yang belum besar, kondisi "sudah ada item lama nyangkut"
akan jarang terjadi. Checkout satu-item terisolasi dicatat sebagai kerja lanjutan di §12.

### D47 — Stepper kuantitas ditambahkan di `ProductShow.tsx`

Konsekuensi alami dari dua tombol aksi: keduanya sekarang mengirim `quantity` yang bisa >1, jadi
kuantitas tidak boleh lagi hardcode `1`. Stepper (`-`/input angka/`+`) dengan clamp ke `stock` dan
minimum 1, konsisten dengan pola input kuantitas yang mestinya ada di sana sejak awal.

### D48 — Feedback "berhasil ditambahkan" datang dari transisi `cart.item_count`, bukan sistem toast baru

Karena tidak ada infrastruktur flash message yang benar-benar dipakai hari ini (lihat audit §1), dan
membangun satu untuk fase ini melebihi permintaan ("flow add to cart"). `FloatingCartButton` membaca
`item_count` lewat `usePage()`, membandingkannya dengan nilai sebelumnya lewat `useRef`, dan memutar
animasi *pop*/bounce singkat (CSS keyframe, hormat `prefers-reduced-motion`) setiap kali nilainya naik —
ini sudah menjawab "langsung muncul animated floating button" tanpa komponen toast terpisah. Toast umum
untuk seluruh aplikasi dicatat sebagai utang teknis di §12, bukan pekerjaan fase ini.

---

## 4. Skema database

Satu migration entitas + satu migration trigger (konvensi delete-tracking repo ini).

```php
// database/migrations/xxxx_create_featured_products_table.php
Schema::create('featured_products', function (Blueprint $table) {
    $table->id();

    // WAJIB ulid, bukan foreignId() — products.id adalah ULID (README D2).
    $table->ulid('product_id');
    $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();

    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->boolean('is_active')->default(true);
    $table->foreignId('created_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();

    $table->timestamps();

    $table->unique('product_id'); // satu produk cuma sekali terpasang
    $table->index(['is_active', 'sort_order']);
});
```

```php
// database/migrations/xxxx_create_featured_products_delete_tracking_trigger.php
// Pola sama persis dengan trigger store_badges di fase 6.
CREATE TRIGGER tr_featured_products_delete BEFORE DELETE ON featured_products ...
```

Tambahan di `config/store.php`:

```php
'max_homepage_highlights' => (int) env('STORE_MAX_HOMEPAGE_HIGHLIGHTS', 8),
```

---

## 5. Backend

### 5.1 Model

`app/Domains/Store/Models/FeaturedProduct.php` — `$fillable` untuk semua kolom editable, cast
`is_active` → bool, `scopeActive()`, `belongsTo(Product::class)`, `belongsTo(Admin::class, 'created_by_admin_id')`.

Registrasi observer di `AppServiceProvider::boot()` (wajib, tidak otomatis):

```php
FeaturedProduct::observe(DeletedItemObserver::class);
```

### 5.2 Query publik (beranda)

`Product::scopeActive()` **sudah ada** (`status = active` AND `store->publiclyVisible()`, lihat
`app/Domains/Store/Models/Product.php`) — dipakai langsung, tidak diduplikasi:

```php
// WelcomeController@index, tambahan di samping $upcomingEvents
$featuredProducts = FeaturedProduct::active()
    ->whereHas('product', fn ($q) => $q->active())
    ->with(['product.store:id,name,slug,logo_url', 'product.media'])
    ->orderBy('sort_order')
    ->limit(config('store.max_homepage_highlights'))
    ->get()
    ->pluck('product')
    ->filter() // jaga-jaga produk terhapus di antara query & render, meski FK cascadeOnDelete
    ->values();
```

Hasilnya dibatasi `max_homepage_highlights` (default 8) — aman sebagai prop Inertia, bukan pelanggaran
aturan "jangan kirim dataset besar" di `CLAUDE.md` (persis argumen yang sama seperti badge di fase 6 §6).

### 5.3 God-mode

Controller baru: `app/Domains/GodMode/Controllers/HomepageHighlightController.php`

```php
index()    // daftar entry + slot terpakai/tersedia
store()    // validasi product_id unik + belum melebihi config('store.max_homepage_highlights')
update()   // ubah sort_order / toggle is_active
destroy()  // lepas dari highlight (tidak menghapus produknya)
```

Route baru di grup `god-mode.auth`:

```php
Route::get('/homepage-highlights', [HomepageHighlightController::class, 'index'])->name('homepage-highlights.index');
Route::post('/homepage-highlights', [HomepageHighlightController::class, 'store'])->name('homepage-highlights.store');
Route::patch('/homepage-highlights/{id}', [HomepageHighlightController::class, 'update'])->name('homepage-highlights.update');
Route::delete('/homepage-highlights/{id}', [HomepageHighlightController::class, 'destroy'])->name('homepage-highlights.destroy');
```

Pemilihan produk memakai **endpoint yang sudah ada**, `GET /god-mode/api/products/search`
(`ProductSearchController`, dibuat untuk fase 8) — tidak perlu endpoint pencarian baru, tinggal dipakai
lewat `AsyncSelect` yang juga sudah ada.

### 5.4 `HandleInertiaRequests`

Tambahan `cart.item_count` per D44 (§3). Tidak ada perubahan lain pada shared props.

---

## 6. Frontend

### 6.1 Beranda — `Components/Store/FeaturedProductsSection.tsx`

Disisipkan di `Welcome.tsx` setelah section "Discover Your Network" dan sebelum `<UpcomingEvents/>` —
posisi ini menempatkan Store sejajar dengan modul-modul lain yang sudah dipromosikan di beranda, bukan
ditambahkan sebagai renungan di paling bawah.

- Ada highlight → grid kartu produk (gambar, nama, nama toko, harga, badge toko jika ada lewat
  `StoreBadgeList` yang sudah ada), tiap kartu tautan ke `/stores/{store.slug}/products/{product.slug}`.
- Tidak ada highlight tapi ada ≥1 toko publik → satu kartu ajakan generik ("Toko alumni sudah hadir —
  jelajahi produk pilihan") tautan ke `/stores`, tanpa query tambahan (cukup `Store::publiclyVisible()->exists()`
  yang murah).
- Tidak ada toko publik sama sekali → section tidak dirender. Beranda tidak boleh punya kotak kosong
  yang mempromosikan sesuatu yang belum ada.

### 6.2 Menu — `Components/Header.tsx`

Tambah satu link "Store" → `/stores` di tiga tempat yang sudah ada pola linknya: blok desktop
(baris ~48-67), blok mobile pengguna login (baris ~285-311), dan blok mobile pengguna tamu
(baris ~419-447). Diletakkan setelah "Events", sebelum "Baitul Maal" — mengikuti urutan modul di
navigasi god-mode (`Stores` juga ada tepat setelah `Events` di `GodModeLayout.tsx`).

### 6.3 `Pages/Store/ProductShow.tsx`

```tsx
const [qty, setQty] = useState(1);
// stepper: clamp(1, stock) — nonaktif kalau canAddToCart false

const addToCart = (redirectToCheckout: boolean) => {
  if (!auth.user) return router.visit("/login");
  setAdding(true);
  router.post("/cart/items",
    { product_id: product.id, product_variant_id: selectedVariant?.id ?? null, quantity: qty },
    {
      preserveScroll: true,
      onSuccess: () => redirectToCheckout && router.visit(`/checkout/${store.slug}`),
      onFinish: () => setAdding(false),
    }
  );
};
```

Dua tombol menggantikan yang lama: "Beli Sekarang" (filled, primer, memanggil `addToCart(true)`) dan
"+ Keranjang" (outlined, memanggil `addToCart(false)`) — bukan dua tombol setara secara visual,
"Beli" harus terasa sebagai jalur cepat yang disengaja, "Keranjang" sebagai aksi sekunder "kumpulkan
dulu". Keduanya `disabled={!canAddToCart || adding}`, sama seperti sekarang.

### 6.4 `Components/Store/FloatingCartButton.tsx` (baru)

```tsx
interface CartSharedProps extends PageProps { cart: { item_count: number } | null; }

export default function FloatingCartButton() {
  const { auth, cart, url } = usePage<CartSharedProps>().props; // `url` dari Inertia untuk cek path
  const prevCount = useRef(cart?.item_count ?? 0);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    const next = cart?.item_count ?? 0;
    if (next > prevCount.current) { setPulsing(true); /* clear via timeout */ }
    prevCount.current = next;
  }, [cart?.item_count]);

  const hiddenPaths = ["/cart", "/checkout"];
  if (!auth.user || !cart?.item_count || hiddenPaths.some((p) => url.startsWith(p))) return null;

  return (
    <Link href="/cart" className={`fixed bottom-6 right-6 z-40 ... ${pulsing ? "animate-cart-pop" : ""}`}>
      <span className="material-symbols-outlined">shopping_cart</span>
      <span className="badge">{cart.item_count}</span>
    </Link>
  );
}
```

Keyframe `animate-cart-pop` ditambahkan di `resources/css/app.css`, dibungkus
`@media (prefers-reduced-motion: no-preference)` — pengguna yang minta motion dikurangi tetap dapat
badge angka yang berubah, cuma tanpa animasi pop.

### 6.5 God-mode — `Pages/GodMode/HomepageHighlights/Index.tsx` (baru)

- `AsyncSelect` yang sudah ada, menembak `/god-mode/api/products/search`, untuk menambah produk baru
  ke daftar highlight.
- Daftar entry aktif: thumbnail, nama produk, nama toko, input `sort_order` (pola input angka polos +
  simpan saat blur, identik dengan `StoreBadges/Index.tsx`, bukan drag-and-drop baru), `ToggleSwitch`
  (komponen siap pakai) untuk `is_active`, tombol hapus.
- Penghitung slot "X/8 terpakai" yang terus terlihat; picker `AsyncSelect` dinonaktifkan begitu penuh.

Menu di `Layouts/GodModeLayout.tsx`, ditaruh setelah "Store Badges":

```ts
{ href: "/god-mode/homepage-highlights", label: "Homepage Highlights", icon: "auto_awesome" },
```

### 6.6 Tipe (`resources/js/types/index.d.ts`)

```ts
export interface FeaturedProduct {
  id: number;
  product_id: string;
  sort_order: number;
  is_active: boolean;
  product?: Product;
}

// di PageProps yang sudah ada:
cart?: { item_count: number } | null;
```

---

## 7. Ide UI/UX tambahan (opsional, di luar cakupan wajib fase ini)

Beberapa ide lanjutan yang muncul dari meninjau flow ini — dicatat supaya tidak hilang, **tidak**
masuk Definition of Done fase ini:

- **Preview mini keranjang**: klik floating cart button membuka panel ringkas (2-3 item terakhir +
  subtotal + tombol "Lihat Keranjang") alih-alih langsung pindah halaman ke `/cart`. Menaikkan
  kompleksitas state cukup banyak untuk manfaat yang belum terbukti dibutuhkan — layak dicoba setelah
  versi navigasi-langsung ini dipakai nyata oleh pengguna.
- **Quick view produk** dari kartu highlight di beranda (modal ringkas: gambar + harga + tombol
  keranjang) tanpa pindah halaman.
- **Pita "Baru"** pada produk yang dibuat dalam N hari terakhir di etalase toko.
- **Sistem toast umum** untuk seluruh aplikasi (bukan hanya cart) — akan menggantikan `with('success', …)`
  yang sekarang tidak pernah ditampilkan di mana pun (temuan audit §1). Ini utang teknis lama, bukan
  spesifik fase ini, tapi fase ini adalah tempat pertama yang benar-benar butuh feedback visual real-time.
- **Checkout satu-item terisolasi** untuk "Beli Sekarang" yang benar-benar tidak menyentuh cart
  tersimpan (menjawab trade-off D46 secara tuntas) — kerja backend yang lebih besar, cocok jadi fase
  tersendiri kalau volume transaksi menunjukkan trade-off saat ini jadi masalah nyata.

---

## 8. Interaksi dengan fase lain

| Fase | Interaksi |
| --- | --- |
| **1–3** | Prasyarat murni (tabel `stores`, `products`, `carts`/`cart_items`) — sudah ada, tidak diubah |
| **4–5** (pembayaran, fulfillment) | Tidak disentuh sama sekali; fase ini berhenti tepat di pintu masuk checkout (`/checkout/{store}`), tidak menyentuh `CheckoutService`/`SatuteraPaymentService` |
| **6** (badge toko) | `StoreBadgeList` dipakai apa adanya di kartu highlight beranda, tidak diubah |
| **7–9** | Tidak berpotongan berkas sama sekali (payment settings, integrasi event) |
| **README §3 D1** | `FeaturedProduct` masuk `app/Domains/Store/Models/`, `HomepageHighlightController` masuk `app/Domains/GodMode/Controllers/` — mengikuti pola yang sudah ada, bukan domain baru |

Fase ini bisa dikerjakan **kapan saja** — tidak ada fase lain yang menunggunya, dan dia sendiri hanya
menunggu fase 2 (katalog produk) yang sudah selesai lama.

---

## 9. Urutan pengerjaan

| Langkah | Isi | Risiko rilis |
| --- | --- | --- |
| **10a** | Migration `featured_products` + trigger, model, config, `HomepageHighlightController` + route + halaman god-mode, tambahan `cart.item_count` di `HandleInertiaRequests`. Belum ada perubahan yang terlihat pembeli. | Rendah — tabel baru aditif, satu query tambahan hanya untuk pengguna login |
| **10b** | `FeaturedProductsSection` di beranda, link "Store" di `Header.tsx`, redesain `ProductShow.tsx` (stepper + Beli/Keranjang), `FloatingCartButton` + pembungkus `app.tsx`. | Sedang — `app.tsx` adalah root render seluruh aplikasi; wajib uji manual semua kelompok halaman (publik, dashboard, god-mode, halaman toko) setelah perubahan, bukan cuma halaman Store |

Checklist per konvensi repo: `tasks/26-storefront-frontside-ux-progress.md`, dibuat sebelum baris kode
pertama, backend (10a) dulu baru frontend (10b).

---

## 10. Risiko

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Pembungkus `resolve()` di `app.tsx` salah menangkap halaman god-mode atau halaman auth | Panel admin atau halaman login tiba-tiba menampilkan tombol keranjang milik pengguna biasa | Guard eksplisit `name.startsWith("GodMode/")`; `FloatingCartButton` sendiri sudah mensyaratkan `auth.user` — admin login lewat guard `admin` terpisah, `auth.user` (guard `web`) selalu `null` di context god-mode, jadi lapis kedua otomatis menahan kebocoran |
| Query `cart.item_count` berjalan di **setiap** request Inertia untuk pengguna login | Beban tambahan di semua halaman, termasuk yang tidak berhubungan dengan Store | Satu `SUM` terindeks lewat FK `cart_items.cart_id`/`carts.user_id` yang sudah ada; verifikasi lewat Telescope bahwa ini tidak menjadi N+1 tersembunyi |
| "Beli" mengajak checkout item lama yang nyangkut di keranjang toko yang sama (D46) | Pembeli kaget total tagihan lebih besar dari yang diklik | Halaman checkout menampilkan ringkasan lengkap **sebelum** bayar (sudah ada); trade-off didokumentasikan eksplisit, bukan disembunyikan |
| Produk yang di-highlight dinonaktifkan/kehabisan stok/tokonya di-suspend admin, tapi entry `featured_products` masih `is_active` | Kartu di beranda menautkan ke produk yang sudah tidak valid | Query publik memakai `Product::scopeActive()` di titik baca (bukan cache lama) — produk yang tidak lagi lolos syarat otomatis hilang dari beranda tanpa job apa pun, persis pola badge kedaluwarsa di fase 6 |
| Admin bingung kenapa "tambah highlight" gagal saat slot penuh | Terlihat seperti bug | UI penghitung slot "X/8" selalu terlihat, picker dinonaktifkan + pesan jelas saat penuh (D43) |
| Animasi floating button mengganggu pengguna yang mengaktifkan "reduce motion" di OS | Aksesibilitas | Keyframe dibungkus `@media (prefers-reduced-motion: no-preference)`, badge angka tetap berubah tanpa animasi |

---

## 11. Definition of Done

- [ ] Migration `featured_products` + trigger delete-tracking sudah jalan; `FeaturedProduct` terdaftar
      di `AppServiceProvider` sebagai `DeletedItemObserver`.
- [ ] Admin bisa menambah/mengurutkan/menonaktifkan/menghapus highlight produk dari god-mode lewat
      pencarian lintas toko (`AsyncSelect` + `ProductSearchController` yang sudah ada), tanpa
      menembus batas `max_homepage_highlights`.
- [ ] Beranda menampilkan produk yang di-highlight, dengan fallback berjenjang (highlight → ajakan
      generik ke `/stores` → section tidak dirender) sesuai §6.1 — tidak pernah tampil kotak kosong.
- [ ] Link "Store" tampil di menu utama (desktop & mobile) untuk pengunjung yang **belum** login.
- [ ] `ProductShow.tsx` punya stepper kuantitas + tombol "Beli Sekarang" (→ checkout toko itu) dan
      "+ Keranjang" (tetap di halaman), keduanya menghormati `canAddToCart`/stok/varian yang sudah ada.
- [ ] Floating cart button muncul di semua halaman publik/dashboard begitu `cart.item_count > 0`,
      hilang saat kosong atau di `/cart`/`/checkout/*`, dan **tidak pernah** muncul di halaman
      `god-mode/*` atau untuk pengguna yang belum login.
- [ ] Badge angka di floating cart button ikut berubah otomatis setelah `POST /cart/items` tanpa
      reload manual oleh pengguna (dibawa oleh refresh shared-prop Inertia bawaan).
- [ ] `pnpm build` lolos tanpa error TypeScript; tidak ada `any` di kode baru.
- [ ] Uji manual: navigasi ke beberapa halaman non-Store (Dashboard, Directory, Event show, god-mode
      dashboard) setelah perubahan `app.tsx` — semuanya tetap render normal.

---

## 12. Di luar lingkup fase ini

- Highlight **toko** (bukan produk) — ditolak eksplisit di D41, relevan lagi kalau jumlah toko sudah
  cukup banyak untuk terasa seperti kurasi.
- Checkout "Beli Sekarang" yang terisolasi dari keranjang tersimpan — trade-off D46 diterima untuk
  sekarang, dicatat sebagai ide lanjutan di §7.
- Sistem toast/flash-message umum untuk seluruh aplikasi — §7, utang teknis yang sudah ada sebelum
  fase ini, bukan diciptakan olehnya.
- Preview mini keranjang, quick-view produk, pita "Baru" — §7.
- Kurasi otomatis (mis. berbasis penjualan) — tetap manual, konsisten dengan keputusan D15 fase 6
  untuk badge toko.
