FROM php:8.3-fpm

RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev \
    libzip-dev zip unzip nginx supervisor \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install \
    pdo_mysql mbstring exif pcntl bcmath gd zip opcache

RUN pecl install redis && docker-php-ext-enable redis

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .

RUN composer install --no-dev --optimize-autoloader

RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

# Create a non-root user to run the application
ARG UID=1000
ARG GID=1000

RUN groupadd -g ${GID} appgroup && \
    useradd -u ${UID} -g appgroup -m appuser

# Give the new user ownership of the necessary directories
RUN mkdir -p /var/log/supervisor /var/run /run/nginx \
        /var/lib/nginx/body \
        /var/lib/nginx/fastcgi \
        /var/lib/nginx/proxy \
        /var/lib/nginx/scgi \
        /var/lib/nginx/uwsgi \
        /var/log/nginx \
    && chown -R appuser:appgroup \
        /var/log/supervisor \
        /var/run \
        /run/nginx \
        /var/lib/nginx \
        /var/log/nginx \
    && touch /run/nginx.pid /var/run/supervisord.pid \
    && chown appuser:appgroup /run/nginx.pid /var/run/supervisord.pid

USER appuser

ENTRYPOINT ["/entrypoint.sh"]
