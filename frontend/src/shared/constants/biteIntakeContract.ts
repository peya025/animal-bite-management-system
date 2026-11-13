export const BITE_INTAKE_SCHEMA_VERSION = '1.0' as const;

export const EXPOSURE_MODE_OPTIONS = [
  { value: 'nibbling_uncovered_skin', label: 'Saliva or licking on intact skin' },
  { value: 'nibbling_broken_skin', label: 'Saliva or licking on broken skin' },
  { value: 'scratch_abrasion', label: 'Scratch or abrasion' },
  { value: 'transdermal_bite', label: 'Transdermal bite' },
  { value: 'handling_ingestion_raw_meat', label: 'Handling or ingestion of raw animal tissue' },
] as const;

export const BODY_PART_GROUP_OPTIONS = [
  { value: 'head_neck', label: 'Head and neck' },
  { value: 'upper_extremities', label: 'Upper extremities (arm or hand)' },
  { value: 'lower_extremities', label: 'Lower extremities (leg or foot)' },
  { value: 'trunk_torso', label: 'Trunk or torso' },
  { value: 'multiple_sites', label: 'Multiple sites' },
  { value: 'na_ingestion', label: 'Not applicable for ingestion or handling' },
] as const;

export const ANIMAL_SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bat', label: 'Bat' },
  { value: 'monkey', label: 'Monkey or non-human primate' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
] as const;

export const ANIMAL_OWNERSHIP_OPTIONS = [
  { value: 'owned', label: 'Owned' },
  { value: 'stray', label: 'Stray' },
  { value: 'unknown', label: 'Unknown' },
] as const;

export const LATERALITY_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'bilateral', label: 'Both sides' },
  { value: 'multiple', label: 'Multiple sites' },
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'unknown', label: 'Unsure' },
] as const;

export type BodyPartGroup = typeof BODY_PART_GROUP_OPTIONS[number]['value'];
export type AnimalSpecies = typeof ANIMAL_SPECIES_OPTIONS[number]['value'];
