# Fase 11 — Catatan per Produk, Manajemen Status Pesanan, dan Dashboard Toko Terdedikasi

Prasyarat: [Fase 5](./5-fulfillment-and-admin.md) selesai (order lifecycle, `OrderFulfillmentService`,
panel god-mode dasar sudah ada). Tidak bergantung pada fase 6–10.

## 0. Latar belakang

Tiga permintaan terpisah, tapi ketiganya menyentuh area yang sama (`StoreOrder` + panel
admin-store/god-mode) sehingga digabung jadi satu fase:

1. Saat checkout, pembeli hanya bisa mengisi **satu** catatan untuk seluruh order
   (`buyer_note` di `store_orders`, kolom "Catatan untuk Penjual" di `Checkout.tsx`). Tidak ada
   tempat untuk catatan per produk (mis. permintaan ukuran, warna, personalisasi khusus per item).
   Catatan itu pun ternyata **tidak ditampilkan sama sekali** di `Store/Manage/Orders/Show.tsx` —
   sudah tersimpan di database tapi hilang di UI penjual. Ini bug kecil yang ikut diperbaiki di
   fase ini, bukan cuma fitur baru.
2. Perubahan status order hari ini sengaja dibuat sempit: `OrderFulfillmentService` cuma
   mengizinkan `paid → processing → shipped → completed` (dan `paid`/`processing → cancelled`) —
   lihat peta `VALID_TRANSITIONS`-nya. Ini benar untuk alur normal, tapi tidak ada jalur koreksi
   manual kalau pembayaran di luar sistem (transfer langsung ke penjual di luar checkout, webhook
   gagal, dsb). Dan **god-mode sama sekali tidak bisa mengubah status order** — `GodMode\
   StoreOrderController` murni read-only (index/show/export).
3. `/my/stores/{store}/orders` (manage order) **sudah ada** — backend (`StoreOrderManagement
   Controller`) dan frontend (`Pages/Store/Manage/Orders/{Index,Show}.tsx`) sudah jalan, dan sudah
   ditautkan dari kartu "Pesanan Masuk" di `Store/Manage/Dashboard.tsx`. Yang hilang bukan
   fiturnya, tapi **navigasinya**: `Dashboard.tsx` memakai tab pil (`ManageNav`, cuma 4 tab:
   Ringkasan/Profil/Alamat/Anggota) yang hidup di satu halaman Inertia, sedangkan Produk, Pesanan,
   Pengiriman, dan Pesanan Event masing-masing adalah route Inertia terpisah yang me-render
   `Header`/`Footer` sendiri-sendiri tanpa nav bersama. Begitu masuk ke "Kelola Produk", satu-
   satunya cara ke "Kelola Pesanan" adalah balik ke Ringkasan dulu. Ini yang bikin fiturnya terasa
   "tidak ketemu" — sesuai laporan.

Bagian A, B, dan C tidak saling bergantung secara teknis (beda tabel, beda controller), jadi bisa
dikerjakan dan dirilis sebagai tiga langkah terpisah — konsisten dengan konvensi `/tasks/` di
`CLAUDE.md` (checklist per unit kerja): `11a-checkout-item-notes-progress.md`,
`11b-order-status-management-progress.md`, `11c-store-manage-dashboard-progress.md`. Urutan yang
disarankan: **A → C → B** — dashboard (C) lebih baik ada dulu sebelum menambah kontrol status baru
(B) supaya kontrol itu punya tempat yang konsisten untuk ditaruh, dan A tidak menyentuh apa pun di
B/C sehingga aman dikerjakan kapan saja lebih dulu.

---

## 1. Bagian A — Catatan per produk saat checkout

### A.1 Skema data

```php
// Migration baru: add_note_to_cart_items_table
Schema::table('cart_items', function (Blueprint $table) {
    $table->string('note', 250)->nullable()->after('quantity');
});

// Migration baru: add_note_snapshot_to_store_order_items_table
Schema::table('store_order_items', function (Blueprint $table) {
    $table->string('note_snapshot', 250)->nullable()->after('variant_label_snapshot');
});
```

