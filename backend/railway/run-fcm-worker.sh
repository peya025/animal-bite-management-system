#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

CONNECTION="${FCM_QUEUE_CONNECTION:-${MESSAGING_QUEUE_CONNECTION:-${QUEUE_CONNECTION:-database}}}"
case "${CONNECTION}" in
    sync|null)
        echo "FCM worker requires a persistent queue connection." >&2
        exit 1
        ;;
esac

if ! php -r 'exit((extension_loaded("pcntl") && function_exists("pcntl_alarm") && function_exists("pcntl_signal") && function_exists("pcntl_async_signals")) ? 0 : 1);'; then
    echo "FCM worker requires PHP PCNTL support (pcntl_alarm, pcntl_signal, pcntl_async_signals) to enforce --timeout=60." >&2
    echo "Set RAILPACK_PHP_EXTENSIONS=pcntl on the Railway FCM worker service and redeploy it." >&2
    exit 1
fi

echo "Starting FCM-only worker (queue: fcm)..."

# Intentionally fixed: never consume notifications, default, or broadcasts here.
exec php artisan queue:work "${CONNECTION}" --queue=fcm --sleep=3 --tries=3 --timeout=60 --max-time=3600
