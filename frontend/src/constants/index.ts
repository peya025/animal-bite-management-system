// Application Constants

export const APP_NAME = 'Tagoloan Animal Bite Treatment Application';
export const APP_SHORT_NAME = 'ABTC';

export const ROLES = {
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  REGISTRATION: 'registration',
  TRIAGE: 'triage',
  TREATMENT: 'treatment',
} as const;

export const ROLE_LABELS = {
  developer: 'System Developer',
  admin: 'Administrator',
  registration: 'Registration Staff',
  triage: 'Triage/Doctor Staff',
  treatment: 'Treatment Recording Staff',
} as const;

export const QUEUE_PRIORITIES = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  EMERGENCY: 'emergency',
} as const;

export const QUEUE_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  SERVING: 'serving',
  COMPLETED: 'completed',
} as const;

export const VACCINATION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  MISSED: 'missed',
  RESCHEDULED: 'rescheduled',
} as const;

export const BITE_SEVERITY = {
  CATEGORY_1: 'category_1',
  CATEGORY_2: 'category_2',
  CATEGORY_3: 'category_3',
} as const;

export const BITE_SEVERITY_LABELS = {
  category_1: 'Category I (Minor)',
  category_2: 'Category II (Moderate)',
  category_3: 'Category III (Severe)',
} as const;

export const ANIMAL_OBSERVATION_STATUS = {
  ALIVE_HEALTHY: 'alive_healthy',
  ALIVE_SICK: 'alive_sick',
  DEAD: 'dead',
  UNKNOWN: 'unknown',
} as const;

export const CASE_STATUS = {
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

// WHO Protocol Dose Days
export const WHO_DOSE_DAYS = [0, 3, 7, 14, 28];

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Date Formats
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'MMM DD, YYYY';
export const DISPLAY_DATETIME_FORMAT = 'MMM DD, YYYY hh:mm A';
