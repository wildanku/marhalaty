# Panduan Integrasi Client: Generate Payment (VA/QRIS) + Realtime Status via WebSocket

Dokumen ini adalah panduan praktis untuk backend produk yang berintegrasi dengan Satutera Payment Service, khususnya untuk:

1. Membuat payment yang menghasilkan **Virtual Account (VA)** atau **QRIS**.
2. Memanfaatkan **WebSocket** untuk menerima update status pembayaran secara realtime (`pending`, `paid`, `expired`, `failed`, `cancelled`) tanpa perlu polling terus-menerus.

Untuk referensi kontrak endpoint secara lengkap (semua endpoint admin, dsb), lihat [`docs/api/satutera-payment-service-api.md`](./api/satutera-payment-service-api.md). Dokumen ini fokus pada alur integrasi end-to-end dan contoh kode.

Fitur WebSocket yang dibahas di sini **sudah tersedia di codebase saat ini** (`apps/api/src/modules/websocket/`) — panduan ini tidak memerlukan perubahan kode apa pun, murni dokumentasi cara pakai dari sisi client.

---

## Base URL

| Environment       | Base URL                       |
| ----------------- | ------------------------------ |
| Production        | `https://payment.satutera.com` |
| Local development | `http://localhost:3000`        |

Semua path endpoint di dokumen ini (`/api/v1/...`, `/webhooks/...`, `/ws/payments`) merupakan path relatif terhadap Base URL di atas. Contoh lengkap di production:

```
https://payment.satutera.com/api/v1/payments
https://payment.satutera.com/api/v1/payment-channels
https://payment.satutera.com/ws/payments   (path Socket.IO)
```

---

## 1. Alur Integrasi Ringkas

```
Backend produk                Satutera Payment Service              Provider (iPaymu/Midtrans)
     |                                  |                                      |
     | 1. POST /api/v1/payments         |                                      |
     |--------------------------------->|                                      |
     |                                  | 2. Create VA/QRIS ke provider        |
     |                                  |------------------------------------->|
     |                                  |<--------------------------------------
     | 3. Response: checkout_token,     |                                      |
     |    payment_detail (VA/QRIS)      |                                      |
     |<---------------------------------|                                      |
     |                                  |                                      |
     | 4. Connect socket.io, subscribe  |                                      |
     |    dengan checkout_token         |                                      |
     |--------------------------------->|                                      |
     |                                  |         5. Webhook status berubah    |
     |                                  |<-------------------------------------|
     | 6. Terima event `payment.paid`   |                                      |
     |    / `payment.expired` dst       |                                      |
     |<---------------------------------|                                      |
     |                                  |                                      |
     | 7. Terima juga server-to-server  |                                      |
     |    callback (`webhookUrl`) saat  |                                      |
     |    status = paid — ini sumber    |                                      |
     |    kebenaran untuk fulfillment   |                                      |
     |<---------------------------------|                                      |
```

Poin penting: **WebSocket dipakai untuk UX realtime** (update tampilan checkout tanpa refresh). **Fulfillment (mengirim produk/akses ke customer) tetap harus berdasarkan callback server-to-server yang tervalidasi tanda tangannya** (lihat bagian 6), bukan dari event socket atau redirect browser semata.

---

## 2. Mendapatkan Daftar Payment Channel (VA Bank / QRIS yang Tersedia)

Sebelum membuat payment dengan `response_mode: "raw_detail"`, backend produk perlu tahu kombinasi `payment_method` + `payment_channel` apa saja yang aktif dan mendukung mode tersebut. Gunakan endpoint ini untuk mengambil katalog channel.

### Endpoint

```
GET /api/v1/payment-channels
```

Tidak memakai autentikasi (public endpoint).

### Query Parameters

| Parameter  | Default | Keterangan                                       |
| ---------- | ------- | ------------------------------------------------ |
| `page`     | `1`     | halaman ke-                                      |
| `limit`    | `20`    | maksimal `100`                                   |
| `provider` | -       | opsional, filter provider, contoh `ipaymu`       |
| `method`   | -       | opsional, filter metode, contoh `va` atau `qris` |

