# Docker & Dokploy Environment Variables

Untuk menjalankan aplikasi di Dokploy, set environment variables berikut:

## Required (Wajib)

```
APP_NAME=Dynamic Everywhere
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=pgsql
DB_HOST=your-postgres-host
DB_PORT=5432
DB_DATABASE=marhalaty
DB_USERNAME=postgres
DB_PASSWORD=your-password

APP_KEY=base64:your-generated-key-here
```

## Optional (Opsional)

```
# Redis Cache & Queue (jika digunakan)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

# Mail Configuration
MAIL_DRIVER=log
MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME=Dynamic Everywhere

# Frontend
VITE_API_BASE_URL=https://yourdomain.com
```

## Generate APP_KEY

Jalankan di local machine terlebih dahulu:

```bash
php artisan key:generate --show
```

Copy output dan paste ke `APP_KEY` di Dokploy.

## Notes

- Jangan gunakan space atau tanda kutip dalam environment variable values
- Pastikan `APP_ENV=production` untuk production deployment
- Database harus sudah siap sebelum container start
- Migrations akan otomatis berjalan saat container start

---

## 🚀 Deployment Workflow

**Frontend di-build di local, publish ke server (NO BUILD DI SERVER)**

### Step 1: Build Frontend Locally

```bash
pnpm install
pnpm build
```

### Step 2: Commit & Push to Git

```bash
git add .
git commit -m "chore: build frontend assets"
git push origin main
```

**PENTING**: `/public/build/` harus ter-commit ke git karena server tidak akan build!

### Step 3: Deploy ke Dokploy

1. Di Dokploy, buat deployment dari git repository
2. Set environment variables (lihat required vars di atas)
3. Deploy akan otomatis:
   - Pull code (termasuk `/public/build/`)
   - Build Docker image
   - Run migrations
   - Start aplikasi

### Verifikasi Deployment

```bash
# Check container logs
docker logs <container-id>

# Seharusnya terlihat:
# ✅ Frontend assets verified
# 🚀 Starting Laravel Octane...
```

### Troubleshooting

**❌ Error: Frontend assets not found**

- Frontend belum di-build di local
- Jalankan: `pnpm build` dan push ulang

**❌ Error: Database connection failed**

- Pastikan DB_HOST, DB_PORT, credentials benar di Dokploy
- Database service sudah running

**❌ Error: 502 Bad Gateway**

- Check container logs untuk error detail
- Pastikan migrations berhasil
- Verify environment variables lengkap
