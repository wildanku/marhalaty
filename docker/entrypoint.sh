#!/bin/sh

# Verify built frontend assets exist
if [ ! -d "/app/public/build" ]; then
  echo "❌ ERROR: Frontend assets not found at /app/public/build"
  echo "Please run 'pnpm build' locally before deploying!"
  exit 1
fi
echo "✅ Frontend assets verified"

# Generate .env file from environment variables
echo "🔧 Generating .env from environment variables..."
cat > /app/.env << EOF
APP_NAME="${APP_NAME:-Laravel}"
APP_ENV="${APP_ENV:-production}"
APP_KEY="${APP_KEY}"
APP_DEBUG="${APP_DEBUG:-false}"
APP_URL="${APP_URL:-http://localhost}"

DB_CONNECTION="${DB_CONNECTION:-pgsql}"
DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE}"
DB_USERNAME="${DB_USERNAME}"
DB_PASSWORD="${DB_PASSWORD}"

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PASSWORD="${REDIS_PASSWORD}"
REDIS_PORT="${REDIS_PORT:-6379}"

CACHE_DRIVER="${CACHE_DRIVER:-redis}"
QUEUE_CONNECTION="${QUEUE_CONNECTION:-redis}"
SESSION_DRIVER="${SESSION_DRIVER:-redis}"

MAIL_DRIVER="${MAIL_DRIVER:-log}"
MAIL_HOST="${MAIL_HOST}"
MAIL_PORT="${MAIL_PORT}"
MAIL_USERNAME="${MAIL_USERNAME}"
MAIL_PASSWORD="${MAIL_PASSWORD}"
MAIL_FROM_ADDRESS="${MAIL_FROM_ADDRESS}"
MAIL_FROM_NAME="${MAIL_FROM_NAME}"

VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8000}"
EOF

if [ $? -ne 0 ]; then
  echo "❌ Failed to generate .env"
  exit 1
fi
echo "✅ .env generated successfully"

# Wait for database to be ready (with timeout)
if [ ! -z "$DB_HOST" ]; then
  echo "⏳ Waiting for database at $DB_HOST:${DB_PORT:-5432}..."
  timeout=0
  until nc -z -v -w30 ${DB_HOST} ${DB_PORT:-5432} 2>/dev/null; do
    timeout=$((timeout + 1))
    if [ $timeout -gt 30 ]; then
      echo "⚠️  Database timeout, continuing anyway..."
      break
    fi
    echo "Database is unavailable - sleeping... (attempt $timeout/30)"
    sleep 1
  done
  echo "✅ Database check complete"
fi

# Discover packages
echo "📦 Discovering packages..."
php artisan package:discover --ansi 2>&1 || echo "⚠️  Package discovery completed with warnings"

# Clear old cache
echo "🧹 Clearing old caches..."
rm -rf /app/bootstrap/cache/*.php 2>/dev/null || true
rm -rf /app/storage/cache/* 2>/dev/null || true

# Run migrations only if DB_HOST is explicitly set
if [ ! -z "$DB_HOST" ]; then
  echo "🔄 Running migrations..."
  if php artisan migrate --force --no-interaction 2>&1; then
    echo "✅ Migrations completed successfully"
  else
    echo "⚠️  Migrations failed or already applied (continuing startup...)"
  fi
fi

# Cache config and routes for production
if [ "$APP_ENV" = "production" ]; then
  echo "🎯 Caching config and routes..."
  if ! php artisan config:cache; then
    echo "❌ Config cache failed"
    exit 1
  fi
  
  if ! php artisan route:cache; then
    echo "❌ Route cache failed"
    exit 1
  fi
  
  php artisan view:cache 2>&1 || echo "⚠️  View cache completed with warnings"
fi

# Set proper permissions (may fail if not root, that's okay)
echo "🔐 Setting permissions..."
chown -R www-data:www-data /app/storage /app/bootstrap/cache 2>/dev/null || echo "⚠️  Could not change ownership (running as different user)"

# Health check: verify the app can be accessed
echo "🏥 Running health check..."
if ! php artisan tinker --execute="echo 'OK';" > /dev/null 2>&1; then
  echo "❌ Health check failed - app cannot run commands"
  exit 1
fi
echo "✅ Health check passed"

# Start the application with Laravel Octane
echo "🚀 Starting Laravel Octane on 0.0.0.0:8001..."
exec php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8001
