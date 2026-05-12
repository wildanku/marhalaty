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

## � Quick Start (TL;DR)

```bash
# 1. Check if setup is correct
php artisan telegram:debug

# 2. Get your Telegram ID from @userinfobot, then add to whitelist
php artisan telegram:whitelist add --chat-id=YOUR_ID --name="Your Name"

# 3. Test in Telegram group
# Type: approve 9

# 4. If no response, check logs
tail -f storage/logs/laravel.log | grep telegram
```

---

## �🔧 Setup & Configuration

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

Hanya admin yang di-whitelist yang bisa jalankan command. Setup whitelist punya 2 cara:

### Via Artisan Command (Recommended)

#### **List Whitelist**

```bash
php artisan telegram:whitelist list
```

**Output:**

```
👥 Telegram Admin Whitelist:

| Chat ID     | Name          | Status      | Added               |
|-------------|---------------|-------------|---------------------|
| 123456789   | Admin Wildan  | ✅ Active   | 2026-05-11 10:30    |
| 987654321   | Admin Budi    | ⛔ Inactive | 2026-05-10 15:45    |
```

#### **Add Admin**

```bash
php artisan telegram:whitelist add --chat-id=123456789 --name="Admin Wildan"
```

**Output:**

```
✅ Added to whitelist: Admin Wildan (123456789)

Now this admin can use:
  • approve <transaction_id>
  • reject <transaction_id> <reason>
```

#### **Remove Admin**

```bash
php artisan telegram:whitelist remove --chat-id=123456789
```

#### **Toggle Active Status**

```bash
php artisan telegram:whitelist toggle --chat-id=123456789
```

### Via Database (Manual)

```php
// Add admin ke whitelist
App\Models\TelegramWhitelist::create([
    'chat_id' => 123456789,  // Telegram user ID
    'name'    => 'Admin Wildan',
    'is_active' => true,
]);

// Check apakah user di-whitelist
App\Models\TelegramWhitelist::isAllowed(123456789);  // true/false

// List all
App\Models\TelegramWhitelist::all();
```

### 🆔 How to Find Your Telegram ID

**PENTING:** Ada 2 tipe ID:

- **User ID**: Positif (123456789) - untuk personal chat
- **Group ID**: Negatif (-123456789) - untuk private group

Gunakan **User ID** untuk approve command, bukan group ID!

#### **Step 1: Get User ID**

1. Buka Telegram
2. Search: `@userinfobot`
3. Click `/start`
4. Bot akan reply: `Your user ID: 123456789` ← Copy ini!

#### **Step 2: Add to Whitelist**

```bash
php artisan telegram:whitelist add --chat-id=123456789 --name="Nama Anda"
```

**⚠️ Common Mistakes:**

- ❌ Using group ID (-123456789) → Won't work
- ❌ Using username (@username) → Won't work
- ✅ Using numeric user ID (123456789) → Correct!

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

### `telegram:group-members`

Lihat list member Telegram group dengan ID-nya, langsung bisa copy-paste untuk whitelist.

```bash
php artisan telegram:group-members
```

**Output:**

```
🔍 Mengambil informasi group Telegram...

📊 Group Information:
   Title: Dynamic Muleh
   Type: group
   Chat ID: -5112305117
   Members: N/A

👥 Group Administrators:

+------------+---------+----------------+---------------+
| ID         | Name    | Username       | Role          |
+------------+---------+----------------+---------------+
| 8185420712 | MZA     | N/A            | Administrator |
| 7729297845 | Er Din  | N/A            | Administrator |
| 5887287141 | ~       | @suryaasap     | Administrator |
| 8667500913 | DynaBOT | @dynamic87_bot | Administrator |
| 884434430  | Wildan  | @wildanma      | Creator       |
+------------+---------+----------------+---------------+

💡 Untuk menambahkan ke whitelist, gunakan:
   php artisan telegram:whitelist add --chat-id=8185420712 --name="MZA"
   php artisan telegram:whitelist add --chat-id=7729297845 --name="Er Din"
   php artisan telegram:whitelist add --chat-id=5887287141 --name="~"
   php artisan telegram:whitelist add --chat-id=8667500913 --name="DynaBOT"
   php artisan telegram:whitelist add --chat-id=884434430 --name="Wildan"

✅ Done!
```

**Gunakan ketika:**

