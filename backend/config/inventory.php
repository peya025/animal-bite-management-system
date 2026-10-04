<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Open-Vial Clinical Safety Policy Limits
    |--------------------------------------------------------------------------
    |
    | Maximum allowed open-vial duration in hours.
    | Per WHO and DOH rabies prevention guidelines, opened multi-dose vials
    | must not be kept beyond the maximum authorized duration.
    |
    */
    'open_vial_max_hours' => (int) env('OPEN_VIAL_MAX_HOURS', 8),
    'open_vial_allowed_overrides' => false, // Require clinical approval to change

    /*
    |--------------------------------------------------------------------------
    | Inventory Alert Thresholds
    |--------------------------------------------------------------------------
    |
    | low_stock_threshold: Usable vial count at or below which low stock alert triggers.
    | near_expiry_days: Days remaining before batch expiration date to trigger near-expiry alert.
    |
    */
    'low_stock_threshold' => (int) env('INVENTORY_LOW_STOCK_THRESHOLD', 10),
    'near_expiry_days' => (int) env('INVENTORY_NEAR_EXPIRY_DAYS', 30),
];
