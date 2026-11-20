#!/usr/bin/env sh
set -eu
exec php artisan queue:work database --queue=notifications,default --sleep=3 --tries=3 --timeout=60 --max-time=3600
