# Treatment Record Immutability Implementation Plan

**Goal**: Make completed treatment records immutable (cannot be edited) to maintain data integrity and audit compliance.

---

## Requirements

### ✅ Completed Doses (Already Recorded)
- **LOCKED** - Cannot be edited
- All fields are read-only:
  - Mode of animal exposure
  - Body part affected
  - Type of animal
  - Past history of animal bite
  - Was PEP immunization completed?
  - Vaccine type & batch
  - Route (ID/IM)
  - Date administered
  - Stock units dispensed

### ✅ Future Doses (Not Yet Given)
- **UNLOCKED** - Can be recorded
- Only **ONE dose at a time** (sequential)
- Once saved, it becomes locked

### ✅ Edit Behavior
- **Edit Button**: Should only appear for the **next upcoming dose**
- **Past doses**: Show "View" button only (read-only modal)
- **Future doses beyond next**: Hidden or disabled

---

## Implementation Strategy

### 1. Backend Changes

#### A. Add `is_editable` flag to TreatmentRecord API response
```php
// app/Http/Controllers/TreatmentRecordController.php

public function show($id) {
    $record = TreatmentRecord::findOrFail($id);
    
    // Check if this record is editable
    $isEditable = $this->isRecordEditable($record);
    
    return response()->json([
        'record' => $record,
        'is_editable' => $isEditable,
    ]);
}

private function isRecordEditable(TreatmentRecord $record): bool {
    // Record is NOT editable if:
    // 1. It has a treatment_date (already administered)
    if ($record->treatment_date !== null) {
        return false;
    }
    
    // 2. Check if this is the NEXT dose in sequence
    $patientId = $record->patient_id;
    $currentDoseNumber = $record->dose_number;
    
    // Get the latest administered dose
    $latestAdministered = TreatmentRecord::where('patient_id', $patientId)
        ->whereNotNull('treatment_date')
        ->orderBy('dose_number', 'desc')
        ->first();
    
    $latestDoseNumber = $latestAdministered ? $latestAdministered->dose_number : -1;
    
    // Only the immediate next dose is editable
    return $currentDoseNumber === ($latestDoseNumber + 1);
}
```

#### B. Add validation to prevent editing completed doses
```php
public function update(Request $request, $id) {
    $record = TreatmentRecord::findOrFail($id);
    
    // Check if record is editable
    if (!$this->isRecordEditable($record)) {
        return response()->json([
            'message' => 'This treatment record cannot be edited. Only the next scheduled dose can be recorded.',
        ], 403); // Forbidden
    }
    
    // Proceed with update...
}
```

#### C. Add endpoint to check if record is editable
```php
// GET /api/treatment-records/{id}/editable
public function checkEditable($id) {
    $record = TreatmentRecord::findOrFail($id);
    
    return response()->json([
        'is_editable' => $this->isRecordEditable($record),
        'reason' => !$this->isRecordEditable($record) 
            ? 'Record is already completed and cannot be modified'
            : null,
    ]);
}
```

---

### 2. Frontend Changes

#### A. Update Treatment Record Modal/Form Component

**File**: `frontend/src/features/vaccinations/components/VaccinationRecordForm.tsx`

```tsx
interface VaccinationRecordFormProps {
  patientId: number;
  recordId?: number;
  isReadOnly?: boolean; // NEW: Flag for read-only mode
  onClose: () => void;
  onSave: () => void;
}

export default function VaccinationRecordForm({ 
  patientId, 
  recordId, 
  isReadOnly = false, 
  onClose, 
  onSave 
}: VaccinationRecordFormProps) {
  
  // Fetch edit permissions when loading existing record
  useEffect(() => {
    if (recordId) {
      api.get(`/treatment-records/${recordId}/editable`)
        .then(res => {
          if (!res.data.is_editable) {
            setIsReadOnly(true);
            toast.warning('This record is locked and cannot be edited');
          }
        });
    }
  }, [recordId]);
  
  // Disable all form fields if read-only
  const fieldProps = {
    disabled: isReadOnly,
    readOnly: isReadOnly,
  };
  
  return (
    <Dialog>
      {/* Header with lock icon if read-only */}
      {isReadOnly && (
        <Alert severity="info" icon={<LockIcon />}>
          This treatment record is locked and cannot be edited.
        </Alert>
      )}
      
      {/* All form fields */}
      <TextField {...fieldProps} label="Mode of Exposure" />
      <Select {...fieldProps} label="Body Part" />
      
      {/* Hide Save button if read-only */}
      <DialogActions>
        {!isReadOnly ? (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Record</Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
```

#### B. Update Patient List Actions

**File**: `frontend/src/features/patients/pages/NursePatientListPage.tsx`

