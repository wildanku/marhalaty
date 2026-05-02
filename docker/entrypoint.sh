#!/bin/sh
set -e

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

SERVER_NAME="${SERVER_NAME:-0.0.0.0:8001}"
EOF

echo "✅ .env generated successfully"

# Wait for database to be ready
echo "⏳ Waiting for database..."
until nc -z -v -w30 ${DB_HOST:-127.0.0.1} ${DB_PORT:-5432}; do
  echo "Database is unavailable - sleeping..."
  sleep 1
done
echo "✅ Database is up"

# Clear old cache and logs
echo "🧹 Clearing old caches..."
rm -rf /app/bootstrap/cache/*.php 2>/dev/null || true
rm -rf /app/storage/cache/* 2>/dev/null || true

# Discover and cache packages
echo "📦 Discovering packages..."
php artisan package:discover --ansi || true

# Run migrations if DB_HOST is set (production)
if [ ! -z "$DB_HOST" ]; then
  echo "🔄 Running migrations..."
  php artisan migrate --force || echo "⚠️  Migrations failed or already run"
fi

# Cache config and routes for production
if [ "$APP_ENV" = "production" ]; then
  echo "🎯 Caching config and routes..."
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
fi

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data /app/storage /app/bootstrap/cache

# Start the application with Laravel Octane
echo "🚀 Starting Laravel Octane..."
exec php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8001
