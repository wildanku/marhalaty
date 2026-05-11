# 🤖 Telegram Bot Documentation

## Overview

Bot Telegram untuk **Dynamic Foundation** (`@dynamic87_bot`) membantu admin mengelola verifikasi pembayaran manual melalui pesan Telegram. Admin dapat menerima notifikasi bukti transfer dan melakukan approve/reject langsung dari Telegram.

**Bot Username:** `t.me/dynamic87_bot`  
**Bot Token:** `8667500913:AAEBtR2Hf7jdHbSbszbBerXmCFZlJ-AueOI`

---

## ✨ Features

### 1. **Payment Proof Notifications**

Ketika user upload bukti transfer, bot akan:

- Mengirim foto bukti pembayaran ke admin group
- Menampilkan detail lengkap:
  - Nama pendaftar
  - Email
  - Nama acara
  - Nominal pembayaran (Rp)
  - ID Transaksi
  - Waktu upload
  - Catatan user (jika ada)

### 2. **Admin Commands** (Dari Telegram)

Admin yang sudah di-whitelist bisa mengetik command langsung di group:

| Command                | Fungsi             | Contoh                         |
| ---------------------- | ------------------ | ------------------------------ |
| `approve <ID>`         | Setujui pembayaran | `approve 15`                   |
| `reject <ID> <reason>` | Tolak pembayaran   | `reject 15 Bukti kurang jelas` |

**Hasil Command:**

- ✅ Status RSVP & Transaction berubah menjadi "paid" atau "failed"
- ✅ Email konfirmasi otomatis dikirim ke user
- ✅ Quota package otomatis update

---

## 🔧 Setup & Configuration

### Prerequisites

- Laravel 11 (Project sudah ada)
- Telegram Bot Token (sudah ada: `8667500913:AAEBtR2Hf7jdHbSbszbBerXmCFZlJ-AueOI`)
- Public URL atau tunnel service (untuk webhook)

### Step 1: Configure `.env`

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=8667500913:AAEBtR2Hf7jdHbSbszbBerXmCFZlJ-AueOI
TELEGRAM_NOTIFY_CHAT_ID=-5112305117
```

**Note:**

- `TELEGRAM_BOT_TOKEN`: Token bot dari Telegram BotFather
- `TELEGRAM_NOTIFY_CHAT_ID`: Chat ID dari group/channel admin (negative number untuk private group)

### Step 2: Register Webhook

Telegram perlu tahu URL mana yang akan menerima update. Ada 3 cara setup:

#### **Option A: Production (HTTPS Domain)**

```bash
# Update APP_URL di .env
APP_URL=https://marhalaty.example.com

# Register webhook ke Telegram
php artisan telegram:set-webhook
```

**Output:**

```
✅ Webhook registered successfully!
  Webhook URL: https://marhalaty.example.com/telegram/webhook
```

#### **Option B: Development (Using ngrok)**

1. **Install ngrok** (jika belum):

```bash
# macOS
brew install ngrok

# Or download dari https://ngrok.com/download
```

2. **Start ngrok tunnel:**

```bash
ngrok http 8000
```

Akan muncul:

```
Forwarding                    https://xxxxx-xxxxx.ngrok.io -> http://localhost:8000
```

3. **Update .env:**

```env
APP_URL=https://xxxxx-xxxxx.ngrok.io
TELEGRAM_NOTIFY_CHAT_ID=-5112305117
```

4. **Register webhook:**

```bash
php artisan telegram:set-webhook
```

**⚠️ Note:** Setiap kali restart ngrok, URL berubah. Pastikan update `.env` dan jalankan `set-webhook` lagi.

#### **Option C: Check Webhook Status**

```bash
php artisan telegram:check-webhook
```

**Output:**

```
📊 Webhook Information:
  URL: https://marhalaty.example.com/telegram/webhook
  IP Address: 1.2.3.4
  Pending Updates: 0
  Last Error Date: None

🤖 Bot Information:
  Username: @dynamic87_bot
  First Name: DynaBOT
  Is Bot: Yes