- Setup awal - lihat siapa aja yang admin di group
- Ingin menambah member baru ke whitelist
- Copy-paste command langsung ke terminal

---

### `telegram:debug`

Check Telegram bot setup status dan whitelist.

```bash
php artisan telegram:debug
```

**Output:**

```
🔍 Telegram Bot Debug Information

📋 Configuration:
  Bot Token: ✅ 8667500913:AAEBtR2...
  Notify Chat ID: ✅ -5112305117
  App URL: ✅ https://marhalaty.example.com

👥 Whitelist Status:
  Total active admins: 1
  ✅ ID: 123456789 | Name: Admin Wildan

✅ Next Steps:
  1. ✅ All config ready!
  2. Add your chat_id to whitelist (if not already)
  3. Test approve command: Type 'approve 9' in Telegram group
  4. Check logs: tail -f storage/logs/laravel.log
```

**Gunakan ketika:**

- Setup awal bot
- Debug kenapa command tidak bekerja
- Verify config dan whitelist

---

### `telegram:whitelist`

Manage admin whitelist.

```bash
# List semua admin
php artisan telegram:whitelist list

# Add admin baru
php artisan telegram:whitelist add --chat-id=123456789 --name="Admin Name"

# Remove admin
php artisan telegram:whitelist remove --chat-id=123456789

# Toggle active/inactive
php artisan telegram:whitelist toggle --chat-id=123456789
```

**Contoh lengkap:**

```bash
# Add admin
php artisan telegram:whitelist add --chat-id=123456789 --name="Admin Wildan"

# Verify
php artisan telegram:whitelist list

# Disable jika perlu
php artisan telegram:whitelist toggle --chat-id=123456789

# Remove
php artisan telegram:whitelist remove --chat-id=123456789
```

---

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

---

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

### Approve Payment (Success)

**In Telegram Group:**

```
Admin: approve 15
```

**Bot Reply:**

```
✅ Transaksi #15 berhasil disetujui!

👤 Pendaftar: Wildan Maulana
💰 Nominal: Rp 500.000
📧 Email: wildan@example.com

✉️ Email konfirmasi telah dikirim ke peserta.
```

**What Happens:**

- ✅ Transaction #15: status = "paid", paid_at = now()
- ✅ RSVP: status = "paid"
- ✅ PaymentProof: reviewed_at = now(), review_note = "Disetujui via Telegram bot."
- ✅ Email confirmation sent to user
- ✅ Package quota incremented (booked_count++)
- ✅ Logged with transaction details

### Approve Payment (Error - Transaction Not Found)

**Bot Reply:**

```
❌ Transaksi tidak ditemukan

Transaksi #15 tidak ada atau sudah diproses sebelumnya.
```

### Approve Payment (Unauthorized User)

**Bot Reply:**

```
🔒 Anda tidak memiliki otorisasi untuk menjalankan command ini.

Hubungi admin untuk akses.
```

**Solusi:**

```bash
# Get your Telegram ID dari @userinfobot
php artisan telegram:whitelist add --chat-id=YOUR_ID --name="Your Name"
```

### Approve Payment (Format Error)

**In Telegram Group:**

```
Admin: approve abc
```

**Bot Reply:**

```
⚠️ Format salah.

Gunakan:
• approve <ID>
• reject <ID> <alasan>

Contoh:
approve 9
reject 9 Bukti kurang jelas
```

---

### Reject Payment

**In Telegram Group:**

```
Admin: reject 15 Bukti transfer tidak sesuai
```

**Bot Reply:**

```
🚫 Transaksi #15 ditolak

👤 Pendaftar: Wildan Maulana
📧 Email: wildan@example.com
📝 Alasan Penolakan:
Bukti transfer tidak sesuai
```

**What Happens:**

- ✅ Transaction #15: status = "failed"
- ✅ RSVP: status = "failed"
- ✅ PaymentProof: reviewed_at = now(), review_note = "Bukti transfer tidak sesuai"
- ✅ Package quota NOT incremented
- ✅ Logged with reason

---

## 🔍 Troubleshooting

### ✅ Quick Diagnosis

Jalankan command ini untuk check setup:

```bash
php artisan telegram:debug
```

Jika melihat:

- ✅ All green → Setup OK, test command di Telegram
- ❌ Red X → Fix sesuai error message
- ⚠️ No admins in whitelist → Add your ID

