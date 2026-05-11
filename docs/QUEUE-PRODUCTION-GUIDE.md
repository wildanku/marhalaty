# Email Queue & Production Deployment Summary

## How Emails Flow in This Project

### Current Status: Database Queue + Sync Override (For Testing)

**Application Emails** (Event Registration, Payment):

```
User RSVP/Payment Event
↓
RsvpController/PaymentController
↓
Mail::to($email)->queue(new EventRegistrationConfirmed(...))
↓
**Queued to `jobs` table** (database driver)
↓
Awaits queue:work process
↓
Brevo SMTP → Inbox
```

**Test Emails** (via /god-mode/email-tester):

```
Admin sends test → EmailTesterController
↓
Mail::mailer('sync')->to($email)->send(...)
↓
**Sent immediately** (bypasses queue)
↓
Brevo SMTP → Returns result instantly
```

---

## Two Production Deployment Options

### Option A: SYNC QUEUE (✓ Simple, Recommended for MVP)

**What it does:**

- All emails sent immediately via SMTP
- No database queue, no queue worker needed
- Fast feedback if email fails
- **Blocks the user request if SMTP is slow**

**Setup:**

```bash
# 1. Update .env
echo "QUEUE_CONNECTION=sync" >> .env

# 2. Clear config cache
php artisan config:clear && php artisan config:cache

# 3. Deploy and restart app
```

**Verification:**

```bash
php artisan debug:email-queue
# Should show: "Mailer: smtp", no queue worker check
```

**Pros & Cons:**

- ✅ Simple to deploy (no supervisor needed)
- ✅ Immediate error feedback
- ✅ No background processes to maintain
- ✅ Good for <1000 emails/day
- ❌ Slow SMTP (100-200ms) blocks user request
- ❌ No automatic retry on SMTP failure

---

### Option B: DATABASE QUEUE + SUPERVISOR (✓ Production-Grade, Recommended for Growth)

**What it does:**

- Emails queued to database table
- Background worker processes them
- Automatic retries (3 attempts by default)
- Never blocks user request
- Supervisor keeps worker alive

**Setup on Ubuntu:**

#### 1. Install Supervisor

```bash
sudo apt-get update
sudo apt-get install supervisor -y
```

#### 2. Create Worker Config

```bash
sudo nano /etc/supervisor/conf.d/laravel-worker.conf
```

Copy this:

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/marhalaty/artisan queue:work database --sleep=3 --tries=3 --timeout=90
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
numprocs=1
redirect_stderr=true
stdout_logfile=/var/log/laravel-worker.log
stopwaitsecs=3600
environment=PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",HOME="/root",LOGNAME="root"
```

#### 3. Start Worker

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*

# Check status
sudo supervisorctl status laravel-worker

# View logs
tail -f /var/log/laravel-worker.log
```

#### 4. Update .env (Keep Database Queue)

```bash
# Already set, no changes needed:
QUEUE_CONNECTION=database
```

**Verification:**

```bash
# Check pending jobs
php artisan queue:monitor-emails

# Sample output:
# Queue Driver: database
# Pending Jobs: 0
# Failed Jobs: 0
# [OK] No stuck jobs
# [OK] Queue Worker: Running
```

**Pros & Cons:**

- ✅ Never blocks user requests
- ✅ Automatic retry on failure
- ✅ Good for high volume (10,000+ emails/day)
- ✅ Failed jobs tracked (can be retried later)
- ✅ Production-grade reliability
- ❌ Requires supervisor process running 24/7
- ❌ More complex to debug
- ❌ Stuck jobs need manual cleanup

---

## Monitoring & Debugging

### Real-Time Queue Monitor

```bash
# Watch queue health continuously
php artisan queue:monitor-emails

# With custom interval
php artisan queue:monitor-emails --interval=10
```

### Check Queue Status

```bash
php artisan debug:email-queue
```

### Inspect Jobs Table

```bash
php artisan tinker

# Count pending jobs
>>> DB::table('jobs')->count()

# See oldest 5 jobs
>>> DB::table('jobs')
    ->orderBy('created_at')
    ->limit(5)
    ->get(['id', 'queue', 'created_at', 'attempts'])

# Count failed jobs
>>> DB::table('failed_jobs')->count()

# View failed job details
>>> DB::table('failed_jobs')->latest()->first()
```

### Clean Stuck Jobs (if any)

```bash
php artisan tinker

# Delete jobs stuck for >2 hours
>>> DB::table('jobs')
    ->where('created_at', '<', now()->subHours(2))
    ->delete()

# Retry all failed jobs
>>> Illuminate\Support\Facades\Artisan::call('queue:retry all')
```

