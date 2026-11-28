import type { SearchableSelectOption } from '../../components/forms/SearchableSelect';

export const ANIMAL_BITE_ICD10_OPTIONS: SearchableSelectOption[] = [
  // Dog bites & contact (W54)
  { value: 'W54', label: 'W54 — Bitten or struck by dog' },
  { value: 'W54.0', label: 'W54.0 — Bitten by dog' },
  { value: 'W54.1', label: 'W54.1 — Struck by dog' },
  { value: 'W54.8', label: 'W54.8 — Other contact with dog' },

  // Cat & other mammals (W55)
  { value: 'W55', label: 'W55 — Bitten or struck by other mammals' },
  { value: 'W55.0', label: 'W55.0 — Contact with cat' },
  { value: 'W55.01', label: 'W55.01 — Bitten by cat' },
  { value: 'W55.03', label: 'W55.03 — Scratched by cat' },
  { value: 'W55.09', label: 'W55.09 — Other contact with cat' },
  { value: 'W55.1', label: 'W55.1 — Contact with horse' },
  { value: 'W55.2', label: 'W55.2 — Contact with cow' },
  { value: 'W55.3', label: 'W55.3 — Contact with other hoof stock (goat, sheep, carabao)' },
  { value: 'W55.4', label: 'W55.4 — Contact with pig' },
  { value: 'W55.41', label: 'W55.41 — Bitten by pig' },
  { value: 'W55.5', label: 'W55.5 — Contact with raccoon / civet' },
  { value: 'W55.8', label: 'W55.8 — Contact with other mammals (monkey, bat, etc.)' },
  { value: 'W55.81', label: 'W55.81 — Bitten by other mammals' },

  // Rodents (W53)
  { value: 'W53', label: 'W53 — Contact with rodent' },
  { value: 'W53.0', label: 'W53.0 — Contact with mouse' },
  { value: 'W53.1', label: 'W53.1 — Contact with rat' },
  { value: 'W53.11', label: 'W53.11 — Bitten by rat' },
  { value: 'W53.8', label: 'W53.8 — Contact with other rodents' },

  // Other animal & human contact
  { value: 'W50.3', label: 'W50.3 — Accidental bite by another person' },
  { value: 'W56', label: 'W56 — Contact with nonvenomous marine animal' },
  { value: 'W59', label: 'W59 — Contact with other nonvenomous reptiles' },
  { value: 'W61', label: 'W61 — Contact with birds (chicken, duck, etc.)' },
  { value: 'W64', label: 'W64 — Exposure to other animate mechanical forces' },

  // Rabies exposure, immunization & diagnosis (Z20, Z23, Z24, A82)
  { value: 'Z20.3', label: 'Z20.3 — Contact with and (suspected) exposure to rabies' },
  { value: 'Z23', label: 'Z23 — Encounter for immunization (ARV / PEP / TT)' },
  { value: 'Z24.2', label: 'Z24.2 — Need for immunization against rabies' },
  { value: 'Z23.5', label: 'Z23.5 — Need for immunization against tetanus alone' },
  { value: 'A82.0', label: 'A82.0 — Sylvatic rabies' },
  { value: 'A82.1', label: 'A82.1 — Urban rabies' },
  { value: 'A82.9', label: 'A82.9 — Rabies, unspecified' },
];

export function buildIcd10Options(currentValue?: string | null): SearchableSelectOption[] {
  const trimmed = (currentValue || '').trim();
  if (!trimmed) return ANIMAL_BITE_ICD10_OPTIONS;
  const exists = ANIMAL_BITE_ICD10_OPTIONS.some(
    (opt) => opt.value.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) return ANIMAL_BITE_ICD10_OPTIONS;
  return [{ value: trimmed, label: trimmed }, ...ANIMAL_BITE_ICD10_OPTIONS];
}

/**
 * Suggests a default ICD-10 code based on the biting animal species (and exposure mode).
 * Remains editable by the clinician/nurse in Form 3.
 */
export function suggestIcd10FromExposure(
  animalType?: string | null,
  animalOther?: string | null,
  modeOfExposure?: string | null
): string {
  const species = (animalType || '').trim().toLowerCase();
  const other = (animalOther || '').trim().toLowerCase();
  const mode = (modeOfExposure || '').trim().toLowerCase();
  const combined = species === 'other' && other ? other : species || other;

  if (!combined) return '';

  if (combined === 'dog' || combined.includes('dog')) {
    return 'W54.0';
  }
  if (combined === 'cat' || combined.includes('cat')) {
    return mode === 'scratch_abrasion' ? 'W55.03' : 'W55.01';
  }
  if (combined.includes('rat')) {
    return 'W53.11';
  }
  if (combined.includes('mouse') || combined.includes('mice')) {
    return 'W53.0';
  }
  if (combined.includes('rodent') || combined.includes('hamster') || combined.includes('guinea')) {
    return 'W53';
  }
  if (combined.includes('pig') || combined.includes('boar')) {
    return 'W55.41';
  }
  if (combined.includes('horse')) {
    return 'W55.1';
  }
  if (combined.includes('cow') || combined.includes('cattle')) {
    return 'W55.2';
  }
  if (combined.includes('goat') || combined.includes('sheep') || combined.includes('carabao')) {
    return 'W55.3';
  }
  if (combined.includes('monkey') || combined.includes('bat')) {
    return 'W55.81';
  }
  if (combined.includes('human') || combined.includes('person')) {
    return 'W50.3';
  }
  if (combined.includes('bird') || combined.includes('chicken') || combined.includes('duck') || combined.includes('rooster')) {
    return 'W61';
  }
  return 'W55';
}
