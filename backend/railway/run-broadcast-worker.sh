#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

CONNECTION="${QUEUE_CONNECTION:-database}"
case "${CONNECTION}" in
    sync|null)
        echo "Broadcast worker requires a persistent queue connection." >&2
        exit 1
        ;;
esac

if ! php -r 'exit((extension_loaded("pcntl") && function_exists("pcntl_alarm") && function_exists("pcntl_signal") && function_exists("pcntl_async_signals")) ? 0 : 1);'; then
    echo "Broadcast worker requires PHP PCNTL support (pcntl_alarm, pcntl_signal, pcntl_async_signals) to enforce --timeout=60." >&2
    echo "Set RAILPACK_PHP_EXTENSIONS=pcntl on the Railway worker service and redeploy it." >&2
    exit 1
fi

echo "Starting broadcast-only worker (queue: broadcasts)..."

# Intentionally fixed: never consume notifications or default here.
exec php artisan queue:work "${CONNECTION}" --queue=broadcasts --sleep=3 --tries=3 --timeout=60 --max-time=3600