### Check Queue Worker Status

```bash
# If using supervisor
sudo supervisorctl status laravel-worker

# View queue worker logs
sudo tail -100f /var/log/laravel-worker.log

# If process crashed
sudo supervisorctl restart laravel-worker:*
```

---

## Email Flow Comparison

| Step                     | SYNC Queue              | DATABASE Queue + Supervisor |
| ------------------------ | ----------------------- | --------------------------- |
| **User triggers action** | Email sent immediately  | Job queued to database      |
| **SMTP connection**      | Opens (might be slow)   | Worker opens (async)        |
| **User sees response**   | Waits for SMTP response | Gets instant response       |
| **If SMTP down**         | User sees error         | Job retries automatically   |
| **Latency**              | 100-500ms (blocking)    | <50ms (non-blocking)        |
| **Failed emails**        | Lost                    | Tracked & retried           |
| **Monitoring**           | Brevo logs only         | Brevo + jobs table          |

---

## Migration Path: Sync → Database + Supervisor

When you outgrow SYNC queue:

```bash
# 1. Install supervisor (background process)
sudo apt-get install supervisor -y

# 2. Copy worker config
sudo cp docker/supervisor/laravel-worker.conf /etc/supervisor/conf.d/

# 3. Change .env to database queue
sed -i 's/QUEUE_CONNECTION=sync/QUEUE_CONNECTION=database/' .env

# 4. Clear config & restart supervisor
php artisan config:clear && php artisan config:cache
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl start laravel-worker:*

# 5. Test & monitor
php artisan queue:monitor-emails
```

No code changes needed - emails automatically use new queue setup!

---

## Troubleshooting Common Issues

### "200 OK but email not arriving"

```bash
# Check queue driver
php artisan debug:email-queue

# If using database queue
ps aux | grep "queue:work"  # Check if worker is running

# Manually process queue
php artisan queue:work database --once
```

### Emails stuck in jobs table

```bash
php artisan tinker
>>> DB::table('jobs')
    ->where('created_at', '<', now()->subHours(1))
    ->delete()  # Clean old stuck jobs
```

### "Connection to SMTP failed"

```bash
# Test SMTP config directly
php artisan tinker
>>> Mail::mailer('sync')->to('test@example.com')->send(
    new App\Mail\TestEmail()
)
# Check error message
```

### Queue worker died unexpectedly

```bash
# Check logs
tail -50 /var/log/laravel-worker.log

# Restart via supervisor
sudo supervisorctl restart laravel-worker:*

# Or run manually to see errors
php artisan queue:work database --verbose
```

---

## Decision: Which Option for Your Production?

**Use SYNC if:**

- ✓ You're just launching (MVP phase)
- ✓ <1000 emails per day
- ✓ Email reliability not critical yet
- ✓ Want simplest deployment

**Use DATABASE + SUPERVISOR if:**

- ✓ Going live with real users
- ✓ Email delivery is critical (payment confirmations, RSVPs)
- ✓ You want automatic retry logic
- ✓ Plan to scale (10,000+ emails)

---

## Current Codebase Files

| File                                                        | Purpose            | When Used                            |
| ----------------------------------------------------------- | ------------------ | ------------------------------------ |
| `app/Domains/Event/Controllers/RsvpController.php`          | Event registration | Sends `Mail::queue(...)` on RSVP     |
| `app/Domains/GodMode/Controllers/EmailTesterController.php` | Testing tool       | `/god-mode/email-tester` forces sync |
| `app/Console/Commands/MonitorEmailQueue.php`                | Queue monitoring   | `php artisan queue:monitor-emails`   |
| `app/Console/Commands/DebugEmailQueue.php`                  | Diagnostic tool    | `php artisan debug:email-queue`      |
| `docker/supervisor/laravel-worker.conf`                     | Supervisor config  | Production supervisor setup          |
| `docs/7.queue-configuration.md`                             | Full guide         | Reference documentation              |

---

## Next Steps for Production

1. **Decide:** SYNC or DATABASE + SUPERVISOR?
2. **If SYNC:**
   - Add `QUEUE_CONNECTION=sync` to production .env
   - Deploy and test
3. **If DATABASE + SUPERVISOR:**
   - Install supervisor on Ubuntu server
   - Copy `docker/supervisor/laravel-worker.conf` to `/etc/supervisor/conf.d/`
   - Run `sudo supervisorctl reread && update && start laravel-worker:*`
   - Monitor with `php artisan queue:monitor-emails`

**That's it!** All emails will then use your chosen queue configuration automatically.