Catatan disimpan di level **item**, bukan tabel terpisah — konsisten dengan pola snapshot yang
sudah dipakai (`name_snapshot`, `sku_snapshot`, dst di `store_order_items`). Batas 250 karakter
cukup untuk instruksi singkat dan mencegah penyalahgunaan sebagai kolom teks bebas panjang.

### D49 — Catatan disalin sebagai snapshot saat checkout, bukan dibaca ulang dari `cart_items`

`CheckoutService::lockAndValidateItems()` sudah membangun array snapshot per item dari `cart_items`
yang dikunci (`lockForUpdate()`). Field `note` cukup ditambahkan ke array itu dan disalin ke
`note_snapshot`. Ini menjaga sifat "presisi tersimpan" yang diminta: begitu order dibuat, teks
catatan membeku persis seperti yang dilihat pembeli saat menekan bayar, tidak berubah lagi
meskipun pembeli mengedit cart-nya lagi setelah itu (cart sudah dikosongkan setelah checkout, tapi
ini juga menutup celah race condition kalau suatu saat cart bisa dipakai ulang).

### A.2 Backend

- `CartItem::$fillable` — tambah `'note'`.
- `CartController::updateQty()` — perluas untuk juga menerima `note` opsional dalam request yang
  sama (`PATCH /cart/items/{id}`), supaya tidak perlu endpoint baru:
  ```php
  $validated = $request->validate([
      'quantity' => 'required|integer|min:0|max:99',
      'note' => 'nullable|string|max:250',
  ]);
  $this->cartService->updateQty($item, $validated['quantity'], $validated['note'] ?? null);
  ```
  `CartService::updateQty()` menambah parameter `?string $note = null` dan
  `$item->update(['quantity' => ..., 'note' => $note])`.
- `CheckoutService::lockAndValidateItems()` — tambah `'note_snapshot' => $cartItem->note` ke array
  `$itemsData` yang sudah dibangun per item.
- `StoreOrderItem::$fillable` — tambah `'note_snapshot'`.

### A.3 Frontend

- `Pages/Store/Cart.tsx` — tiap baris item dapat input teks kecil "Catatan untuk produk ini
  (opsional)" di bawah stepper kuantitas, dengan counter karakter (`0/250`), auto-save `onBlur`
  lewat `router.patch('/cart/items/{id}', { quantity, note })` (`preserveScroll: true`, tidak
  reload seluruh halaman).
- `Pages/Store/Checkout.tsx` — daftar item di ringkasan order menampilkan catatan per produk
  (read-only, italic, di bawah nama produk) berdampingan dengan kolom "Catatan untuk Penjual" yang
  sudah ada (yang tetap dipertahankan sebagai catatan level-order, mis. instruksi pengiriman
  umum). Dua hal ini punya tujuan berbeda dan keduanya dipertahankan.
- `Pages/Store/Manage/Orders/Show.tsx` — **perbaikan bug** + fitur baru: render `order.buyer_note`
  (yang sekarang tidak muncul sama sekali) di bagian atas, dan `item.note_snapshot` di tiap baris
  item pesanan.
- `Pages/GodMode/StoreOrders/Show.tsx` — sama: tampilkan `buyer_note` dan `note_snapshot` per item.
- `Pages/Store/Orders/Show.tsx` (riwayat pesanan pembeli sendiri) — tampilkan catatan yang mereka
  tulis, supaya pembeli juga bisa mengecek apa yang mereka minta.
- Tipe `CartItem` dan `StoreOrderItem` di `resources/js/types/index.d.ts` — tambah field
  `note?: string | null` / `note_snapshot?: string | null`.

Ekspor Excel (`StoreOrdersExport`) **tidak** diubah di fase ini (kolom per-item tidak cocok dengan
bentuk baris-per-order yang dipakai sekarang) — dicatat di §6 sebagai backlog opsional.

---

## 2. Bagian B — Manajemen status pembayaran & status pesanan

### B.1 Dua konsep yang perlu tetap dipisah

- **Status pesanan** (`store_orders.status`): siklus fulfillment — `pending_payment`, `paid`,
  `processing`, `shipped`, `completed`, `cancelled`, `expired`, `refunded`.