Endpoint hanya mengembalikan channel yang `status: active`, dengan provider yang juga `active` dan memiliki minimal satu gateway config aktif.

### Contoh Request

```
GET /api/v1/payment-channels?method=va&limit=50
GET /api/v1/payment-channels?provider=ipaymu&method=qris
```

```ts
const response = await fetch("https://payment.satutera.com/api/v1/payment-channels?method=va");
const { data, meta } = await response.json();
```

### Contoh Response

```json
{
  "message": "Payment channels retrieved successfully",
  "data": [
    {
      "provider": "ipaymu",
      "method": "va",
      "code": "bca",
      "name": "BCA Virtual Account",
      "fee": 4000,
      "currency": "IDR",
      "image": "https://payment.satutera.com/assets/channels/bca.png",
      "supports_payment_page": false,
      "supports_direct_detail": true,
      "metadata": {
        "instructions": [
          {
            "title": "ATM BCA",
            "steps": ["Masukkan kartu...", "Pilih menu Transfer..."]
          }
        ]
      }
    },
    {
      "provider": "ipaymu",
      "method": "qris",
      "code": "qris",
      "name": "QRIS",
      "fee": 0,
      "currency": "IDR",
      "image": null,
      "supports_payment_page": false,
      "supports_direct_detail": true,
      "metadata": { "instructions": [] }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

Catatan penting:

- `code` **tidak unik secara global** — identitas satu channel adalah kombinasi `provider` + `method` + `code`. Jadikan tiga field ini sebagai key saat menyimpan/mencocokkan channel di sisi client.
- Field `supports_direct_detail: true` menandakan channel tersebut boleh dipakai dengan `response_mode: "raw_detail"` (lihat bagian 3). Jika `false`, channel hanya bisa dipakai lewat `response_mode: "payment_page"`.
- `metadata.instructions` berisi langkah pembayaran yang bisa ditampilkan langsung ke customer (juga otomatis ikut disisipkan ke `payment_detail.instructions` saat payment dibuat).
- Response ini aman ditampilkan ke publik (tidak ada credential/secret provider di dalamnya).

---

## 3. Membuat Payment (VA / QRIS)

### Endpoint

```
POST /api/v1/payments
```

### Autentikasi (HMAC)

Semua request ke endpoint client memakai header berikut:

| Header            | Keterangan                                                    |
| ----------------- | ------------------------------------------------------------- |
| `X-Client-Id`     | slug client, contoh `resumakit`                               |
| `X-Api-Key`       | opsional, divalidasi jika dikirim                             |
| `X-Timestamp`     | ISO timestamp, toleransi skew maksimal 5 menit                |
| `X-Signature`     | HMAC SHA256 hex (lihat rumus di bawah)                        |
| `Idempotency-Key` | direkomendasikan wajib untuk `POST /payments` agar retry aman |

Rumus signature (harus persis, termasuk urutan dan tanpa separator):

```
signature = HMAC_SHA256(
  key = client_secret,
  message = timestamp + METHOD_UPPERCASE + full_path_with_query + sha256_hex(raw_json_body)
)
```

Contoh implementasi Node.js:

```ts
import { createHash, createHmac } from "node:crypto";

