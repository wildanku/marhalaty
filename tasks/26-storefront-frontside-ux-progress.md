# Fase 10 — Beranda: Highlight Produk, Menu Store, dan Flow Keranjang

Ref: `docs/plan/mvp2/10-storefront-frontside-ux.md`

## Backend (10a)

- [x] Migration `featured_products`
- [x] Migration trigger delete-tracking `featured_products`
- [x] Config `store.max_homepage_highlights`
- [x] Model `FeaturedProduct`
- [x] Registrasi observer `DeletedItemObserver` di `AppServiceProvider`
- [x] `WelcomeController@index` — tambahan `featuredProducts` + `hasPubliclyVisibleStore`
- [x] Controller `GodMode\HomepageHighlightController` (index/store/update/destroy)
- [x] Route god-mode homepage-highlights
- [x] `HandleInertiaRequests` — tambahan `cart.item_count`

## Frontend (10b)

- [x] Komponen `Components/Store/FeaturedProductsSection.tsx`
- [x] Sisipkan section di `Welcome.tsx`
- [x] Link "Store" di `Header.tsx` (desktop, mobile login, mobile tamu)
- [x] `ProductShow.tsx` — stepper kuantitas + tombol "Beli Sekarang" / "+ Keranjang"
- [x] Komponen `Components/Store/FloatingCartButton.tsx` + keyframe `animate-cart-pop` di `app.css`
- [x] Pembungkus persistent layout di `resources/js/app.tsx`
- [x] Halaman god-mode `Pages/GodMode/HomepageHighlights/Index.tsx`
- [x] Menu sidebar `GodModeLayout.tsx`
- [x] Tipe `FeaturedProduct` + `cart` di `resources/js/types/index.d.ts`

## Verifikasi

- [x] `php artisan migrate` — dua migration baru jalan bersih
- [x] `vendor/bin/pint --dirty` — passed, tidak ada perubahan gaya
- [x] `npx tsc --noEmit` bersih, `npm run build` sukses
- [x] Smoke test lewat tinker: create/deactivate/delete `FeaturedProduct`, query publik `WelcomeController@index` (featuredProducts + hasPubliclyVisibleStore terisi benar), trigger delete-tracking tercatat di `deleted_items`
- [x] `composer test` — hijau kecuali 1 kegagalan pre-existing (`ExampleTest`, sqlite `:memory:` tanpa migrasi jalan), dikonfirmasi identik sebelum perubahan ini (`git stash` sebelum/sesudah)
- [ ] Cek manual di browser — **belum dilakukan**. Login admin god-mode di repo ini murni Google OAuth,
      sandbox ini tidak punya kredensial Google. Perlu dilakukan manual sebelum rilis: beranda (dengan
      & tanpa highlight), menu Store untuk pengunjung belum login, `ProductShow` stepper + dua tombol,
      floating cart button muncul/hilang sesuai state (termasuk animasi pop & `prefers-reduced-motion`),
      god-mode `/god-mode/homepage-highlights` CRUD + batas slot, dan navigasi ke halaman non-Store
      (Dashboard, Directory, Event show, god-mode dashboard) setelah perubahan `app.tsx`.

## Perbaikan UI lanjutan (2026-07-31, sesi kerja terpisah)

- [x] `StoreBadgeList.tsx` — kontras badge diperbaiki: solid `bg-{color}`/`text-on-{color}` (mis.
      "Official" jadi maroon solid + teks putih) menggantikan pasangan `*-container` yang buram
      (`primary-container` #8da382 vs `on-primary-container` #263920, ~4.6:1 dan visualnya kusam di
      badge kecil). Ditambah `font-semibold` + `shadow-sm` untuk keterbacaan.
- [x] `ProductShow.tsx` — tombol "Beli Sekarang"/"Keranjang" pindah ke fixed bottom bar khusus mobile
      (`sm:hidden`, `env(safe-area-inset-bottom)`-aware); versi inline disembunyikan di bawah `sm`
      (`hidden sm:flex`) supaya tidak dobel. Wrapper halaman dapat `pb-28` di mobile agar konten
      terakhir tidak ketutup bar.
- [x] `FloatingCartButton.tsx` — deteksi route `/stores/*/products/*` (`isProductPage`) dan naikkan
      posisi (`bottom-24` bukannya `bottom-6`) khusus di breakpoint mobile pada halaman itu saja,
      supaya tidak bertabrakan dengan bottom bar baru di atas.
- [x] `npx tsc --noEmit`, `npm run build`, `npx prettier --check` (setelah `--write` pada
      `StoreBadgeList.tsx`) — semua bersih.
- [ ] Cek manual di browser (mobile viewport) — belum dilakukan, sandbox tanpa akses login Google.
