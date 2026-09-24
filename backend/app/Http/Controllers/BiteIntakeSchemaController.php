<?php

namespace App\Http\Controllers;

use App\Support\BiteIntakeContract;

class BiteIntakeSchemaController extends Controller
{
    public function __invoke()
    {
        return response()->json(BiteIntakeContract::schema());
    }
}