```

---

## 👥 Admin Whitelist Management

Hanya admin yang di-whitelist yang bisa jalankan command. Setup whitelist:

### Via Database

```php
// Add admin ke whitelist
App\Models\TelegramWhitelist::create([
    'chat_id' => 123456789,  // Telegram user ID atau group ID
    'name'    => 'Admin Wildan',
    'is_active' => true,
]);

// Check apakah user di-whitelist
App\Models\TelegramWhitelist::isAllowed(123456789);  // true/false
```

### Get Your Telegram ID

1. **Personal ID:**
   - Kirim message ke bot: `@userinfobot`
   - Akan dapat `Your user ID: 123456789`

2. **Group ID:**
   - Tambahkan bot ke group
   - Kirim message apapun di group
   - Check logs: `storage/logs/laravel.log`
   - Cari `'from_id' => -123456789` (negatif = group)

---

## 📨 How It Works

### Payment Proof Upload Flow

```
User Upload Proof
    ↓
PaymentPageController::confirmationStore()
    ↓
TelegramService::notifyPaymentProof()
    ↓
Telegram Group gets notification with photo
    ↓
Admin types: "approve 15"
    ↓
TelegramWebhookController::handleApprove()
    ↓
Transaction status = "paid"
RSVP status = "paid"
Quota updated
Email sent to user
```

### Command Processing Flow

```
Admin types: "approve 15"
    ↓
TelegramWebhookController::handle()
    ↓
Check whitelist
    ↓
Parse command regex: /^approve\s+(\d+)$/
    ↓
handleApprove(15, chatId, messageId)
    ↓
Lock transaction for update
Update status, paid_at
Update proof review info
Update RSVP status
Dispatch email job
    ↓
Reply to admin with result
```

---

## 🔌 API Endpoints

### Webhook Endpoint

```
POST /telegram/webhook
```

- **Exempt dari CSRF** (verified by whitelist check)
- **Receives:** Telegram update JSON
- **Returns:** `200 OK` always (Telegram requirement)

### Configuration Routes

```
POST /telegram/webhook
      └─ TelegramWebhookController@handle
```

---

## 📋 Environment Variables

| Variable                  | Example                         | Keterangan                   |
| ------------------------- | ------------------------------- | ---------------------------- |
| `TELEGRAM_BOT_TOKEN`      | `8667500913:AA...`              | Token dari BotFather         |
| `TELEGRAM_NOTIFY_CHAT_ID` | `-5112305117`                   | Group/Channel chat ID        |
| `APP_URL`                 | `https://marhalaty.example.com` | Public domain atau ngrok URL |

---

## 🛠️ Artisan Commands

### `telegram:set-webhook`

Register webhook URL ke Telegram API.

```bash
php artisan telegram:set-webhook
```

**Output:**

```
🔗 Setting Telegram webhook...
  Bot Token: 8667500913...
  Webhook URL: https://marhalaty.example.com/telegram/webhook

✅ Webhook registered successfully!
```

### `telegram:check-webhook`

Check webhook status dan bot info.

```bash
php artisan telegram:check-webhook
```

**Output:**

```
📊 Webhook Information:
  URL: https://marhalaty.example.com/telegram/webhook
  IP Address: 1.2.3.4
  Pending Updates: 0
  Last Error Date: None

🤖 Bot Information:
  Username: @dynamic87_bot
  First Name: DynaBOT
  Is Bot: Yes
```

---

## 📝 Example: Admin Command Usage

### Approve Payment

**In Telegram Group:**

```
Admin: approve 15
```

**Bot Reply:**

```
✅ Transaksi #15 berhasil disetujui!

👤 Pendaftar: Wildan Maulana
💰 Nominal: Rp 500.000

Email konfirmasi telah dikirim ke peserta.
```

**What Happens:**

- ✅ Transaction #15: status = "paid", paid_at = now()
- ✅ RSVP: status = "paid"
- ✅ PaymentProof: reviewed_at = now(), review_note = "Disetujui via Telegram bot."
- ✅ Email confirmation sent to user
- ✅ Package quota incremented (booked_count++)

### Reject Payment

**In Telegram Group:**

```
Admin: reject 15 Bukti transfer tidak sesuai
```

**Bot Reply:**