- **Status pembayaran** (`transactions.status` milik `latestTransaction()`): siklus uang —
  `pending`, `paid`, `failed`, `expired`, `cancelled`.

Keduanya **tidak digabung jadi satu kolom** — itu akan meniadakan properti idempoten yang sudah
dibangun di fase 4/5 (webhook Satutera, retry, `OrderFulfillmentService`). Yang diminta user
("atur status pembayaran dan status order... pending, cancel, paid, diproses, dikirim, selesai")
dipetakan begini di UI:

- Enam status yang disebut user **adalah** nilai `store_orders.status` (pending → `pending_
  payment`, cancel → `cancelled`, lalu `paid`/`processing`/`shipped`/`completed` apa adanya). Ini
  jadi kontrol utama: **"Ubah Status Pesanan"**, tersedia di admin-store dan god-mode.
- Di sebelahnya, **badge status pembayaran** (read-only) menampilkan `latestTransaction()->status`
  apa adanya — supaya admin tetap bisa lihat state pembayaran mentah (mis. order `cancelled` tapi
  transaksinya ternyata `paid` — sinyal ada yang perlu ditelusuri manual) tanpa perlu bisa
  mengubahnya lewat kontrol terpisah. Perubahan status pembayaran manual-transfer (approve/reject
  bukti) **tetap** lewat `/god-mode/payments` yang sudah ada — tidak diduplikasi di sini.

### D50 — Satu aksi "override" eksplisit, terpisah dari transisi otomatis yang sudah ketat

`OrderFulfillmentService::VALID_TRANSITIONS` dan method `markProcessing/markShipped/markCompleted/
cancel` yang sudah ada **tidak diubah** — itu tetap jalur normal yang dipicu tombol aksi spesifik
(pola yang sama seperti sekarang). Ditambahkan satu method baru, `overrideStatus()`, yang dipakai
**hanya** oleh kontrol admin manual (dropdown "Ubah Status Pesanan"), dengan matriks transisi yang
sengaja lebih longgar tapi tetap eksplisit — bukan `update(['status' => $request->status])` mentah:

```php
private const OVERRIDE_TRANSITIONS = [
    // dari => [tujuan yang diizinkan lewat override manual]
    'pending_payment' => ['paid', 'cancelled'],
    'paid' => ['processing', 'shipped', 'completed', 'cancelled'],
    'processing' => ['shipped', 'completed', 'cancelled'],
    'shipped' => ['completed'],
    'cancelled' => ['pending_payment'], // "buka lagi" — lihat D51, dibatasi god-mode saja
    'expired' => ['pending_payment'],   // sama
];
```

```php
public function overrideStatus(StoreOrder $order, string $to, string $reason, string $actorType, int|string $actorId): StoreOrder
{
    return DB::transaction(function () use ($order, $to, $reason, $actorType, $actorId) {
        $locked = StoreOrder::where('id', $order->id)->lockForUpdate()->firstOrFail();
        $from = $locked->status;
        $allowed = self::OVERRIDE_TRANSITIONS[$from] ?? [];

        throw_unless(in_array($to, $allowed, true), ValidationException::withMessages([
            'status' => "Status tidak bisa dipindahkan dari \"{$from}\" ke \"{$to}\".",
        ]));

        $extra = match ($to) {
            'paid' => ['paid_at' => now()],
            'shipped' => ['shipped_at' => now()],
            'completed' => ['completed_at' => now()],
            'cancelled' => ['cancelled_at' => now(), 'cancellation_reason' => $reason],
            'pending_payment' => ['expires_at' => now()->addMinutes((int) config('store.order_expiry_minutes'))],
            default => [],
        };

        $locked->update(array_merge(['status' => $to], $extra));

        // Efek samping mengikuti transisi yang sama seperti jalur otomatis — supaya tidak ada
        // dua definisi "apa yang terjadi saat order jadi X".
        match (true) {
            $to === 'paid' => $this->syncTransactionPaid($locked) && $this->onPaid($locked->fresh(['buyer', 'store.owner', 'items'])),
            $to === 'cancelled' => $this->releaseStock($locked) && $this->voidPendingTransaction($locked),
            $to === 'shipped' => SendStoreOrderShippedEmail::dispatch($locked->fresh(['buyer', 'store'])) && true,
            default => true,
        };

        StoreOrderStatusHistory::create([
            'store_order_id' => $locked->id,
            'from_status' => $from,
            'to_status' => $to,
            'reason' => $reason,
            'actor_type' => $actorType, // 'store_member' | 'admin'
            'actor_id' => $actorId,
        ]);

        return $locked->fresh();
    });
}
```

