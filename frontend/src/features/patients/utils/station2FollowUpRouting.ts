export interface Station2Appointment {
  appointment_id?: number;
  bite_id?: number | null;
  appointment_type?: string | null;
  dose_number?: number | null;
  status?: string | null;
  scheduled_date?: string | null;
  appointment_date?: string | null;
  booked_by_account_id?: number | null;
  time_slot?: string | null;
  notes?: string | null;
  schedule_drift_days?: number | null;
  schedule_adjustment_reason?: string | null;
}

export interface Station2QueueEntry {
  queue_id?: number;
  queue_number?: number;
  status?: string;
  visit_type?: string;
  check_in_notes?: string | null;
  consultation_notes?: string | null;
}

export interface Station2PatientLike {
  patient_id: number;
  status?: string | null;
  appointments?: Station2Appointment[];
  queues?: Station2QueueEntry[];
  latest_treatment_record?: { dose_number?: number | null; treatment_date?: string | null } | null;
}

export type Station2ActionState =
  | 'booster_requires_doctor'
  | 'consultation_requires_registration'
  | 'series_completed'
  | 'check_in'
  | 'scheduled_future'
  | 'checked_in'
  | 'view_only';

const ACTIVE_APPOINTMENT_STATUSES = new Set(['scheduled', 'missed', 'confirmed']);
const ACTIVE_QUEUE_STATUSES = new Set(['waiting', 'called', 'serving', 'in_consultation']);

export function getManilaDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function extractDateString(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return getManilaDateString(parsed);
}

export function isBoosterAppointment(appt?: Station2Appointment | null): boolean {
  if (!appt) return false;
  return (
    appt.appointment_type === 'booster' ||
    Boolean(appt.notes?.toLowerCase().includes('booster'))
  );
}

export function isConsultationAppointment(appt?: Station2Appointment | null): boolean {
  if (!appt) return false;
  const notesLower = (appt.notes ?? '').toLowerCase();
  const hasNoDose = appt.dose_number === null || appt.dose_number === undefined || Number(appt.dose_number) <= 0;

  return (
    appt.appointment_type === 'consultation' ||
    notesLower.includes('consultation') ||
    (hasNoDose && Boolean(appt.booked_by_account_id) && !isBoosterAppointment(appt))
  );
}

export function isFollowUpAppointment(appt?: Station2Appointment | null): boolean {
  if (!appt) return false;
  return (
    appt.dose_number !== null &&
    appt.dose_number !== undefined &&
    Number(appt.dose_number) > 0 &&
    !isBoosterAppointment(appt) &&
    !isConsultationAppointment(appt)
  );
}

export function isAppointmentDueForCheckIn(
  appt?: Station2Appointment | null,
  todayStr: string = getManilaDateString(),
): boolean {
  if (!appt) return false;
  const apptDateStr = extractDateString(appt.scheduled_date || appt.appointment_date);
  if (!apptDateStr) return false;
  return apptDateStr <= todayStr;
}

function compareByScheduledDateAsc(a: Station2Appointment, b: Station2Appointment): number {
  const dateA = extractDateString(a.scheduled_date || a.appointment_date) ?? '9999-12-31';
  const dateB = extractDateString(b.scheduled_date || b.appointment_date) ?? '9999-12-31';
  return dateA.localeCompare(dateB);
}

/**
 * Station 2 must always display and target the patient's next eligible follow-up dose
 * (Day 3 / Day 7), never letting a separate mobile bite consultation mask it.
 * Falls back to a non-follow-up appointment only if no follow-up exists so defensive
 * UI guards can show the right desk guidance instead of a Check In button.
 */
export function selectStation2NextAppointment(
  appointments?: Station2Appointment[] | null,
): Station2Appointment | null {
  if (!appointments || appointments.length === 0) return null;

  const active = appointments.filter((a) => ACTIVE_APPOINTMENT_STATUSES.has(a.status ?? ''));
  if (active.length === 0) return null;

  const followUps = active.filter(isFollowUpAppointment).sort(compareByScheduledDateAsc);
  if (followUps.length > 0) {
    return followUps[0];
  }

  return [...active].sort(compareByScheduledDateAsc)[0];
}

export function resolveStation2CheckInEndpoint(
  patientId: number,
  appt?: Station2Appointment | null,
): string {
  if (appt && isFollowUpAppointment(appt) && appt.appointment_id) {
    return `/appointments/${appt.appointment_id}/check-in`;
  }
  return `/appointments/patient/${patientId}/check-in`;
}

export function getStation2RowActionState(
  patient: Station2PatientLike,
  treatmentEnabled: boolean,
  todayStr: string = getManilaDateString(),
): Station2ActionState {
  const activeQueue = patient.queues?.[0];
  const appt = selectStation2NextAppointment(patient.appointments);

  if (isBoosterAppointment(appt)) {
    return 'booster_requires_doctor';
  }
  if (isConsultationAppointment(appt)) {
    return 'consultation_requires_registration';
  }

  const record = patient.latest_treatment_record;
  const isPrimaryComplete = Boolean(
    record && record.dose_number !== null && record.dose_number !== undefined &&
    record.dose_number >= 7 && record.dose_number < 90,
  );
  const isBoosterComplete = Boolean(
    record && record.dose_number !== null && record.dose_number !== undefined &&
    (record.dose_number >= 365 || (record.dose_number >= 90 && !appt)),
  );
  const isSeriesCompleted = Boolean(
    patient.status?.toLowerCase() === 'completed' ||
    ((isPrimaryComplete || isBoosterComplete) && !appt),
  );

  if (isSeriesCompleted) {
    return 'series_completed';
  }

  const isCheckedIn = Boolean(
    appt?.status === 'confirmed' ||
    (activeQueue && ACTIVE_QUEUE_STATUSES.has(activeQueue.status ?? '')),
  );

  if (isCheckedIn) {
    return 'checked_in';
  }

  if (appt && isFollowUpAppointment(appt) && (appt.status === 'scheduled' || appt.status === 'missed')) {
    if (!isAppointmentDueForCheckIn(appt, todayStr)) {
      return 'scheduled_future';
    }
    return treatmentEnabled ? 'check_in' : 'view_only';
  }

  return 'view_only';
}
