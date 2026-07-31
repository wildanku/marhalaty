# Task 11b: Manajemen Status Pembayaran & Status Pesanan

## Overview

Fase 11, Bagian B. Menambahkan aksi "Ubah Status Pesanan" (override manual) di admin-store dan
god-mode, terpisah dari transisi otomatis ketat yang sudah ada di `OrderFulfillmentService`. Badge
status pembayaran (`latestTransaction()->status`) tampil read-only di samping kontrol status
pesanan. "Buka lagi" (`cancelled`/`expired` → `pending_payment`) dibatasi god-mode saja.

## Backend

- [x] Migration `create_store_order_status_histories_table` (ulid FK ke store_orders, from_status, to_status, reason nullable, actor_type enum, actor_id, timestamps) — append-only, tidak masuk `DeletedItemObserver`
- [x] Model `StoreOrderStatusHistory`
- [x] `StoreOrder::statusHistories()` relation
- [x] `OrderFulfillmentService::OVERRIDE_TRANSITIONS` matrix + `overrideStatus()` method (lock, validasi transisi, efek samping sama seperti jalur otomatis, tulis `StoreOrderStatusHistory`)
- [x] Helper `syncTransactionPaid()` / `voidPendingTransaction()` di `OrderFulfillmentService`
- [x] **Guard webhook**: `SatuteraWebhookController::handleStoreOrder` — cek ulang `SatuteraWebhookController` menolak transaksi yang statusnya sudah bukan `pending` sebelum diproses (risiko override→webhook race, §6 dokumen fase 11)
- [x] `StoreOrderManagementController::updateStatus()` + route `PATCH /my/stores/{store}/orders/{order}/status` (tanpa opsi `pending_payment`)
- [x] `GodMode\Controllers\StoreOrderController::updateStatus()` + route `PATCH /god-mode/store-orders/{id}/status` (termasuk `pending_payment`, tulis `AdminActivityLog`)

## Frontend

- [x] `Components/Store/OrderStatusControl.tsx` — dropdown status + textarea alasan (wajib untuk `cancelled`) + input resi (kalau target `shipped`), prop `allowReopen?: boolean`
- [x] Timeline riwayat status (`store_order_status_histories`, terbaru di atas) di `Store/Manage/Orders/Show.tsx` dan `GodMode/StoreOrders/Show.tsx`
- [x] Badge status pembayaran read-only (`latestTransaction`) di kedua halaman
- [x] `types/index.d.ts` — `StoreOrderStatusHistory` type, `StoreOrder.status_histories?`

## Definition of Done

- [x] Admin-store bisa override status sesuai `OVERRIDE_TRANSITIONS`, god-mode bisa juga "buka lagi"
- [x] Transisi di luar matriks ditolak server
- [x] Override ke `paid` memicu `onPaid()`; override ke `cancelled` melepas stok idempoten
- [x] Setiap perubahan tercatat di `store_order_status_histories`; aksi god-mode juga di `admin_activity_logs`
- [x] Badge status pembayaran tampil read-only di kedua halaman
