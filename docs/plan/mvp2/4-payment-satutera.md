# Fase 4 — Pembayaran via Satutera Payment Service

Ambil daftar channel, buat payment `raw_detail` (QRIS / Virtual Account), tampilkan detailnya di
halaman kita sendiri, pantau status realtime lewat WebSocket, dan terima callback tervalidasi
sebagai sumber kebenaran fulfillment.

Prasyarat: [Fase 3](./3-cart-checkout-shipping.md) untuk order; `SatuteraPaymentService` sendiri
tidak bergantung pada cart sehingga bisa dikerjakan paralel.

Referensi: [`docs/guidance/payment-guidance.md`](../../guidance/payment-guidance.md).

---

## 1. Posisi terhadap integrasi pembayaran yang sudah ada

Repo saat ini memanggil **iPaymu langsung** lewat `IPaymuService` (implementasi
`App\Contracts\PaymentProviderInterface`) untuk pembayaran event. Satutera adalah **layanan berbeda**
— ia yang berbicara ke iPaymu/Midtrans di belakang layar.

Keputusan: `SatuteraPaymentService` dibuat sebagai **service baru yang berdiri sendiri**, tidak
mengimplementasikan `PaymentProviderInterface` yang lama. Alasannya, kontrak lama menerima
`Rsvp` dan `Transaction` di tanda tangannya (`initiatePayment(Transaction $t, Rsvp $r)`) sehingga
tidak bisa dipakai untuk order toko tanpa membongkar alur event yang sudah produksi. Alur event
tetap memakai iPaymu apa adanya; migrasi event ke Satutera adalah pekerjaan terpisah di luar MVP 2.

---

## 2. Konfigurasi

`config/services.php`:

```php
'satutera' => [
    'base_url'       => env('SATUTERA_BASE_URL', 'https://payment.satutera.com'),
    'client_id'      => env('SATUTERA_CLIENT_ID'),
    'client_secret'  => env('SATUTERA_CLIENT_SECRET'),
    'api_key'        => env('SATUTERA_API_KEY'),
    'webhook_secret' => env('SATUTERA_WEBHOOK_SECRET'),
],
```

`VITE_SATUTERA_BASE_URL` diekspos ke frontend untuk koneksi socket.io.
`SATUTERA_CLIENT_SECRET` dan `SATUTERA_WEBHOOK_SECRET` **tidak boleh** pernah masuk payload Inertia.

---

## 3. `SatuteraPaymentService`

`app/Domains/Shared/Services/SatuteraPaymentService.php`

### 3.1 Penandatanganan HMAC (bagian paling rawan)

```
signature = HMAC_SHA256(
    key     = client_secret,
    message = timestamp + METHOD_UPPERCASE + full_path_with_query + sha256_hex(raw_json_body)
)
```

```php
private function signedHeaders(string $method, string $path, string $rawBody): array
{
    $timestamp = now()->toIso8601String();
    $payload   = $timestamp . strtoupper($method) . $path . hash('sha256', $rawBody);

    return [
        'X-Client-Id' => config('services.satutera.client_id'),
        'X-Api-Key'   => config('services.satutera.api_key'),
        'X-Timestamp' => $timestamp,
        'X-Signature' => hash_hmac('sha256', $payload, config('services.satutera.client_secret')),
        'Content-Type' => 'application/json',
    ];
}
```

> **Jebakan utama.** Body yang dikirim harus **byte-identik** dengan body yang ditandatangani.
> Jangan `Http::withHeaders($h)->post($url, $array)` — Laravel akan meng-encode ulang array itu dan
> urutan/escaping-nya bisa berbeda dari `json_encode` yang kita hash, lalu server membalas 401.
> Yang benar:
>
> ```php
> $rawBody = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
> Http::withHeaders($this->signedHeaders('POST', '/api/v1/payments', $rawBody))
>     ->withHeaders(['Idempotency-Key' => $idempotencyKey])
>     ->withBody($rawBody, 'application/json')
>     ->timeout(15)
>     ->post($this->baseUrl . '/api/v1/payments');
> ```
>
> Toleransi skew timestamp 5 menit — pastikan jam server benar (NTP) sebelum menuduh signature salah.

### 3.2 Method