---

### Problem: Unauthorized Access (🔒 Response)

**Symptom:** Bot reply dengan `🔒 Anda tidak memiliki otorisasi...`

**Root Cause:** Chat ID tidak di-whitelist atau tidak cocok

**Fix:**

```bash
# Step 1: Get your Telegram ID
# Chat dengan @userinfobot → Your user ID: 123456789

# Step 2: Check whitelist
php artisan telegram:whitelist list

# Step 3: Add your ID
php artisan telegram:whitelist add --chat-id=123456789 --name="Your Name"

# Step 4: Test again - type "approve 9" di Telegram
```

**⚠️ Important:**

- Gunakan **User ID** (positif), bukan group ID (negatif)
- Format: angka saja, tanpa @ atau simbol lain
- Jangan pakai username, pakai ID dari @userinfobot

---

### Problem: Command Not Found (❌ Transaksi tidak ditemukan)

**Symptom:** Bot reply dengan `❌ Transaksi tidak ditemukan...`

**Root Cause:** Transaction dengan ID tersebut tidak ada atau sudah processed

**Fix:**

```bash
# Check apakah transaction ada
php artisan tinker
> Transaction::where('id', 9)->first();

# Jika ada, cek status
> Transaction::where('id', 9)->first()->status;
// Harus: "pending"

# Jika tidak pending, buat transaction baru:
# User harus upload bukti pembayaran lagi
```

---

### Problem: Command Format Error (⚠️ Format salah)

**Symptom:** Bot reply dengan `⚠️ Format salah` message

**Root Cause:** Command format tidak sesuai regex

**Correct Format:**

```
approve 9
approve 15
reject 9 Bukti kurang jelas
reject 15 Nominal tidak sesuai
```

**Wrong Format:**

```
❌ approve #9          (jangan pakai #)
❌ approve (9)         (jangan pakai parentheses)
❌ reject 9            (harus ada alasan)
❌ 9 approve           (order salah)
```

---

### Problem: Webhook Not Receiving Updates

**Symptom:** Command tidak masuk, tidak ada log

**Check:**

```bash
# 1. Webhook status
php artisan telegram:check-webhook

# 2. Check APP_URL benar
cat .env | grep APP_URL

# 3. Register ulang
php artisan telegram:set-webhook

# 4. Monitor logs real-time
tail -f storage/logs/laravel.log | grep -i telegram
```

**⚠️ Requirements:**

- ✅ `APP_URL` harus HTTPS atau ngrok tunnel
- ✅ ❌ Bukan `http://localhost:8000`
- ✅ URL publicly accessible

---

### Problem: Webhook Registered Tapi No Response

**Symptom:**

- Webhook URL valid (checked via `telegram:check-webhook`)
- Bot in group as admin
- Type command, no reply

**Debug Steps:**

```bash
# Step 1: Real-time logs
tail -f storage/logs/laravel.log

# Step 2: Type command in Telegram
# In Telegram group: approve 9

# Step 3: Look for log like:
# [2026-05-11 XX:XX:XX] local.INFO: Telegram message received
```

**If NO log appears:**

- ❌ Webhook tidak setup benar
- Solution: `php artisan telegram:set-webhook` dan restart

**If log appears but no reply:**

- ❌ Authorization failed
- Solution: Check whitelist dengan `php artisan telegram:whitelist list`

**If log shows "unauthorized":**

- ❌ Chat ID tidak di-whitelist
- Solution: Add chat_id ke whitelist

---

### Problem: Notification Tidak Terkirim (Payment Proof)

**Symptom:** User upload bukti, tapi tidak ada notifikasi ke admin group

**Check:**

1. **Bot added to group?**

   ```bash
   # Manual: Add bot (@dynamic87_bot) ke group
   ```

2. **Bot punya permissions?**

   ```bash
   # Manual: Make bot admin in group (untuk send photos)
   ```

3. **Config correct?**

   ```bash
   cat .env | grep TELEGRAM_NOTIFY_CHAT_ID
   # Harus negatif: -5112305117
   ```

4. **File exists?**

   ```bash
   ls -la storage/app/payment-proofs/
   ```

5. **Check logs:**
   ```bash
   grep "notifyPaymentProof" storage/logs/laravel.log
   ```

---

### Problem: Error on Approve (❌ Error saat approve)

