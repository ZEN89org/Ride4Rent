#!/bin/bash
set -e

# Configure Apache to listen on Railway's dynamic PORT if provided
PORT="${PORT:-80}"
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -i "s/:80/:${PORT}/g" /etc/apache2/sites-available/000-default.conf

# Create storage symlink if not already linked
php artisan storage:link || true

# Run database migrations automatically in production
if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "Running migrations..."
    php artisan migrate --force || true
fi

# Optimize configuration and routes
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Starting Apache on port ${PORT}..."
exec apache2-foreground
