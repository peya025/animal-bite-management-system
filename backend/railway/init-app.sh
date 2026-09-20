#!/usr/bin/env sh

# Railway pre-deploy command: sh railway/init-app.sh
set -eu

php artisan migrate --force

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
    php artisan db:seed --class=DemoSeeder --force
fi

php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
