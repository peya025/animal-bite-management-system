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
];