function signRequest({
  method,
  path,
  body,
  clientSecret,
}: {
  method: string;
  path: string; // contoh: "/api/v1/payments"
  body: unknown;
  clientSecret: string;
}) {
  const timestamp = new Date().toISOString();
  const rawBody = JSON.stringify(body);
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const payload = `${timestamp}${method.toUpperCase()}${path}${bodyHash}`;
  const signature = createHmac("sha256", clientSecret).update(payload).digest("hex");

  return { timestamp, signature, rawBody };
}
```

### Request: Virtual Account (`raw_detail`)

Gunakan `response_mode: "raw_detail"` bila ingin **menampilkan nomor VA langsung di aplikasi sendiri** (tidak redirect ke halaman checkout Satutera). Wajib menyertakan `payment_method` dan `payment_channel` yang didukung (`supports_direct_detail: true` di `GET /api/v1/payment-channels`).

```json
{
  "client_id": "resumakit",
  "client_transaction_id": "ORDER-1001",
  "amount": 150000,
  "currency": "IDR",
  "provider": "ipaymu",
  "payment_method": "va",
  "payment_channel": "bca",
  "response_mode": "raw_detail",
  "customer": {
    "name": "Budi Santoso",
    "email": "budi@example.com"
  },
  "items": [{ "name": "CV Builder Pro", "price": 150000, "quantity": 1 }],
  "client_redirect": {
    "success_url": "https://resumakit.com/orders/ORDER-1001/success",
    "failed_url": "https://resumakit.com/orders/ORDER-1001/failed",
    "expired_url": "https://resumakit.com/orders/ORDER-1001/expired"
  }
}
```

### Request: QRIS (`raw_detail`)

Sama seperti VA, cukup ganti `payment_method` menjadi `qris` (dan `payment_channel` sesuai provider, misal kode QRIS provider yang aktif).

```json
{
  "client_id": "resumakit",
  "client_transaction_id": "ORDER-1003",
  "amount": 150000,
  "currency": "IDR",
  "provider": "ipaymu",
  "payment_method": "qris",
  "payment_channel": "qris",
  "response_mode": "raw_detail",
  "customer": { "name": "Budi Santoso", "email": "budi@example.com" },
  "items": [{ "name": "CV Builder Pro", "price": 150000, "quantity": 1 }]
}
```

> Alternatif: gunakan `response_mode: "payment_page"` (default) tanpa `payment_method`/`payment_channel` untuk redirect customer ke halaman checkout hosted milik Satutera (`gateway_redirect_url`). Pola ini tetap bisa memanfaatkan WebSocket dengan cara yang sama.

### Response

```json
{
  "message": "Payment created successfully",
  "data": {
    "payment_id": "pay_xxx",
    "checkout_token": "chk_xxx",
    "checkout_url": "http://localhost:5174/checkout/chk_xxx",
    "status": "pending",
    "response_mode": "raw_detail",
    "gateway_redirect_url": null,
    "payment_detail": {
      "type": "virtual_account",
      "payment_no": "880812345678",
      "payment_name": "BCA Virtual Account",
      "qr_string": null,
      "qr_template": null,
      "amount": 150000,
      "fee": 4000,
      "total": 154000,
      "currency": "IDR",
      "expired_at": "2026-07-29T12:30:00.000Z",
      "instructions": [
        {
          "title": "ATM BCA",
          "steps": ["Masukkan kartu...", "Pilih menu Transfer..."]
        }
      ]
    },
    "expires_at": "2026-07-29T12:30:00.000Z"
  }
}
```

Untuk QRIS, `payment_detail.type` bernilai `"qris"` dan field `qr_string` / `qr_template` (URL gambar QR) yang terisi, sedangkan `payment_no` kosong.

Field penting yang **wajib disimpan** oleh backend produk untuk keperluan langkah berikutnya:

- `checkout_token` → dipakai untuk subscribe WebSocket dan polling status publik.
- `payment_id` → dipakai untuk `GET /api/v1/payments/:paymentId(/status)` (endpoint milik client, butuh HMAC).

---

## 4. Realtime Status via WebSocket

### Info koneksi

| Parameter | Nilai                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Library   | [`socket.io-client`](https://www.npmjs.com/package/socket.io-client) (server pakai `socket.io` v4, native `ws` **tidak didukung**)        |
| URL       | Base URL API — production: `https://payment.satutera.com`, local: `http://localhost:3000`                                                 |
| Path      | `/ws/payments`                                                                                                                            |
| Transport | disarankan paksa `["websocket"]` agar tidak fallback ke long-polling                                                                      |
| Auth      | tidak ada handshake auth terpisah — akses room dikontrol oleh kepemilikan `checkout_token` (perlakukan seperti bearer token payment link) |

### Event yang dikirim client → server

`subscribe` — wajib dipanggil setelah socket connect agar bisa menerima update untuk payment tertentu:

```json
{ "checkout_token": "chk_xxx" }
```

