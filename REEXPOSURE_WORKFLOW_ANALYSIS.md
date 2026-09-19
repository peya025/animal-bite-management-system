# Re-exposure Workflow Analysis

## The Issue

I incorrectly implemented immutability that locks ALL exposure fields after ANY dose is completed. This breaks the re-exposure workflow.

## Correct Workflow

### Scenario 1: First Exposure (Completed)
```
Patient: Pia (23y, female)
Incident #1: Dog bite - Day 0 ✓, Day 3 ✓, Day 7 ✓
Status: Treatment completed

Result: Form for Incident #1 should be LOCKED ✓
```

### Scenario 2: Re-exposure (New Incident)
```
Patient: Pia (same patient)
Incident #2: Cat scratch - NEW exposure, NEW treatment card
Status: Starting Day 0 again

Result: Form for Incident #2 should be UNLOCKED ✓
- New animal type (Cat, not Dog)
- New body part (different location)
- New exposure category (might be different)
- New exposure date
```

## The Problem with Current Implementation

```tsx
// WRONG - This locks across ALL incidents
const hasCompletedDose = doses.some(dose => dose.is_completed || dose.inventory_linked);
const isFormLocked = readOnly || hasCompletedDose;
```

This checks if **any dose in the current form** is completed, but for RE-EXPOSURE cases, we're creating a **NEW treatment card** with **NEW doses** that should all be `is_completed = false`.

## Root Cause

The issue is likely in how the form loads data for re-exposure cases. Let me investigate:

1. When a patient with completed treatment gets re-exposed
2. A NEW bite incident should be created
3. A NEW treatment card should be created  
4. NEW dose records should be created (all uncompleted)
5. The form should load ONLY the new incident's doses

## What Should Happen

### For Existing Treatment Card (View/Edit)
- Load doses for THIS incident only
- If doses are completed → Lock exposure fields ✓
- This protects historical records ✓

### For New Treatment Card (Re-exposure)
- Create NEW incident record
- Create NEW dose records (all uncompleted)
- Form loads with NO completed doses
- Form should be UNLOCKED for new exposure details ✓

## Investigation Needed

1. Check how `entry` is passed to the form
2. Verify if re-exposure creates a new bite incident
3. Check if doses loaded are scoped to current incident
4. Ensure new treatment cards don't load old completed doses

## The Fix

The immutability logic is actually CORRECT, but we need to ensure:

```tsx
// This should only check doses for CURRENT incident
const hasCompletedDose = doses.some(dose => dose.is_completed || dose.inventory_linked);
```

The real question: **Are the doses being loaded correctly scoped to the current incident?**

Let me check the data flow...
