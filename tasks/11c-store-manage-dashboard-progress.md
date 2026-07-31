# Task 11c: Dashboard Toko Terdedikasi

## Overview

Fase 11, Bagian C. Semua halaman `/my/stores/{store}/*` pindah ke satu `StoreManageLayout`
(sidebar persisten, meniru struktur `GodModeLayout` tapi tema terang situs) supaya berpindah dari
Produk ke Pesanan tidak perlu balik ke Ringkasan dulu. `ManageNav.tsx` (tab pil dalam satu halaman
Inertia) dihapus; Settings/Address/Members yang sebelumnya cuma cabang `if (tab === ...)` di
`Dashboard.tsx` jadi tiga route Inertia standalone. Dikerjakan sebelum Bagian B supaya kontrol
status order baru (B) punya tempat yang konsisten untuk ditaruh.

Keputusan desain: sidebar memakai bahasa visual terang yang sudah dipakai di seluruh halaman
Store lain (`bg-surface`, `bg-surface-container-lowest`, primary maroon, Material Symbols) —
bukan palet gelap ala god-mode — supaya konsisten dengan pengalaman pembeli/penjual yang sudah ada
di sekitar `StoreManageLayout`, bukan gaya visual baru.

## Backend

- [x] `GET /my/stores/{store}/settings` (`stores.settings`) → `StoreController::editSettings`
- [x] `GET /my/stores/{store}/address` (`stores.address.edit`) → `StoreController::editAddress`
- [x] `GET /my/stores/{store}/members` (`stores.members.index`) → `StoreMemberController::index` (owner-only guard di controller)
- [x] `StoreController::show()` (`stores.manage`) — tetap merender Ringkasan, tambah 5 pesanan terbaru

## Frontend

- [x] `Layouts/StoreManageLayout.tsx` baru — sidebar (Ringkasan/Produk/Pesanan/Pengiriman/Pesanan Event/Profil Toko/Alamat/Anggota-owner-only), tema terang
- [x] `Components/Store/ManageNav.tsx` — dihapus
- [x] `Pages/Store/Manage/Dashboard.tsx` — jadi halaman Ringkasan sungguhan: stat card + tabel 5 pesanan terbaru, dibungkus `StoreManageLayout`, tidak lagi merender tab pil/Settings/Address/Members inline
- [x] `Pages/Store/Manage/Settings.tsx` — jadi halaman standalone (`Head`, dibungkus layout), bukan komponen tab
- [x] `Pages/Store/Manage/Address.tsx` — sama
- [x] `Pages/Store/Manage/Members.tsx` — sama
- [x] `Pages/Store/Manage/Products/Index.tsx`, `Form.tsx` — dibungkus `StoreManageLayout`, berhenti render `Header`/`Footer` sendiri
- [x] `Pages/Store/Manage/Orders/Index.tsx`, `Show.tsx` — sama
- [x] `Pages/Store/Manage/ShippingMethods/Index.tsx`, `Form.tsx` — sama
- [x] `Pages/Store/Manage/EventReservations/Index.tsx` — sama

## Definition of Done

- [x] Semua halaman `/my/stores/{store}/*` memakai `StoreManageLayout` dengan sidebar yang sama
- [x] `ManageNav.tsx` dihapus, tidak ada dua lapis navigasi
- [x] Settings/Address/Members masing-masing halaman dengan URL sendiri
- [x] Halaman Ringkasan menampilkan 5 pesanan terbaru
- [x] `npm run build` lolos tanpa error TypeScript
