<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PatientProfileController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->patients()->orderByPivot('is_primary', 'desc')->get(),
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'clinic_id' => ['required', 'integer', 'exists:clinics,id'],
            'relationship' => ['required', 'in:self,child,dependent'],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'gender' => ['required', 'in:male,female'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'address' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_number' => ['nullable', 'string', 'max:50'],
        ]);

        $account = $request->user();

        if ($validated['relationship'] === 'self'
            && $account->patients()->wherePivot('relationship', 'self')->exists()) {
            throw ValidationException::withMessages([
                'relationship' => ['This account already has a self profile.'],
            ]);
        }

        $patient = DB::transaction(function () use ($account, $validated) {
            $relationship = $validated['relationship'];
            unset($validated['relationship']);

            $patient = Patient::create([
                ...$validated,
                'registration_source' => 'mobile',
            ]);

            $account->patients()->attach($patient->patient_id, [
                'relationship' => $relationship,
                'is_primary' => ! $account->patients()->exists(),
                'status' => 'pending',
            ]);

            return $patient;
        });

        return response()->json(
            $account->patients()->whereKey($patient->patient_id)->firstOrFail(),
            201,
        );
    }
}