```php
/** GET /api/v1/payment-channels — publik, tanpa auth. Di-cache 15 menit. */
public function getPaymentChannels(?string $method = null, ?string $provider = null): array;

/** POST /api/v1/payments dengan response_mode=raw_detail. */
public function createPayment(array $payload, string $idempotencyKey): array;

/** GET /api/v1/payments/{paymentId}/status — HMAC, untuk polling server-to-server. */
public function getPaymentStatus(string $paymentId): array;

/** Verifikasi callback: HMAC_SHA256(webhook_secret, timestamp . rawBody), hash_equals. */
public function verifyCallbackSignature(string $rawBody, string $timestamp, string $signature): bool;
```

### 3.3 Daftar channel

`getPaymentChannels()` hanya mengembalikan channel dengan `supports_direct_detail = true` — MVP 2
memakai `response_mode: raw_detail` supaya VA/QRIS tampil di halaman kita sendiri.

Identitas satu channel adalah **kombinasi `provider` + `method` + `code`**, bukan `code` saja
(guidance §2). Simpan ketiganya di `transactions.metadata` dan pakai ketiganya sebagai key saat
mencocokkan pilihan user.

Field `fee` dari channel inilah yang masuk ke `payment_fee` order — sesuai note, fee ditambahkan ke
total tagihan.

Endpoint internal: `GET /api/store/payment-channels` (cached, tanpa kredensial di respons).

### 3.4 Payload create payment

```php
[
    'client_id'             => config('services.satutera.client_id'),
    'client_transaction_id' => $order->order_number,      // INV/20260729/A1B2C3
    'amount'                => (int) $order->total,        // sudah termasuk ongkir + fee
    'currency'              => 'IDR',
    'provider'              => $channel['provider'],
    'payment_method'        => $channel['method'],         // 'va' | 'qris'
    'payment_channel'       => $channel['code'],           // 'bca' | 'qris' | ...
    'response_mode'         => 'raw_detail',
    'customer' => [
        'name'  => $buyer->name,
        'email' => $buyer->email,
        'phone' => $buyer->phone_number,
    ],
    'items' => $order->items->map(fn ($i) => [
        'name'     => $i->name_snapshot . ($i->variant_label_snapshot ? " ({$i->variant_label_snapshot})" : ''),
        'price'    => (int) $i->unit_price,
        'quantity' => $i->quantity,
    ])->all(),
    'client_redirect' => [
        'success_url' => route('store.orders.show', $order->id),
        'failed_url'  => route('store.payment.show', $transaction->payment_hash),
        'expired_url' => route('store.payment.show', $transaction->payment_hash),
    ],
    'metadata' => ['order_id' => $order->id, 'store_id' => $order->store_id],
]
```

`Idempotency-Key` = `"order-{$order->id}-{$transaction->id}"` — retry dari sisi kita tidak boleh
membuat payment ganda.

Respons yang **wajib disimpan** ke `transactions`:

| Field respons | Disimpan ke |
| --- | --- |
| `payment_id` | `external_reference` |
| `checkout_token` | `checkout_token` |
| `payment_detail` (VA/QRIS + instruksi) | `payment_detail` (json) |
| `payment_detail.fee` | `payment_fee` |
| `payment_detail.payment_no` | `va_number` |
| `expires_at` | `expired_at` |

---

## 4. Halaman pembayaran

Route (publik, `payment_hash` yang jadi token akses — pola yang sudah dipakai `/payment/{hash}`):

| Method | Route | Keterangan |
| --- | --- | --- |
| GET | `/store/payment/{hash}` | Halaman VA/QRIS + status |
| GET | `/store/payment/{hash}/status` | JSON status untuk polling fallback |

`StorePaymentPageController@show` mengirim ke Inertia: order (dengan item), transaksi,
`payment_detail`, `checkout_token`, `expires_at`, dan `satutera_ws_url`.

> Halaman ini **terpisah** dari `Pages/Payment/PaymentPage.tsx` (778 baris, penuh logika RSVP +
> iPaymu). Lihat keputusan D8 di [README](./README.md).

### `resources/js/Pages/Store/PaymentPage.tsx`

Menampilkan:

- Ringkasan order: item, subtotal, ongkir, **fee pembayaran sebagai baris tersendiri**, total.
- QRIS: render `qr_template` (URL gambar) atau generate dari `qr_string`; tombol unduh QR.
- VA: nomor VA besar + tombol salin + `payment_detail.instructions` (dikirim Satutera, tidak perlu
  di-hardcode seperti `VA_INSTRUCTIONS` di halaman event yang lama).
