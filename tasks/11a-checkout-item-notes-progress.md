# Task 11a: Catatan per Produk saat Checkout

## Overview

Fase 11 (`docs/plan/mvp2/11-order-notes-status-and-store-dashboard.md`), Bagian A. Pembeli bisa
menulis catatan per item di Cart (bukan cuma satu catatan per-order), catatan itu disalin sebagai
snapshot (`note_snapshot`) saat checkout, dan `buyer_note` (order-level, sudah ada) +
`note_snapshot` (per item, baru) ditampilkan di semua halaman detail order yang relevan — termasuk
memperbaiki bug `buyer_note` yang sudah tersimpan tapi tidak pernah dirender di
`Store/Manage/Orders/Show.tsx`.

## Backend

- [x] Migration `add_note_to_cart_items_table` — `cart_items.note` string(250) nullable
- [x] Migration `add_note_snapshot_to_store_order_items_table` — `store_order_items.note_snapshot` string(250) nullable
- [x] `CartItem::$fillable` — tambah `note`
- [x] `StoreOrderItem::$fillable` — tambah `note_snapshot`
- [x] `CartService::updateQty()` — parameter `?string $note = null`, ikut di-update
- [x] `CartController::updateQty()` — validasi `note` opsional (`nullable|string|max:250`), diteruskan ke service
- [x] `CheckoutService::lockAndValidateItems()` — salin `note` cart item ke `note_snapshot` di array item order

## Frontend

- [x] `types/index.d.ts` — `CartItem.note?: string | null`, `StoreOrderItem.note_snapshot?: string | null`
- [x] `Pages/Store/Cart.tsx` — input catatan per item (counter 0/250), auto-save `onBlur` via `router.patch` (`preserveScroll: true`)
- [x] `Pages/Store/Checkout.tsx` — catatan per item ditampilkan read-only di ringkasan produk, terpisah dari "Catatan untuk Penjual" (order-level)
- [x] `Pages/Store/Manage/Orders/Show.tsx` — **bugfix**: render `order.buyer_note`; tambah `item.note_snapshot` per baris
- [x] `Pages/GodMode/StoreOrders/Show.tsx` — tampilkan `buyer_note` dan `note_snapshot`
- [x] `Pages/Store/Orders/Show.tsx` (riwayat pembeli) — tampilkan `note_snapshot` per item

## Definition of Done

- [x] Pembeli menulis catatan per item di Cart, tersimpan lewat auto-save
- [x] Catatan tersalin presisi ke `note_snapshot` saat checkout, tidak berubah lagi setelahnya
- [x] `buyer_note` dan `note_snapshot` tampil di ketiga halaman detail order (seller, god-mode, buyer)
