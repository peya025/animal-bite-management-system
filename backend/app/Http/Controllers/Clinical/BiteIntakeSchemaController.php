<?php

namespace App\Http\Controllers\Clinical;

use App\Http\Controllers\Controller;

use App\Support\BiteIntakeContract;

class BiteIntakeSchemaController extends Controller
{
    public function __invoke()
    {
        return response()->json(BiteIntakeContract::schema());
    }
}
