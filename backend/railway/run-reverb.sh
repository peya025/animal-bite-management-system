#!/usr/bin/env sh
set -eu

# Railway assigns the listening port via the $PORT environment variable.
# Reverb must bind to 0.0.0.0 and $PORT so Railway's edge reverse proxy
# can forward incoming public HTTPS/WSS (port 443) traffic to this container.
PORT="${PORT:-8080}"
HOST="${REVERB_SERVER_HOST:-0.0.0.0}"

echo "Starting Laravel Reverb WebSocket server on ${HOST}:${PORT}..."

if [ "${REVERB_DEBUG:-false}" = "true" ]; then
    exec php artisan reverb:start --host="${HOST}" --port="${PORT}" --debug
else
    exec php artisan reverb:start --host="${HOST}" --port="${PORT}"
fi
