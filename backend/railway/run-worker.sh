#!/usr/bin/env sh
set -eu
exec php artisan queue:work database --queue=notifications --sleep=3 --tries=1 --timeout=45 --max-time=3600
