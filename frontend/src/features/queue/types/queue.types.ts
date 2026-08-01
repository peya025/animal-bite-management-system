export interface QueueEntry {
  queue_id: number;
  queue_number: number;
  queue_date: string;
  visit_type: string;
  priority: 'normal' | 'urgent' | 'emergency';
  status: 'waiting' | 'in_consultation' | 'completed' | 'cancelled';
  checked_in_at: string;
  called_at: string | null;
  completed_at: string | null;
  check_in_notes: string | null;
  consultation_notes: string | null;
  patient: {
    patient_id: number;
    name: string;
    age: number;
    gender: string;
    contact_number: string;
  };
  biteIncident?: { bite_id: number; case_number: string; severity: string };
}

export interface QueueStats {
  total: number;
  waiting: number;
  in_consultation: number;
  completed: number;
  cancelled: number;
  by_visit_type?: Record<string, number>;
}

export const VISIT_LABEL: Record<string, string> = {
  new_case:    'New Case',
  follow_up:   'Follow-up',
  vaccination: 'Vaccination',
  observation: 'Observation',
};

export const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  waiting:         { bg: '#eff6ff', color: '#2563eb', label: 'Waiting'         },
  in_consultation: { bg: '#fff7ed', color: '#c2410c', label: 'In Consultation' },
  completed:       { bg: '#ecfdf5', color: '#059669', label: 'Completed'       },
  cancelled:       { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled'       },
};

export const PRIORITY_CFG: Record<string, { bg: string; color: string; label: string }> = {
  normal:    { bg: '#f3f4f6', color: '#6b7280', label: 'Normal'    },
  urgent:    { bg: '#fff7ed', color: '#c2410c', label: 'Urgent'    },
  emergency: { bg: '#fee2e2', color: '#dc2626', label: 'Emergency' },
};

export function waitTime(checkedIn: string): string {
  const diff = Math.floor((Date.now() - new Date(checkedIn).getTime()) / 60000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}
