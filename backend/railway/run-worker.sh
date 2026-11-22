#!/usr/bin/env sh
set -eu

# Ensure working directory is always backend root regardless of invocation context
cd "$(dirname "$0")/.."

CONNECTION="${QUEUE_CONNECTION:-database}"

echo "Starting Railway Laravel Queue Worker on connection '${CONNECTION}' (queues: notifications, default)..."

exec php artisan queue:work "${CONNECTION}" --queue=notifications,default --sleep=3 --tries=3 --timeout=60 --max-time=3600
