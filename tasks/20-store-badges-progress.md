# Fase 6 — Badge Toko

Ref: `docs/plan/mvp2/6-store-badges.md`

## Backend

- [x] Migration `store_badges`
- [x] Migration `store_badge_assignments`
- [x] Migration trigger delete-tracking untuk kedua tabel
- [x] Config `store.badge_icons` & `store.badge_colors` (disesuaikan ke token M3 nyata: primary/secondary/tertiary/error/neutral)
- [x] Model `StoreBadge`
- [x] Model `StoreBadgeAssignment`
- [x] Relasi `Store::badges()` & `Store::activeBadges()`
- [x] Registrasi observer `DeletedItemObserver` di `AppServiceProvider`
- [x] Seeder `StoreBadgeSeeder` (Official, Top Seller, Trusted) + daftarkan di `DatabaseSeeder`
- [x] Action `AssignStoreBadge`
- [x] Action `RevokeStoreBadge`
- [x] Controller `GodMode\StoreBadgeController` (index/store/update/destroy/assign/revoke) — validasi inline mengikuti konvensi GodMode (bukan Form Request; repo ini tidak pernah pakai FormRequest di controller god-mode)
- [x] Route god-mode: katalog badge + assign/revoke per toko
- [x] Migrate & smoke test lewat tinker (create/update/assign/destroy-terblokir/revoke/destroy/expiry, semua benar; `admin_activity_logs` tercatat)

## Frontend

- [x] Tipe `StoreBadgeSummary` + `active_badges`/`badges` di `Store` (`resources/js/types/index.d.ts`)
- [x] Komponen `Components/Store/StoreBadgeList.tsx`
- [x] Halaman god-mode `Pages/GodMode/StoreBadges/Index.tsx` (katalog CRUD, pola modal mengikuti `Consulates/Index.tsx`)
- [x] Panel assign/revoke badge di `Pages/GodMode/Stores/Show.tsx`
- [x] Menu sidebar `GodModeLayout.tsx`
- [x] Tampilkan badge di `Pages/Store/Directory.tsx`
- [x] Tampilkan badge di `Pages/Store/Show.tsx`
- [x] Tampilkan badge di `Pages/Store/ProductShow.tsx`
- [x] Tampilkan badge di `Pages/Store/Checkout.tsx`
- [x] Tampilkan badge (read-only) di `Pages/Store/MyStores.tsx`
- [x] Eager-load `activeBadges` di semua controller yang menampilkan (`StoreDirectoryController` index/show/productShow, `CheckoutController`, `StoreApplicationController`, `GodMode\StoreController` index); `show()` god-mode pakai `badges` (semua, termasuk kedaluwarsa) supaya admin bisa melihat riwayat

## Verifikasi

- [x] `php artisan test` — hijau kecuali 1 kegagalan pre-existing (`ExampleTest`, sqlite `:memory:` tanpa migrasi jalan) yang dikonfirmasi sudah ada sebelum perubahan ini (`git stash` sebelum/sesudah)
- [x] `pnpm build` lolos tanpa error; `npx tsc --noEmit` bersih
- [x] `vendor/bin/pint --dirty` — passed, tidak ada perubahan gaya
- [x] Cek manual via tinker: admin buat badge baru, assign ke toko (dengan `expires_at`), badge tampil di `activeBadges`, expire otomatis hilang dari `activeBadges` tapi tetap ada di `badges` (riwayat), revoke bekerja, hapus badge yang masih terpasang ditolak dengan pesan jelas, hapus setelah revoke berhasil
- [ ] Cek manual di browser — **belum dilakukan**. Login admin god-mode di repo ini murni Google OAuth (`AuthController`, tidak ada jalur password/lokal), dan sandbox ini tidak punya kredensial Google. Perlu dilakukan manual oleh yang punya akses sebelum rilis: buka `/god-mode/store-badges`, buka `/god-mode/stores/{id}`, dan cek tampilan chip di `/stores`, `/stores/{slug}`, checkout, di kedua mode terang/gelap.
