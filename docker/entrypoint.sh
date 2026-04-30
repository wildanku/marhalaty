#!/bin/sh
set -e

# Wait for database to be ready
echo "⏳ Waiting for database..."
until nc -z -v -w30 ${DB_HOST:-127.0.0.1} ${DB_PORT:-5432}; do
  echo "Database is unavailable - sleeping..."
  sleep 1
done
echo "✅ Database is up"

# Discover and cache packages
echo "📦 Discovering packages..."
php artisan package:discover --ansi || true

# Run migrations if DB_HOST is set (production)
if [ ! -z "$DB_HOST" ]; then
  echo "🔄 Running migrations..."
  php artisan migrate --force
fi

# Start the application
echo "🚀 Starting Laravel Octane..."
exec php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000