- Hitung mundur ke `expires_at`.
- Badge status yang berubah realtime.

### Realtime + fallback (tiga lapis)

```
pnpm add socket.io-client
```

```ts
const socket = io(satuteraBaseUrl, { path: "/ws/payments", transports: ["websocket"] });

socket.on("connect", () => {
  // WAJIB di handler connect, bukan sekali di mount — room tidak persist saat reconnect
  socket.emit("subscribe", { checkout_token: checkoutToken });
});

socket.onAny((_event, payload) => {
  if (payload?.checkout_token === checkoutToken && payload?.status) {
    setStatus(payload.status);
  }
});
```

1. **WebSocket** — UX realtime.
2. **Polling** `GET /store/payment/{hash}/status` tiap 7 detik (interval yang sama dipakai frontend
   Satutera) selama status masih `pending`; berhenti begitu final.
3. **Cek `expires_at` lokal** — guidance §6 menegaskan expiry internal Satutera **tidak** memancarkan
   event socket. Kalau `Date.now() > expires_at` dan status masih `pending`, tampilkan keadaan
   kedaluwarsa secara optimistik dan tawarkan "buat pembayaran baru".

Saat status jadi `paid`, jangan langsung menyatakan barang diproses — tampilkan status pembayaran
berhasil dan arahkan ke halaman order. Perubahan status order sesungguhnya ditentukan callback.

---

## 5. Callback server-to-server (sumber kebenaran)

```
POST /webhooks/satutera/payment      → withoutMiddleware([VerifyCsrfToken::class])
```

Header: `X-Satutera-Client-Id`, `X-Satutera-Timestamp`, `X-Satutera-Signature`
(= `HMAC_SHA256(webhook_secret, timestamp + raw_json_body)`).

### 5.1 Idempotency

```php
Schema::create('payment_webhook_events', function (Blueprint $table) {
    $table->id();
    $table->string('provider', 20)->default('satutera');
    $table->string('payment_id')->index();
    $table->string('event_type', 40);           // payment.paid, payment.expired, ...
    $table->string('body_hash', 64);
    $table->json('payload');
    $table->timestamp('processed_at')->nullable();
    $table->timestamps();

    $table->unique(['provider', 'payment_id', 'event_type']);
});
```

Guidance §7 menyebut Satutera melakukan retry (langsung, 1 menit, 5 menit, 15 menit, 1 jam) sampai
dapat 2xx. Tanpa penjagaan ini, satu pembayaran bisa mengurangi stok atau mengirim email berkali-kali.

Repo belum memakai `spatie/laravel-webhook-client` (meski `docs/5.payment-gateway.md` menyebutnya),
jadi tabel di atas menangani idempotency secara langsung tanpa menambah dependency.

### 5.2 Urutan pemrosesan

```php
public function handle(Request $request)
{
    $raw = $request->getContent();

    if (! $this->satutera->verifyCallbackSignature(
            $raw, $request->header('X-Satutera-Timestamp'), $request->header('X-Satutera-Signature'))) {
        Log::warning('Satutera callback signature invalid', ['ip' => $request->ip()]);
        return response()->json(['message' => 'Invalid signature'], 400);
    }

    $payload = json_decode($raw, true);

    DB::transaction(function () use ($payload, $raw) {
        // 1. Kunci idempotency — insert gagal (unique violation) = sudah diproses
        $event = PaymentWebhookEvent::firstOrCreate(
            ['provider' => 'satutera', 'payment_id' => $payload['payment_id'], 'event_type' => $payload['event']],
            ['body_hash' => hash('sha256', $raw), 'payload' => $payload],
        );
        if ($event->processed_at !== null) {
            return;                                  // sudah pernah diproses, keluar diam-diam
        }

        // 2. Kunci transaksi
        $transaction = Transaction::where('external_reference', $payload['payment_id'])
            ->lockForUpdate()->first();
        if (! $transaction) { Log::warning(...); return; }
        if ($transaction->status === 'paid') { $event->update(['processed_at' => now()]); return; }

        // 3. Verifikasi ulang jumlah — payload tidak dipercaya begitu saja
        if ((int) $payload['amount'] !== (int) $transaction->amount) {
            Log::error('Satutera callback amount mismatch', [...]);
            return;                                  // jangan tandai lunas; butuh peninjauan manual
        }

        // 4. Perbarui transaksi + order
        $transaction->update([
            'status'   => $payload['status'],
            'paid_at'  => $payload['status'] === 'paid' ? now() : null,
            'metadata' => array_merge($transaction->metadata ?? [], ['callback' => $payload]),
        ]);

        $order = $transaction->payable;              // StoreOrder
        if ($payload['status'] === 'paid') {
            $order->update(['status' => 'paid', 'paid_at' => now()]);
            OrderFulfillmentService::onPaid($order); // link download digital + notifikasi
        } elseif (in_array($payload['status'], ['expired', 'failed', 'cancelled'], true)) {
            $order->update(['status' => $payload['status'] === 'expired' ? 'expired' : 'cancelled']);
            OrderFulfillmentService::releaseStock($order);
        }

        $event->update(['processed_at' => now()]);
    });

    return response()->json(['message' => 'OK']);
}
```