Server akan membalas (ack) dengan:

```json
{ "success": true, "message": "Subscribed to payment room" }
```

atau `{ "success": false, "message": "checkout_token is required" }` jika payload tidak valid.

### Event yang dikirim server → client

Nama event mengikuti pola `payment.<status>`, yaitu salah satu dari:

- `payment.pending`
- `payment.paid`
- `payment.failed`
- `payment.expired`
- `payment.cancelled`

Payload setiap event:

```json
{
  "event": "payment.paid",
  "payment_id": "pay_xxx",
  "checkout_token": "chk_xxx",
  "status": "paid",
  "amount": 150000,
  "currency": "IDR",
  "client_transaction_id": "ORDER-1001",
  "client_redirect": {
    "url": "https://resumakit.com/orders/ORDER-1001/success",
    "delay_seconds": 5
  }
}
```

`client_redirect` hanya terisi ketika status `paid` **dan** client mengirim `client_redirect.success_url` saat create payment; selain itu bernilai `null`.

### Contoh kode: browser (checkout page / SPA)

```ts
import { io } from "socket.io-client";

function subscribeToPaymentStatus(
  apiBaseUrl: string,
  checkoutToken: string,
  onStatusChange: (status: string, payload: any) => void
) {
  const socket = io(apiBaseUrl, {
    path: "/ws/payments",
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    socket.emit("subscribe", { checkout_token: checkoutToken });
  });

  socket.onAny((_event, payload) => {
    if (payload?.checkout_token === checkoutToken && payload?.status) {
      onStatusChange(payload.status, payload);
    }
  });

  return () => socket.disconnect();
}
```

(Ini persis pola yang sudah dipakai di `apps/web/src/pages/checkout-page.tsx`.)

### Contoh kode: server-to-server (Node.js backend produk)

Backend produk juga bisa subscribe langsung (tanpa lewat browser customer), misalnya untuk memperbarui status order internal secara realtime:

```ts
import { io } from "socket.io-client";

const socket = io("https://payment.satutera.com", {
  path: "/ws/payments",
  transports: ["websocket"],
});

socket.on("connect", () => {
  socket.emit("subscribe", { checkout_token: checkoutToken });
});

socket.on("payment.paid", (payload) => {
  // Update status order lokal untuk UX (bukan pemicu utama fulfillment)
  markOrderAsPaidInUI(payload.client_transaction_id);
});

socket.on("payment.expired", (payload) => {
  markOrderAsExpiredInUI(payload.client_transaction_id);
});

socket.on("payment.failed", (payload) => {
  markOrderAsFailedInUI(payload.client_transaction_id);
});
```

### Reconnect & multi-tab

`socket.io-client` sudah menangani reconnect otomatis secara default (exponential backoff). Setelah reconnect, **kirim ulang event `subscribe`** (lakukan ini di handler `connect`, bukan sekali saat inisialisasi) karena room membership tidak persist lintas koneksi baru. Beberapa tab/instance boleh subscribe ke `checkout_token` yang sama tanpa konflik (server memakai room broadcast, bukan single-consumer).

---

## 5. Fallback: Polling REST (wajib tetap diimplementasikan)

WebSocket tidak dijamin selalu tersambung (network, proxy, dsb.), jadi **selalu sediakan fallback polling** ke endpoint status, dengan interval yang wajar (contoh di frontend saat ini: setiap 7 detik):

- Tanpa auth (untuk halaman checkout publik): `GET /api/v1/public/payments/:checkoutToken/status`
- Dengan HMAC (untuk backend produk mengecek status miliknya sendiri): `GET /api/v1/payments/:paymentId/status`

Response:

```json
{
  "payment_id": "pay_xxx",
  "status": "pending",
  "paid_at": null,
  "expires_at": "2026-07-29T12:30:00.000Z"
}
```

---

## 6. Catatan Penting Soal Status `expired`

Perilaku status `expired` saat ini **tergantung sumbernya**:

