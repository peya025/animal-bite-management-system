#!/usr/bin/env sh

# Railway Cron service start command: sh railway/run-cron.sh
set -eu

while true; do
    php artisan schedule:run --verbose --no-interaction
    sleep 60
done
