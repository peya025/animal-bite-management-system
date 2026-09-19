<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Open Vial Maximum Hours
    |--------------------------------------------------------------------------
    |
    | The approved maximum number of hours an opened multi-dose vaccine vial
    | can remain active before it must be discarded. Must be approved by the
    | clinic's clinical authority before modification.
    |
    */
    'open_vial_max_hours' => (int) env('OPEN_VIAL_MAX_HOURS', 8),

    /*
    |--------------------------------------------------------------------------
    | Open Vial Allowed Overrides
    |--------------------------------------------------------------------------
    |
    | Whether clinicians/administrators are allowed to override policy limits.
    |
    */
    'open_vial_allowed_overrides' => false,
];
