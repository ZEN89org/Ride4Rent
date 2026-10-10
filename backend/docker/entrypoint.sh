#!/bin/bash
set -e

PORT="${PORT:-80}"

# Configure Apache to listen on 80, 8080, and $PORT
cat << EOF > /etc/apache2/ports.conf
Listen 80
Listen 8080
EOF

if [ "$PORT" != "80" ] && [ "$PORT" != "8080" ]; then
    echo "Listen ${PORT}" >> /etc/apache2/ports.conf
fi

cat << EOF > /etc/apache2/sites-available/000-default.conf
<VirtualHost *:80 *:8080 *:${PORT}>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html/public

    <Directory /var/www/html/public>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Ensure storage directories exist and are writable
mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Create storage symlink
php artisan storage:link || true

# Run database migrations in production
if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "Running migrations..."
    php artisan migrate --force || true
fi

# Clear and optimize cache
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Starting Apache on port ${PORT} (and 80/8080)..."
exec apache2-foreground