**Symptom:** Bot reply dengan error message dengan code

**What Happened:**

- Exception thrown di handleApprove()
- Admin sudah dinotifikasi (log)
- User told to retry atau contact developer

**Debug:**

```bash
# Check full error in logs
tail -f storage/logs/laravel.log

# Look for: "Telegram approve command failed"
# Will show full stack trace
```

**Common Errors:**

| Error                            | Cause                   | Fix                                          |
| -------------------------------- | ----------------------- | -------------------------------------------- |
| `Call to undefined method...`    | Code issue              | Check file edits, run `php artisan optimize` |
| `SQLSTATE[...]`                  | Database issue          | Run `php artisan migrate`                    |
| `No query results found`         | Transaction missing     | Upload proof lagi                            |
| `Integrity constraint violation` | Duplicate status update | Usually safe to retry                        |

---

### Problem: Multiple Admins, One Gets Error

**Symptom:**

- Admin A: "approve 9" → Works ✅
- Admin B: "approve 9" → Error ❌

**Root Cause:** Race condition atau transaction already locked

**Solution:** Retry dengan transaction ID yang berbeda

---

### Full Debug Workflow

Gunakan sequence ini untuk solve apapun:

```bash
# 1. Check overall setup
php artisan telegram:debug

# 2. Check webhook
php artisan telegram:check-webhook

# 3. Check whitelist
php artisan telegram:whitelist list

# 4. Check specific transaction
php artisan tinker
> Transaction::find(9);

# 5. Monitor logs
tail -f storage/logs/laravel.log

# 6. Try command in Telegram
# Type: approve 9

# 7. Check logs untuk hasil
# grep "Telegram message received" storage/logs/laravel.log
```

---

## 📊 Logging

All Telegram events logged ke `storage/logs/laravel.log`:

```
[channel] [level] [time] [message] [context]

# Message received
[local] [INFO] [2026-05-11 10:30:45] Telegram message received {"chat_id":-5112305117,"from_id":123456789,"message_id":999,"text":"approve 9","chat_type":"supergroup"}

# Authorization check
[local] [WARNING] [2026-05-11 10:30:46] Telegram webhook: unauthorized sender {"from_id":987654321,"chat_id":-5112305117}

# Processing
[local] [INFO] [2026-05-11 10:30:47] Processing approve request {"transaction_id":9,"from_id":123456789,"chat_id":-5112305117}

# Success
[local] [INFO] [2026-05-11 10:30:48] Transaction approved via Telegram bot {"transaction_id":9,"approved_by":123456789,"user_name":"Wildan Maulana","amount":"500000"}

# Error
[local] [ERROR] [2026-05-11 10:30:49] Telegram approve command failed {"transaction_id":9,"from_id":123456789,"error":"...","trace":"..."}
```

**Tip:** Filter specific events

```bash
# Only approve commands
grep "approve" storage/logs/laravel.log | tail -20

# Only errors
grep "ERROR.*Telegram" storage/logs/laravel.log

# Real-time monitoring
tail -f storage/logs/laravel.log | grep -i "telegram\|approve\|reject"
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
| `app/Console/Commands/TelegramDebugCommand.php`                              | Debug bot setup (NEW)            |
| `app/Console/Commands/TelegramWhitelistCommand.php`                          | Manage whitelist (NEW)           |
| `app/Console/Commands/TelegramGroupMembersCommand.php`                       | List group members & IDs (NEW)   |
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
**Bot Version:** 1.1.0 (Enhanced with debug commands & whitelist management)  
**Framework:** Laravel 11, Telegram Bot API v7.10

---

## ⚡ Quick Reference

### Most Used Commands

```bash
# Check setup
php artisan telegram:debug

# Lihat list member & ID-nya
php artisan telegram:group-members

# List admins di whitelist
php artisan telegram:whitelist list

# Add admin
php artisan telegram:whitelist add --chat-id=123456789 --name="Name"

# Check webhook
php artisan telegram:check-webhook

# View logs
tail -f storage/logs/laravel.log | grep -i telegram
```

### Most Used Telegram Commands

```
approve 9
reject 9 Bukti tidak jelas
```

### Get Help

```bash
# Detailed webhook info
php artisan telegram:check-webhook

# Whitelist help
php artisan telegram:whitelist

# Full debug info
php artisan telegram:debug
```