Selalu balas **2xx untuk payload tervalidasi yang sudah pernah diproses** — kalau tidak, Satutera
akan terus mengulang selama satu jam.

Pemeriksaan jumlah di langkah 3 penting: tanpa itu, callback tervalidasi dengan nominal berbeda
(mis. akibat perubahan order setelah payment dibuat) akan menandai order lunas dengan bayaran kurang.

---

## 6. Perubahan pada `transactions`

Migration aditif (keputusan D3 di [README](./README.md)):

```php
Schema::table('transactions', function (Blueprint $table) {
    $table->string('payable_type')->nullable()->after('id');
    $table->string('payable_id')->nullable()->after('payable_type');
    $table->decimal('payment_fee', 12, 2)->default(0)->after('amount');
    $table->string('checkout_token')->nullable()->index();
    $table->json('payment_detail')->nullable();
    $table->index(['payable_type', 'payable_id']);
});

// backfill baris lama
DB::table('transactions')->whereNotNull('rsvp_id')->update([
    'payable_type' => \App\Domains\Event\Models\Rsvp::class,
    'payable_id'   => DB::raw('rsvp_id::text'),
]);

// baru setelah backfill: rsvp_id jadi nullable
Schema::table('transactions', fn (Blueprint $t) => $t->unsignedBigInteger('rsvp_id')->nullable()->change());
```

Model `Transaction`: tambah `payable()` (`morphTo`), masukkan kolom baru ke `$fillable` dan
`$casts` (`payment_detail => 'json'`, `payment_fee => 'decimal:2'`). Relasi `rsvp()` dan seluruh
alur event **tidak diubah**.

> Sebelum rilis, jalankan regresi alur RSVP: daftar event berbayar → halaman `/payment/{hash}` →
> unggah bukti manual → approve dari god-mode. Migration ini menyentuh tabel yang sudah produksi.

---

## 7. Definition of Done

- [ ] `GET /api/store/payment-channels` mengembalikan channel `supports_direct_detail` beserta `fee`, tanpa kredensial apa pun, dan di-cache.
- [ ] `fee` channel terpilih masuk ke `payment_fee` order dan terlihat sebagai baris terpisah di ringkasan.
- [ ] Create payment berhasil untuk QRIS **dan** minimal satu VA bank di sandbox.
- [ ] Body yang ditandatangani identik dengan yang dikirim — tidak ada 401 signature (uji dengan payload berisi karakter non-ASCII dan slash).
- [ ] `Idempotency-Key` terkirim; memanggil ulang create payment untuk order yang sama tidak membuat payment kedua.
- [ ] Halaman pembayaran menampilkan VA/QRIS + instruksi dari Satutera + hitung mundur.
- [ ] Socket terhubung, `subscribe` dikirim ulang setiap `connect` (uji dengan memutus jaringan lalu menyambung lagi).
- [ ] Polling fallback jalan saat socket diblokir, dan berhenti setelah status final.
- [ ] Lewat `expires_at` dengan status `pending` → UI menampilkan kedaluwarsa tanpa menunggu event socket.
- [ ] Callback dengan signature salah ditolak 400 dan tercatat di log.
- [ ] Callback yang sama dikirim 3× hanya diproses sekali (uji manual dengan curl).
- [ ] Callback dengan `amount` tidak cocok **tidak** menandai order lunas dan memunculkan log level error.
- [ ] Migration `transactions` jalan di Postgres; backfill terisi; alur RSVP lama diuji tetap normal.
