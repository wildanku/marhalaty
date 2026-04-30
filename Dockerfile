FROM dunglas/frankenphp:1-php8.3-alpine AS base

# Install required system packages
RUN apk add --no-cache \
    curl \
    git \
    unzip \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
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
# Build frontend assets
# ---------------------------------------------------------
FROM base AS frontend
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ---------------------------------------------------------
# Final Image
# ---------------------------------------------------------
FROM base

# Copy composer files and install dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --ignore-platform-reqs

# Copy application files
COPY . .

# Copy built frontend assets
COPY --from=frontend /app/public/build ./public/build

# Run composer scripts safely
RUN composer run post-autoload-dump

# Ensure proper permissions
RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache

# Expose port 8000 for FrankenPHP/Octane
EXPOSE 8000

# Start Laravel Octane via FrankenPHP
CMD ["php", "artisan", "octane:start", "--server=frankenphp", "--host=0.0.0.0", "--port=8000"]
