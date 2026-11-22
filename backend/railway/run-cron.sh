#!/usr/bin/env sh

# Railway Cron service start command: sh railway/run-cron.sh
set -eu

# Ensure working directory is always backend root regardless of invocation context
cd "$(dirname "$0")/.."

# Graceful termination handling for container shutdown and rolling restarts
trap 'echo "Scheduler service received shutdown signal. Exiting gracefully..."; exit 0' TERM INT

echo "Starting Railway Laravel Scheduler daemon..."

while true; do
    # Run scheduled tasks without letting transient command failures crash the daemon loop
    php artisan schedule:run --verbose --no-interaction || echo "Warning: schedule:run exited with code $?, continuing daemon loop."

    # Calculate remaining seconds until top of next minute to eliminate clock drift
    CURRENT_SEC=$(date +%S | sed 's/^0*//')
    CURRENT_SEC=${CURRENT_SEC:-0}
    SLEEP_SEC=$((60 - CURRENT_SEC))
    if [ "$SLEEP_SEC" -le 0 ] || [ "$SLEEP_SEC" -gt 60 ]; then
        SLEEP_SEC=60
    fi

    sleep "$SLEEP_SEC"
done
