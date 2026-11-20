#!/usr/bin/env sh

# Railway pre-deploy command: sh railway/init-app.sh
set -eu

# Materialize Firebase credentials from environment variables if provided
CREDS_DIR="storage/app/private"
CREDS_FILE="${CREDS_DIR}/firebase-credentials.json"

if [ -f "$CREDS_FILE" ]; then
    echo "Firebase credentials file already present at ${CREDS_FILE} (skipping materialization)."
elif [ -n "${FIREBASE_CREDENTIALS_BASE64:-}" ]; then
    mkdir -p "$CREDS_DIR"
    chmod 700 "$CREDS_DIR" 2>/dev/null || true
    printf '%s' "$FIREBASE_CREDENTIALS_BASE64" | base64 -d > "$CREDS_FILE"
    chmod 600 "$CREDS_FILE" 2>/dev/null || true
    echo "Firebase credentials safely materialized from FIREBASE_CREDENTIALS_BASE64 to ${CREDS_FILE}."
elif [ -n "${FIREBASE_CREDENTIALS_JSON:-}" ]; then
    mkdir -p "$CREDS_DIR"
    chmod 700 "$CREDS_DIR" 2>/dev/null || true
    printf '%s' "$FIREBASE_CREDENTIALS_JSON" > "$CREDS_FILE"
    chmod 600 "$CREDS_FILE" 2>/dev/null || true
    echo "Firebase credentials safely materialized from FIREBASE_CREDENTIALS_JSON to ${CREDS_FILE}."
else
    echo "Notice: Neither FIREBASE_CREDENTIALS_BASE64 nor FIREBASE_CREDENTIALS_JSON is set. Automatic FCM delivery requires credentials before sending."
fi

php artisan migrate --force

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
    php artisan db:seed --class=DemoSeeder --force
fi

php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
