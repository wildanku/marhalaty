# Changelog

Dokumen ini mencatat perubahan-perubahan penting pada Satutera Payment Service yang berdampak pada kontrak API, schema database, atau alur integrasi client. Setiap entri diurutkan terbaru di atas.

---

## 2026-08-01 — Tambah `fee_type` pada Payment Channel

### Ringkasan

`PaymentChannel` sekarang punya field baru `fee_type` dengan nilai `FIX` atau `PERCENT`, untuk membedakan cara membaca nominal `fee`:

- `FIX` — nominal tetap dalam satuan `currency` channel (contoh: `4000` = Rp4.000). Ini adalah default, dan berlaku untuk semua channel yang sudah ada sebelumnya (backward compatible).
- `PERCENT` — persentase desimal dari jumlah pembayaran (contoh: `2.5` = 2.5%).

### Perubahan Schema

- `prisma/schema.prisma`
  - Enum baru `PaymentChannelFeeType { PERCENT FIX }`.
  - `PaymentChannel.fee`: tipe diubah dari `Int` menjadi `Float` (agar `PERCENT` bisa menyimpan desimal).
  - `PaymentChannel.feeType` (`fee_type` di database): kolom baru, default `FIX`.
  - Migration: `prisma/migrations/20260801070440_add_payment_channel_fee_type`.

### Perubahan API

- **`GET /api/v1/payment-channels`** (public) — setiap item response sekarang menyertakan `fee_type`.
- **Admin payment channel endpoints** (`GET/POST /api/v1/admin/payment-channels`, `GET/POST /api/v1/admin/payment-channels/:channelId`) — body request dan response sekarang menerima/mengembalikan `fee_type` (`"FIX"` atau `"PERCENT"`, default `"FIX"` bila tidak dikirim).

Lihat [`docs/api/satutera-payment-service-api.md`](./api/satutera-payment-service-api.md) untuk contoh payload terbaru.

### Perubahan Kode Terkait

- `packages/shared/src/payment-channel.ts` — tambah `PAYMENT_CHANNEL_FEE_TYPES`, `PaymentChannelFeeType`, dan field `fee_type` di `PublicPaymentChannel`.
- `apps/api/src/modules/payment-channels/*` — select query dan mapper menyertakan `feeType`.
- `apps/api/src/modules/admin/*` — DTO, select query, dan create/update payload menyertakan `fee_type`/`feeType`.
- `apps/api/src/modules/admin` dashboard (`apps/web/src/pages/admin/admin-dashboard-page.tsx`) — form tambah/edit channel punya field "Fee type", dan tabel channel menampilkan kolom `feeType` serta memformat nilai `fee` sebagai `%` atau nominal mata uang sesuai tipenya.
- `prisma/seed.ts` dan `docs/sample-data/payment-channel-sample.json` — seluruh data seed diberi `feeType: "FIX"` (mengikuti nilai fee lama yang seluruhnya nominal tetap).

### Yang **Belum** Berubah (Perlu Diketahui)

`fee` dan `fee_type` pada `PaymentChannel` **belum dipakai untuk menghitung nominal yang ditagihkan ke customer**. Nilai `fee`/`total` yang muncul di `payment_detail` saat `POST /api/v1/payments` masih berasal dari response API provider (iPaymu/Midtrans), bukan dari kolom ini. Jika ke depannya `fee_type` perlu benar-benar dipakai untuk menghitung fee yang ditagihkan (misal `amount * fee/100` untuk `PERCENT`), diperlukan perubahan tambahan di `apps/api/src/modules/payments/payments.service.ts` dan adapter gateway terkait.

### Migrasi Data

Tidak ada tindakan manual yang diperlukan untuk data lama — kolom `fee_type` otomatis terisi `FIX` untuk semua baris `payment_channels` yang sudah ada, sesuai perilaku fee sebelumnya.