```tsx
const columns: ColumnDef<Patient>[] = [
  // ... other columns
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const patient = row.original;
      const nextDose = patient.appointments?.[0];
      const hasCompletedDoses = patient.latest_treatment_record?.treatment_date;
      
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* View Treatment Card (always available) */}
          <Tooltip title="View Treatment Card">
            <IconButton 
              size="small" 
              onClick={() => handleViewTreatmentCard(patient)}
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
          
          {/* Give Dose (only if next dose is scheduled) */}
          {nextDose && (
            <Tooltip title={`Record ${getDoseLabel(nextDose.dose_number)}`}>
              <IconButton 
                size="small"
                color="success"
                onClick={() => handleRecordDose(patient, nextDose.dose_number)}
              >
                <DoseIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Edit button removed - doses are immutable once saved */}
        </Box>
      );
    }
  }
];
```

#### C. Visual Indicators

Add visual cues to show locked status:

```tsx
// Show lock icon for completed doses
{completedDoses.map(dose => (
  <TableRow key={dose.id}>
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography>Day {dose.dose_number}</Typography>
      </Box>
    </TableCell>
    <TableCell>
      <Chip 
        label="Completed" 
        color="success" 
        size="small"
        icon={<CheckCircleIcon />}
      />
    </TableCell>
    <TableCell>
      {/* View Only button */}
      <IconButton size="small" onClick={() => viewDose(dose.id)}>
        <VisibilityIcon />
      </IconButton>
    </TableCell>
  </TableRow>
))}
```

---

### 3. Database Changes (Optional - for extra safety)

Add database-level protection:

```php
// Migration: Add `locked_at` timestamp
Schema::table('treatment_records', function (Blueprint $table) {
    $table->timestamp('locked_at')->nullable()->after('treatment_date');
});

// Model: Prevent updates on locked records
class TreatmentRecord extends Model {
    protected static function booted() {
        static::updating(function ($record) {
            if ($record->locked_at !== null) {
                throw new \Exception('Cannot update locked treatment record');
            }
        });
        
        static::updated(function ($record) {
            // Auto-lock after treatment date is set
            if ($record->treatment_date && !$record->locked_at) {
                $record->locked_at = now();
                $record->saveQuietly(); // Prevent infinite loop
            }
        });
    }
}
```

---

## User Experience Flow

### Scenario 1: Recording Doses (Normal Flow)

```
Patient: Juan Dela Cruz
Progress: Day 0 ✓, Day 3 ✓, Day 7 (Next), Day 28 (Future)

1. Nurse opens patient list
2. Sees "Give Dose" button for Juan
3. Clicks → Opens Form with Day 7 pre-filled
4. Records Day 7 vaccine administration
5. Saves → Day 7 becomes LOCKED
6. Form closes, patient list refreshes
7. "Give Dose" button now shows for Day 28
```

### Scenario 2: Trying to Edit Past Dose (Prevented)

```
1. Nurse tries to view Day 0 record
2. Modal opens with 🔒 Lock icon
3. Alert: "This treatment record is locked and cannot be edited"
4. All fields are disabled/grayed out
5. Only "Close" button available (no Save button)
```

### Scenario 3: Skipping Doses (Prevented)

```
Patient: Maria Santos
Progress: Day 0 ✓, Day 3 (Next), Day 7 (Future), Day 28 (Future)

1. Nurse tries to record Day 7 (skipping Day 3)
2. Backend returns 403 Forbidden
3. Error toast: "Please record Day 3 first. Doses must be given in order."
4. Form is disabled or doesn't open
```

---

## Testing Checklist

### ✅ Backend Tests
- [ ] Completed dose cannot be updated via API
- [ ] Only next sequential dose can be recorded
- [ ] Skipping doses returns 403 error
- [ ] `is_editable` flag returns correct value
- [ ] Locked records throw exception on update

### ✅ Frontend Tests
- [ ] Edit button hidden for completed doses
- [ ] View button shows read-only modal
- [ ] All fields disabled in read-only mode
- [ ] Save button hidden in read-only mode
- [ ] Lock icon appears for completed doses
- [ ] Toast warning shown when trying to edit locked record

### ✅ Integration Tests
- [ ] Record Day 0 → becomes locked
- [ ] Try to edit Day 0 → prevented
- [ ] Record Day 3 → becomes locked
- [ ] Try to skip to Day 28 → prevented
- [ ] Complete all doses → all locked

---

## Benefits

✅ **Data Integrity**: Prevents accidental or intentional modification of historical records  
✅ **Audit Compliance**: Immutable records satisfy DOH/WHO audit requirements  
✅ **Legal Protection**: Tamper-proof records protect clinic from liability  
✅ **Sequential Enforcement**: Ensures proper vaccination schedule adherence  
✅ **User Experience**: Clear visual indicators of record status  

---

## Migration Path

1. ✅ Deploy backend changes (API validation)
2. ✅ Deploy frontend changes (UI/UX updates)
3. ✅ Add database-level locks (optional, for extra safety)
4. ✅ Test with existing data
5. ✅ Train staff on new workflow

---

**Implementation Priority**: HIGH  
**Estimated Time**: 4-6 hours  
**Risk Level**: Low (non-breaking changes with fallbacks)