```
🚫 Transaksi #15 ditolak.

👤 Pendaftar: Wildan Maulana
📝 Alasan: Bukti transfer tidak sesuai
```

**What Happens:**

- ✅ Transaction #15: status = "failed"
- ✅ RSVP: status = "failed"
- ✅ PaymentProof: reviewed_at = now(), review_note = "Bukti transfer tidak sesuai"
- ✅ Package quota NOT incremented

---

## 🔍 Troubleshooting

### Problem: Webhook Not Registered

**Check:**

```bash
php artisan telegram:check-webhook
```

**If URL is empty:**

- Pastikan `TELEGRAM_BOT_TOKEN` dan `APP_URL` benar di `.env`
- Pastikan `APP_URL` adalah HTTPS atau ngrok tunnel (bukan `http://localhost`)
- Jalankan: `php artisan telegram:set-webhook`

### Problem: Bot Tidak Terima Message

**Check:**

1. Bot di-add ke group sebagai admin
2. Check whitelist: user/group sudah di-add?
3. Check logs: `tail -f storage/logs/laravel.log | grep -i telegram`

### Problem: Command Tidak Bekerja

**Debug Steps:**

```bash
# 1. Check webhook status
php artisan telegram:check-webhook

# 2. Check logs
tail -f storage/logs/laravel.log

# 3. Verify whitelist
# Di tinker:
php artisan tinker
App\Models\TelegramWhitelist::all();
App\Models\TelegramWhitelist::isAllowed(123456789);
```

### Problem: Notification Tidak Terkirim

**Check:**

1. `TELEGRAM_NOTIFY_CHAT_ID` benar?
2. Bot di-add ke group/channel?
3. Bot punya permission `send_messages` dan `send_photos`?
4. File bukti proof ada? `storage/app/payment-proofs/{transaction_id}/...`

**Debug:**

```bash
# Check logs
grep "notifyPaymentProof" storage/logs/laravel.log

# Check file exists
ls -la storage/app/payment-proofs/
```

---

## 🔒 Security Notes

1. **Token Handling:**
   - Token disimpan di `.env` saja, tidak di commit
   - Jangan expose di frontend

2. **Whitelist Validation:**
   - Setiap command check whitelist terlebih dahulu
   - Hanya admin yang whitelisted bisa approve/reject
   - Log semua unauthorized attempts

3. **CSRF Exempt:**
   - Endpoint `/telegram/webhook` exempt dari CSRF
   - Aman karena Telegram API verified + whitelist validation

4. **Transaction Lock:**
   - Update transaction pakai `lockForUpdate()` untuk prevent race condition
   - Idempotent: jika approve 2x, yang kedua diabaikan

---

## 📚 Related Files

| File                                                                         | Fungsi                           |
| ---------------------------------------------------------------------------- | -------------------------------- |
| `app/Domains/Shared/Services/TelegramService.php`                            | Bot API client                   |
| `app/Domains/Shared/Controllers/TelegramWebhookController.php`               | Webhook handler & command parser |
| `app/Models/TelegramWhitelist.php`                                           | Admin whitelist model            |
| `database/migrations/2026_05_11_100000_create_telegram_whitelists_table.php` | Whitelist table                  |
| `app/Console/Commands/TelegramSetWebhook.php`                                | Register webhook command         |
| `app/Console/Commands/TelegramCheckWebhook.php`                              | Check webhook status command     |
| `routes/web.php`                                                             | Webhook route definition         |

---

## 🚀 Next Steps

- [ ] Add admin via database/tinker
- [ ] Setup ngrok tunnel untuk development
- [ ] Register webhook: `php artisan telegram:set-webhook`
- [ ] Test: Upload bukti pembayaran
- [ ] Test: Approve/reject dari Telegram
- [ ] Production: Setup domain HTTPS + DNS

---

## 📞 Support

Untuk issues atau pertanyaan, check:

1. Logs: `storage/logs/laravel.log`
2. Commands: `php artisan telegram:check-webhook`
3. Database: `SELECT * FROM telegram_whitelists;`

---

**Last Updated:** May 11, 2026  
**Bot Version:** 1.0.0  
**Framework:** Laravel 11, Telegram Bot API v7.10