(`syncTransactionPaid()`/`voidPendingTransaction()` adalah helper kecil baru: yang pertama
menandai `latestTransaction()` jadi `paid`/`paid_at` kalau masih `pending` sebelum memanggil
`onPaid()`; yang kedua menandai transaksi `pending` jadi `cancelled` supaya webhook yang telat
tidak lagi punya baris `pending` untuk diproses ulang — lihat risiko race condition di §6.)

### D51 — "Buka lagi" (`cancelled`/`expired` → `pending_payment`) dibatasi god-mode saja

Ini transisi paling berisiko: order yang sudah `cancelled` sudah melepas stoknya
(`stock_released_at` terisi); membukanya lagi berarti perlu mengunci ulang stok, dan kalau stok
sudah habis dipakai order lain, tidak bisa serta-merta "dibuka" tanpa mengecek ulang ketersediaan.
Trade-off yang diambil: transisi ini **hanya** muncul di kontrol god-mode, tidak di admin-store,
dan `overrideStatus()` untuk kasus ini **tidak** mengunci ulang stok otomatis — hanya mengubah
status + `expires_at` baru, dengan peringatan eksplisit di UI ("Stok TIDAK otomatis dikunci ulang —
verifikasi manual sebelum membuka order ini"). Kalau nanti kebutuhan ini ternyata sering dipakai,
layak jadi fase tersendiri dengan pengecekan stok penuh.

### B.2 Tabel audit `store_order_status_histories`

```php
Schema::create('store_order_status_histories', function (Blueprint $table) {
    $table->id();
    $table->foreignUlid('store_order_id')->constrained('store_orders')->cascadeOnDelete();
    $table->string('from_status', 20);
    $table->string('to_status', 20);
    $table->text('reason')->nullable();
    $table->enum('actor_type', ['store_member', 'admin']);
    $table->unsignedBigInteger('actor_id'); // users.id (store_member) atau admins.id
    $table->timestamps();
});
```

Kenapa tabel baru, bukan cuma menambah kolom `admin_activity_logs`: `admin_activity_logs` hanya
mencatat aksi guard `admin` (god-mode), sementara perubahan status oleh **anggota toko**
(admin-store) juga perlu tercatat, dan lebih enak ditampilkan sebagai satu timeline di halaman
detail order (`Store/Manage/Orders/Show.tsx` dan `GodMode/StoreOrders/Show.tsx`) daripada digabung
ke log admin yang formatnya generik. Aksi god-mode **tetap juga** menulis ke `AdminActivityLog`
seperti modul lain (`admin_activity_logs`), sesuai konvensi — jadi dobel-tercatat: sekali di
timeline order (dua-duanya), sekali lagi di log admin global (khusus god-mode).

Trigger delete-tracking + observer **tidak** diperlukan untuk tabel ini — baris di sini tidak
pernah dihapus (audit log append-only), jadi tidak perlu masuk daftar `DeletedItemObserver`.

### B.3 Backend — endpoint baru

Admin-store (`routes/web.php`, grup `/my/stores/{store}` yang sudah ada):

```php
Route::patch('/{store}/orders/{order}/status', [StoreOrderManagementController::class, 'updateStatus'])
    ->name('orders.status.update');
```

```php
public function updateStatus(Request $request, Store $store, StoreOrder $order)
{
    $this->authorize('manageOrders', $store);
    abort_unless($order->store_id === $store->id, 404);

    $validated = $request->validate([
        'status' => ['required', Rule::in(['paid', 'processing', 'shipped', 'completed', 'cancelled'])],
        'reason' => 'nullable|string|max:500',
        'tracking_number' => 'required_if:status,shipped|nullable|string|max:100',
    ]);

    if (($validated['status'] ?? null) === 'pending_payment') {
        abort(403); // "buka lagi" hanya lewat god-mode — lihat D51
    }

    // ...isi tracking_number dulu kalau ada, lalu panggil $this->fulfillment->overrideStatus(...)
}
```

God-mode (`routes/web.php`, grup `god-mode.auth`):

```php
Route::patch('/store-orders/{id}/status', [App\Domains\GodMode\Controllers\StoreOrderController::class, 'updateStatus'])
    ->name('store-orders.status.update');
```

Sama isinya, tapi `Rule::in([...6 status semua termasuk pending_payment])`, dan tiap panggilan
sukses juga menulis `AdminActivityLog::record(...)` (pola yang sudah dipakai
`AdminManagementController` dkk).

### B.4 Frontend

- Komponen baru `Components/Store/OrderStatusControl.tsx` dipakai bersama oleh
  `Store/Manage/Orders/Show.tsx` dan `GodMode/StoreOrders/Show.tsx` — dropdown status + textarea
  alasan (wajib untuk `cancelled`, opsional untuk lainnya) + input nomor resi kalau target
  `shipped`. Props `allowReopen?: boolean` mengontrol apakah opsi "Buka Lagi ke Pending" muncul
  (`true` hanya di halaman god-mode, per D51).
- Timeline riwayat status (`store_order_status_histories`, terbaru di atas) dirender di bawah
  detail item, di kedua halaman.
- `StatusBadge.tsx` sudah punya semua label/warna yang dibutuhkan (`pending_payment`, `paid`,
  `processing`, `shipped`, `completed`, `cancelled`) — tidak perlu perubahan.

---

## 3. Bagian C — Dashboard toko terdedikasi

### D52 — `StoreManageLayout.tsx` baru, menggantikan tab pil + Header/Footer duplikat

Dibuat `resources/js/Layouts/StoreManageLayout.tsx`, meniru struktur `GodModeLayout.tsx` (sidebar
tetap + top bar + area konten) tapi memakai tema terang situs (bukan tema gelap god-mode) supaya
konsisten dengan sisa pengalaman pembeli/penjual:

```tsx
interface StoreManageLayoutProps {
  store: Store;
  role: "owner" | "admin" | null;
  activeNav: "dashboard" | "products" | "orders" | "shipping" | "event-reservations" | "settings" | "address" | "members";
  children: ReactNode;
}

const navItems = (storeId: string, isOwner: boolean) => [
  { key: "dashboard", href: `/my/stores/${storeId}`, label: "Ringkasan", icon: "space_dashboard" },
  { key: "products", href: `/my/stores/${storeId}/products`, label: "Produk", icon: "inventory_2" },
  { key: "orders", href: `/my/stores/${storeId}/orders`, label: "Pesanan", icon: "receipt_long" },
  { key: "shipping", href: `/my/stores/${storeId}/shipping-methods`, label: "Pengiriman", icon: "local_shipping" },
  { key: "event-reservations", href: `/my/stores/${storeId}/event-reservations`, label: "Pesanan Event", icon: "event" },
  { key: "settings", href: `/my/stores/${storeId}/settings`, label: "Profil Toko", icon: "storefront" },
  { key: "address", href: `/my/stores/${storeId}/address`, label: "Alamat", icon: "location_on" },
  ...(isOwner ? [{ key: "members", href: `/my/stores/${storeId}/members`, label: "Anggota", icon: "group" }] : []),
];
```

Semua halaman kelola toko (Products/Index, Products/Form, Orders/Index, Orders/Show,
ShippingMethods/Index, ShippingMethods/Form, EventReservations/Index, dan tiga tab lama) dibungkus
`<StoreManageLayout store={store} role={role} activeNav="...">...</StoreManageLayout>` dan berhenti
mengimpor `Header`/`Footer` sendiri-sendiri.

### D53 — `Dashboard.tsx` dipecah: tab pil dibuang, tiga tab jadi route sendiri

`ManageNav.tsx` (pola tab pil) **dihapus**, bukan dipertahankan berdampingan dengan sidebar baru —
dua lapis navigasi untuk hal yang sama akan membingungkan. Konten `settings`/`address`/`members`
yang sekarang cuma `if (tab === ...)` di satu file, dipecah jadi tiga halaman Inertia:

| Route baru | Controller | Halaman |
| --- | --- | --- |
| `GET /my/stores/{store}/settings` (`stores.settings`) | `StoreController::editSettings` | `Store/Manage/Settings.tsx` (standalone, `PATCH /my/stores/{store}` yang sudah ada tetap dipakai untuk simpan) |
| `GET /my/stores/{store}/address` (`stores.address.edit`) | `StoreController::editAddress` | `Store/Manage/Address.tsx` (standalone, `POST .../address` yang sudah ada tetap dipakai) |
| `GET /my/stores/{store}/members` (`stores.members.index`) | `StoreMemberController::index` | `Store/Manage/Members.tsx` (standalone, owner-only — guard di controller, bukan cuma disembunyikan di UI) |

`GET /my/stores/{store}` (`stores.manage`, sudah ada) menjadi **halaman Ringkasan sungguhan**,
bukan cuma 4 kartu tautan: stat card Produk/Pesanan/Pengiriman seperti sekarang, **ditambah**
tabel 5 pesanan terbaru (status + total + waktu, link ke masing-masing) supaya ringkasan benar-
benar berguna sebagai halaman pertama yang dilihat penjual.

### C.1 Kenapa bukan cuma "tambah link" ke Dashboard yang ada

Sudah dicek: kartu "Pesanan Masuk" yang menautkan ke `/my/stores/{store}/orders` **sudah ada** di
`Dashboard.tsx` saat ini (baris ~82). Menambah lebih banyak kartu tidak menyelesaikan masalah
sebenarnya — begitu pengguna klik masuk ke Produk atau Pesanan, mereka terjebak di halaman itu
tanpa jalan pulang selain tombol back browser. Perbaikan yang diminta ("dashboard toko terdedikasi
yang bisa mengatur toko, produk, dan pesanan") berarti *chrome* navigasi yang persisten di semua
halaman kelola toko — itulah yang dikerjakan D52/D53, bukan penambahan kartu lagi.

---

## 4. Peta data tambahan (ringkas)

| Tabel/kolom | Perubahan |
| --- | --- |
| `cart_items.note` | Baru — string(250) nullable |
| `store_order_items.note_snapshot` | Baru — string(250) nullable |
| `store_order_status_histories` | Tabel baru — audit setiap perubahan status manual |
| Tidak ada perubahan pada `store_orders.status` enum atau `transactions.status` enum | Nilai target override (`paid/processing/shipped/completed/cancelled/pending_payment`) semuanya sudah ada di enum `store_orders.status` |

---

## 5. Rute baru/berubah (ringkas)

```
PATCH /my/stores/{store}/orders/{order}/status   → orders.status.update      (admin-store, tanpa "buka lagi")
PATCH /god-mode/store-orders/{id}/status         → store-orders.status.update (god-mode, termasuk "buka lagi")

GET /my/stores/{store}/settings   → stores.settings
GET /my/stores/{store}/address    → stores.address.edit
GET /my/stores/{store}/members    → stores.members.index
```

`PATCH /cart/items/{id}` (nama rute sama, `cart.items.update`) — payload bertambah field `note`
opsional, tidak ada rute baru.

---

## 6. Risiko yang perlu diperhatikan saat implementasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Override manual ke `paid`, lalu webhook Satutera yang telat datang untuk transaksi yang sama | `onPaid()` bisa terpanggil dua kali (dobel email/dobel Telegram notif) | `voidPendingTransaction()`/`syncTransactionPaid()` menandai transaksi selesai sebelum override; webhook handler (`SatuteraWebhookController`) **harus** dicek ulang saat implementasi — pastikan ia menolak transaksi yang statusnya sudah bukan `pending` sebelum memproses (kalau belum ada guard ini, tambahkan) |
| Override cancel dari `pending_payment` melepas stok yang mungkin belum pernah dikunci ulang oleh proses lain | Stok "muncul dua kali" kalau digabung dengan alur lain | `releaseStock()` sudah idempoten lewat `stock_released_at` — dipakai apa adanya, tidak perlu logika baru |
| "Buka lagi" (D51) tidak mengunci ulang stok | Order dibuka tapi produknya sudah terjual ke pembeli lain lewat order berbeda | Dibatasi god-mode saja + peringatan UI eksplisit; evaluasi ulang kalau ternyata sering dipakai (lihat §8) |
| Reason wajib untuk `cancelled` tapi opsional untuk transisi lain | Admin lupa isi alasan pembatalan | Validasi `required_if:status,cancelled` di kedua controller |
| Catatan per produk (250 char) disalahgunakan sebagai form request panjang | Data kotor, potensi XSS kalau dirender tanpa escape | Batas panjang di migration + validasi; React sudah escape teks secara default, jangan pakai `dangerouslySetInnerHTML` untuk field ini |

---

## 7. Definition of Done

**Bagian A — Catatan per produk**
- [ ] Pembeli bisa menulis catatan per item di halaman Cart, tersimpan lewat auto-save.
- [ ] Catatan per item tersalin presisi ke `note_snapshot` saat checkout dan tidak berubah lagi setelahnya.
- [ ] `buyer_note` (catatan level-order) dan `note_snapshot` (per item) tampil di `Store/Manage/Orders/Show.tsx`, `GodMode/StoreOrders/Show.tsx`, dan `Store/Orders/Show.tsx`.

**Bagian B — Status pembayaran & status pesanan**
- [ ] Admin-store bisa mengubah status order ke `paid/processing/shipped/completed/cancelled` dari `Orders/Show.tsx`, sesuai matriks `OVERRIDE_TRANSITIONS`.
- [ ] God-mode bisa melakukan hal yang sama, ditambah "buka lagi" ke `pending_payment` dari `cancelled`/`expired`.
- [ ] Transisi yang tidak ada di matriks ditolak server (uji: coba `pending_payment → shipped` langsung, harus gagal).
- [ ] Override ke `paid` memicu `onPaid()` (email, digital delivery, Telegram) persis seperti jalur webhook.
- [ ] Override ke `cancelled` melepas stok dan tidak melepas dua kali untuk order yang sama.
- [ ] Setiap perubahan status manual tercatat di `store_order_status_histories`; aksi god-mode juga tercatat di `admin_activity_logs`.
- [ ] Badge status pembayaran (dari `latestTransaction()->status`) tampil read-only di kedua halaman detail order.

**Bagian C — Dashboard toko terdedikasi**
- [ ] Semua halaman `/my/stores/{store}/*` memakai `StoreManageLayout` dengan sidebar yang sama; berpindah dari Produk ke Pesanan tidak perlu balik ke Ringkasan dulu.
- [ ] `ManageNav.tsx` (tab pil lama) dihapus, tidak ada dua lapis navigasi yang tumpang tindih.
- [ ] Settings/Address/Members masing-masing jadi halaman dengan URL sendiri, bisa di-bookmark/refresh langsung.
- [ ] Halaman Ringkasan menampilkan 5 pesanan terbaru, bukan cuma kartu tautan.
- [ ] `pnpm build` lolos tanpa error TypeScript.

---

## 8. Setelah MVP 2 (backlog)

- Pengecekan ketersediaan stok penuh saat "buka lagi" (D51), supaya bisa dibuka juga dari
  admin-store, bukan cuma god-mode.
- Kolom catatan per-item dan riwayat status ikut di ekspor Excel (`StoreOrdersExport`).
- Notifikasi email/Telegram khusus untuk perubahan status manual ("status diperbarui oleh admin"),
  terpisah dari notifikasi jalur otomatis, supaya pembeli tahu perubahan itu bukan dari sistem.
- Store switcher di `StoreManageLayout` untuk pengguna yang mengelola lebih dari satu toko
  (saat ini cukup diarahkan balik ke `/my/stores`).
