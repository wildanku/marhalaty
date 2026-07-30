# 📦 Production Deployment Guide

Build di local → Push ke git → Deploy ke Dokploy (no rebuild needed)

## ✅ Sudah Disetup

### 1. `.gitignore`

- ✅ `/public/build/` → **INCLUDED** (built assets must be committed)
- ✅ `/node_modules` → ignored (tidak perlu di server)
- ✅ `/vendor` → ignored (composer install saat build)

### 2. `.dockerignore`

- Exclude dev files agar Docker build lebih cepat
- Exclude node_modules (sudah di-build)
- Exclude tests, logs, debug files

### 3. `Dockerfile`

- ❌ Hapus multi-stage build (no frontend build stage)
- ✅ Simple copy `.` (includes pre-built `/public/build`)
- ✅ Only install composer dependencies

### 4. `docker/entrypoint.sh`

- ✅ Verify `/app/public/build` exists (fail fast jika lupa build)
- ✅ Generate `.env` dari environment variables
- ✅ Run migrations
- ✅ Cache config & routes
- ✅ Start Octane

## 🚀 Local Development

```bash
# Install dependencies
pnpm install
composer install

# Start dev server
npm run dev

# OR Laravel Vite dev server
php artisan serve
```

## 📤 Pre-Deploy Checklist

```bash
# 1. Build frontend
pnpm build

# 2. Verify build output
ls -la public/build/

# 3. Commit everything
git add .
git commit -m "chore: build frontend assets"
git push origin main
```

## 🌐 Deploy to Dokploy

### Via Git Repository

1. Create new deployment in Dokploy
2. Connect to your git repo
3. Set environment variables (see DOKPLOY_ENV.md)
4. Deploy!

### Environment Variables Required

```
APP_NAME=Dynamic Foundation
APP_ENV=production
APP_KEY=base64:xxxxx
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=pgsql
DB_HOST=db-host
DB_DATABASE=marhalaty
DB_USERNAME=postgres
DB_PASSWORD=xxxxx

REDIS_HOST=redis-host
```

## 🔍 After Deployment

```bash
# Check container logs
docker logs <container-id>

# Expected output:
# ✅ Frontend assets verified
# 🔧 Generating .env...
# ✅ Database check complete
# 🔄 Running migrations...
# ✅ Migrations completed successfully
# 🎯 Caching config and routes...
# 🏥 Running health check...
# ✅ Health check passed
# 🚀 Starting Laravel Octane...
```

## ⚠️ Common Issues

| Issue                         | Solution                                |
| ----------------------------- | --------------------------------------- |
| ❌ Frontend assets not found  | Run `pnpm build` locally before pushing |
| ❌ 502 Bad Gateway            | Check Docker logs for error details     |
| ❌ Database connection failed | Verify DB_HOST, port, credentials       |
| ❌ Migrations failed          | Ensure schema is compatible             |

## 📝 Important Notes

- **Always build locally** - Server doesn't have npm/node
- **Commit `/public/build`** - Required for server deployment
- **Don't commit `/node_modules`** - Kept in .gitignore
- **Don't commit `.env`** - Generated at runtime
- **Environment variables** - Set in Dokploy, not in git

## ⚠️ Missing: Queue Worker & Cron Scheduler (action required before MVP2 Phase 5 works in prod)

`docker/entrypoint.sh` only starts Octane (`php artisan octane:start ...`) — as of this check, there
is **no process anywhere in this deployment that runs `php artisan queue:work` or
`php artisan schedule:run`**. This predates MVP2, but MVP2 makes it load-bearing:

- **Every notification email in the app** (`ShouldQueue` jobs across Events/Donation/Store — not
  just the new Store-module ones) sits in the `jobs` table forever unless something processes the
  queue.
- **`store:expire-orders`** (hourly) and **`store:complete-shipped`** (daily) are registered in
  `routes/console.php` and confirmed via `php artisan schedule:list`, but nothing calls
  `php artisan schedule:run` on a timer. Without it, abandoned checkouts never release their stock
  and shipped orders never auto-complete — silently, with no error to notice.

**Before relying on Phase 5 in production, add one of:**

1. A second Dokploy service running `php artisan queue:work --tries=3` (long-lived), **and**
2. Either a Dokploy cron/scheduled-task service running `php artisan schedule:run` every minute, or
   a supervisor process (e.g. `supervisord`) inside the same container that runs both Octane and a
   `while true; do php artisan schedule:run; sleep 60; done` loop.

Verify after deploying: `php artisan queue:work --once` actually sends a test email, and
`php artisan schedule:list` next-due times keep moving forward across container restarts (i.e. the
timer is actually firing, not just registered).