- **Expired yang dilaporkan provider via webhook** (misal iPaymu mengirim status `expired`/`kedaluwarsa` untuk VA/QRIS yang sudah lewat masa berlaku di sisi mereka) → **akan** memicu event socket `payment.expired` seperti status lain, karena melewati jalur `applyVerifiedGatewayStatus` yang sama dengan `paid`/`failed`.
- **Expired berdasarkan window internal Satutera** (`expires_at`, default 30 menit sejak payment dibuat) → transisi status di database **hanya terjadi lewat endpoint admin manual** `POST /api/v1/admin/operations/expire-payments`, dan endpoint ini **saat ini tidak mengirim event socket** saat menandai payment menjadi `expired`. Tidak ada scheduler otomatis di dalam service yang memanggil endpoint ini secara berkala — kalau tidak ada job eksternal (cron/k8s CronJob) yang memicunya, baris `pending` yang sudah lewat `expires_at` akan tetap berstatus `pending` di database sampai endpoint tersebut dipanggil.

**Implikasi untuk integrasi client:** jangan hanya mengandalkan event `payment.expired` dari socket untuk kasus "waktu habis". Selalu terapkan juga pengecekan `expires_at` secara lokal di sisi client (misal: begitu `Date.now() > new Date(expires_at)` dan status masih `pending`, tampilkan UI kedaluwarsa secara optimistik) dan/atau tetap jalankan polling status sebagai penentu akhir. Jika perlu status `expired` di database benar-benar konsisten dan real-time, hal itu memerlukan perubahan kode (menambahkan scheduler otomatis dan emit socket saat expire) — di luar cakupan dokumen ini karena saat ini tidak ada perubahan kode yang diminta.

---

## 7. Product Callback (Sumber Kebenaran Fulfillment)

Saat payment menjadi `paid`, service mengirim callback **server-to-server** ke `client.webhookUrl` (dikonfigurasi lewat admin). Ini adalah sinyal yang **harus** dipakai untuk memicu fulfillment (bukan event socket, bukan redirect browser), lengkap dengan retry otomatis (backoff: langsung, 1 menit, 5 menit, 15 menit, 1 jam) bila endpoint client gagal merespons 2xx.

Header:

- `X-Satutera-Client-Id`
- `X-Satutera-Timestamp`
- `X-Satutera-Signature` — `HMAC_SHA256(webhook_secret, timestamp + raw_json_body)`

Body:

```json
{
  "event": "payment.paid",
  "payment_id": "pay_xxx",
  "client_id": "resumakit",
  "client_transaction_id": "ORDER-1001",
  "amount": 150000,
  "currency": "IDR",
  "status": "paid",
  "paid_at": "2026-07-29T12:00:00.000Z",
  "provider": "ipaymu",
  "payment_method": "va",
  "payment_channel": "bca",
  "metadata": { "order_id": "ORDER-1001" },
  "gateway_callback_raw": { "reference_id": "pay_xxx", "status": "paid" }
}
```

Verifikasi signature di sisi client sebelum memproses:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyCallback(
  rawBody: string,
  timestamp: string,
  signature: string,
  webhookSecret: string
) {
  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}${rawBody}`)
    .digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

---

## 8. Ringkasan Praktik Terbaik

- Selalu kirim `Idempotency-Key` saat `POST /api/v1/payments` supaya retry dari sisi client tidak membuat payment ganda.
- Gunakan `response_mode=raw_detail` hanya jika kombinasi `payment_method` + `payment_channel` sudah dipastikan mendukung `supports_direct_detail` (cek `GET /api/v1/payment-channels`).
- WebSocket = update UX realtime. Callback tervalidasi (atau `GET status` server-to-server) = sumber kebenaran untuk keputusan bisnis (fulfillment, pembatalan order, dsb).
- Selalu implementasikan polling fallback; jangan asumsikan koneksi socket selalu hidup.
- Kirim ulang `subscribe` setiap kali event `connect` terjadi (termasuk saat reconnect), bukan hanya sekali di awal.
- Untuk status `expired`, jangan hanya bergantung pada event socket — lihat catatan di bagian 5.
- Jangan pernah menganggap redirect browser ke `success_url` sebagai bukti pembayaran berhasil; itu murni navigasi UX.
