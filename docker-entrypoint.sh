#!/bin/sh
# Railway inyecta la variable PORT en tiempo de ejecución.
# Sustituimos el placeholder en la config de nginx y arrancamos.
PORT="${PORT:-8080}"
sed -i "s/PORT_PLACEHOLDER/$PORT/g" /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
