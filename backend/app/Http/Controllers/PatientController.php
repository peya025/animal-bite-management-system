<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    /**
     * List all patients with search
     * Access: admin, registration, triage, treatment
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $query = Patient::where('clinic_id', $clinicId)->with('registeredBy');

        // Search functionality
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('patient_number', 'like', "%{$search}%")
                  ->orWhere('contact_number', 'like', "%{$search}%")
                  ->orWhere(function ($nameQuery) use ($search) {
                      $nameQuery->searchName($search);
                  });
            });
        }

        // Filter by gender
        if ($request->has('gender')) {
            $query->where('gender', $request->gender);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginate
        $perPage = $request->get('per_page', 15);
        $patients = $query->paginate($perPage);

        return response()->json($patients);
    }

    /**
     * Register new patient
     * Access: admin, registration
     */
    public function store(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'gender' => 'required|in:male,female',
            'age' => 'nullable|integer|min:0|max:150',
            'date_of_birth' => 'nullable|date|before:today',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:50',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => 'nullable|string|max:50',
        ]);

        $patient = Patient::create([
            'clinic_id' => $request->user()->clinic_id,
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'suffix' => $request->suffix,
            'gender' => $request->gender,
            'age' => $request->age,
            'date_of_birth' => $request->date_of_birth,
            'address' => $request->address,
            'contact_number' => $request->contact_number,
            'emergency_contact_name' => $request->emergency_contact_name,
            'emergency_contact_number' => $request->emergency_contact_number,
            'registered_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Patient registered successfully',
            'patient' => $patient->load('registeredBy'),
        ], 201);
    }

    /**
     * Get patient details with related data
     * Access: admin, registration, triage, treatment
     */
    public function show(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->with([
                'registeredBy',
                'biteIncidents',
                'vaccinationSchedules' => function($query) {
                    $query->orderBy('scheduled_date');
                },
                'queueEntries' => function($query) {
                    $query->latest()->limit(5);
                }
            ])
            ->findOrFail($id);

        return response()->json($patient);
    }

    /**
     * Update patient information
     * Access: admin, registration
     */
    public function update(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'gender' => 'sometimes|required|in:male,female',
            'age' => 'nullable|integer|min:0|max:150',
            'date_of_birth' => 'nullable|date|before:today',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:50',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => 'nullable|string|max:50',
        ]);

        $patient->update($request->all());

        return response()->json([
            'message' => 'Patient updated successfully',
            'patient' => $patient,
        ]);
    }

    /**
     * Delete patient (soft delete)
     * Access: admin only
     */
    public function destroy(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $patient->delete();

        return response()->json([
            'message' => 'Patient deleted successfully',
        ]);
    }

    /**
     * Get patient's bite case history
     */
    public function biteCases(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $cases = $patient->biteIncidents()
            ->with(['createdBy', 'vaccinationSchedules'])
            ->orderBy('bite_date', 'desc')
            ->get();

        return response()->json($cases);
    }

    /**
     * Get patient's vaccination history
     */
    public function vaccinations(Request $request, $id)
    {
        $patient = Patient::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $vaccinations = $patient->vaccinationSchedules()
            ->with(['biteIncident', 'administeredBy'])
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($vaccinations);
    }
}
