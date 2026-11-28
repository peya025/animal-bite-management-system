<?php

return [
    // Release gate: approval alone must not enable public distribution.
    'publication_enabled' => env('COMMUNITY_AWARENESS_PUBLICATION_ENABLED', false),

    // Independent release gate for optional community push notifications.
    'push_enabled' => env('COMMUNITY_AWARENESS_PUSH_ENABLED', false),

    // Configurable routine community push limits (never apply to personal clinical reminders).
    'push_daily_cap' => (int) env('COMMUNITY_AWARENESS_PUSH_DAILY_CAP', 1),
    'push_weekly_cap' => (int) env('COMMUNITY_AWARENESS_PUSH_WEEKLY_CAP', 2),

    // Quiet hours in Asia/Manila (24h clock): default 20:00–08:00.
    'quiet_hours_start' => (int) env('COMMUNITY_AWARENESS_QUIET_START', 20),
    'quiet_hours_end' => (int) env('COMMUNITY_AWARENESS_QUIET_END', 8),

    // Chunk size for server-side recipient resolution (replaces fixed 50-account cap).
    'recipient_chunk_size' => 100,
];
