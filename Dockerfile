# Using PHP 8.3 for compatibility with Ubuntu server
FROM dunglas/frankenphp:1-php8.3-alpine AS base

# Update package index and install required system packages
RUN apk update && apk add --no-cache \
    curl \
    git \
    unzip \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    postgresql-client \
    postgresql-dev \
    libexif-dev \
    linux-headers \
    nodejs \
    npm

# Install PHP extensions
RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    zip \
    bcmath \
    gd \
    exif \
    intl \
    pcntl \
    redis \
    opcache

# Enable PHP production settings
RUN cp $PHP_INI_DIR/php.ini-production $PHP_INI_DIR/php.ini
COPY docker/php.ini $PHP_INI_DIR/conf.d/custom.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# ---------------------------------------------------------
# Final Image (assumes frontend is already built locally)
# ---------------------------------------------------------
FROM base

# Copy composer files and install dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --ignore-platform-reqs

# Copy application files (including pre-built frontend assets)
COPY . .

# Copy and setup entrypoint script
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create and configure necessary directories with proper permissions
RUN mkdir -p /app/storage/app \
    /app/storage/framework/cache \
    /app/storage/framework/sessions \
    /app/storage/framework/views \
    /app/storage/logs \
    /app/bootstrap/cache && \
    chown -R www-data:www-data /app && \
    chmod -R 755 /app && \
    chmod -R 775 /app/storage /app/bootstrap/cache

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD php /app/artisan tinker --execute="echo 'OK';" 2>&1 || exit 1

# Expose port 8001 for FrankenPHP/Octane
EXPOSE 8001

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
