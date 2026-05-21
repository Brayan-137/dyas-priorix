#!/bin/bash
set -e

# Verifica que vendor tenga contenido, no solo que el directorio exista
if [ ! -f "/var/www/vendor/autoload.php" ]; then
    echo "Instalando dependencias de composer..."
    composer install --no-dev --optimize-autoloader --working-dir=/var/www
fi

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf