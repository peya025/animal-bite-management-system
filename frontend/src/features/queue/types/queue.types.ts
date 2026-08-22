// ── Category type ─────────────────────────────────────────────────────────────
export type QueueCategory =
  | 'regular'
  | 'appointment'
  | 'senior_citizen'
  | 'pwd'
  | 'pregnant'
  | 'priority';

export const CATEGORY_LABEL: Record<QueueCategory, string> = {
  regular:        'Regular / Walk-in',
  appointment:    'Appointment',
  senior_citizen: 'Senior Citizen',
  pwd:            'PWD',
  pregnant:       'Pregnant',
  priority:       'Priority / Urgent',
};

export const CATEGORY_CFG: Record<QueueCategory, { bg: string; color: string; icon: string }> = {
  regular:        { bg: '#f3f4f6', color: '#374151', icon: '👤' },
  appointment:    { bg: '#eff6ff', color: '#1d4ed8', icon: '📅' },
  senior_citizen: { bg: '#fef9c3', color: '#854d0e', icon: '👴' },
  pwd:            { bg: '#f0fdf4', color: '#15803d', icon: '♿' },
  pregnant:       { bg: '#fdf4ff', color: '#7e22ce', icon: '🤰' },
  priority:       { bg: '#fee2e2', color: '#dc2626', icon: '🚨' },
};
export type QueueStatus =
  | 'waiting'
  | 'called'
  | 'in_consultation'
  | 'serving'
  | 'completed'
  | 'cancelled'
  | 'no_response'
  | 'second_chance'
  | 'final_recall'
  | 'absent';

// ── Main entry ───────────────────────────────────────────────────────────────
export interface QueueEntry {
  queue_id: number;
  queue_number: number;
  queue_date: string;
  visit_type: string;
  queue_category: QueueCategory;
  priority: 'normal' | 'urgent' | 'emergency';
  status: QueueStatus;
  checked_in_at: string;
  called_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  serving_at: string | null;
  no_response_at: string | null;
  second_chance_at: string | null;
  final_recall_at: string | null;
  absent_at: string | null;
  check_in_notes: string | null;
  consultation_notes: string | null;
  call_count: number;
  recall_stage: 'second_chance' | 'final_recall' | null;
  is_carry_over?: boolean;
  appointment_id?: number | null;
  patient: {
    patient_id: number;
    name: string;
    age: number;
    gender: string;
    contact_number: string;
  };
  biteIncident?: { bite_id: number; case_number: string; severity: string };
  history?: QueueHistoryEntry[];
}

// ── History ──────────────────────────────────────────────────────────────────
export interface QueueHistoryEntry {
  id: number;
  queue_id: number;
  action: string;
  from_status: string | null;
  to_status: string;
  call_count: number;
  performed_by: number | null;
  notes: string | null;
  occurred_at: string;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export interface QueueStats {
  date?: string;
  total: number;
  waiting: number;
  called: number;
  in_consultation: number;
  serving: number;
  completed: number;
  cancelled: number;
  no_response: number;
  second_chance: number;
  final_recall: number;
  absent: number;
  by_visit_type?: Record<string, number>;
}

// ── Labels & config ───────────────────────────────────────────────────────────
export const VISIT_LABEL: Record<string, string> = {
  new_case:    'New Case',
  follow_up:   'Follow-up',
  vaccination: 'Vaccination',
  observation: 'Observation',
};

export const STATUS_CFG: Record<QueueStatus, { bg: string; color: string; label: string }> = {
  waiting:         { bg: '#eff6ff', color: '#2563eb', label: 'Waiting'          },
  called:          { bg: '#fef9c3', color: '#a16207', label: 'Called'           },
  in_consultation: { bg: '#fff7ed', color: '#c2410c', label: 'In Consultation'  },
  serving:         { bg: '#f0fdf4', color: '#15803d', label: 'Serving'          },
  completed:       { bg: '#ecfdf5', color: '#059669', label: 'Completed'        },
  cancelled:       { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled'        },
  no_response:     { bg: '#fdf4ff', color: '#9333ea', label: 'No Response'      },
  second_chance:   { bg: '#fff7ed', color: '#ea580c', label: 'Second Chance'    },
  final_recall:    { bg: '#fef2f2', color: '#dc2626', label: 'Final Recall'     },
  absent:          { bg: '#f1f5f9', color: '#475569', label: 'Absent'           },
};

export const PRIORITY_CFG: Record<string, { bg: string; color: string; label: string }> = {
  normal:    { bg: '#f3f4f6', color: '#6b7280', label: 'Normal'    },
  urgent:    { bg: '#fff7ed', color: '#c2410c', label: 'Urgent'    },
  emergency: { bg: '#fee2e2', color: '#dc2626', label: 'Emergency' },
};

/** Groups for quick status checks */
export const MAIN_STATUSES: QueueStatus[]   = ['waiting', 'called', 'in_consultation', 'serving'];
export const SECOND_STATUSES: QueueStatus[] = ['second_chance', 'final_recall'];
export const DONE_STATUSES: QueueStatus[]   = ['completed', 'cancelled', 'absent', 'no_response'];

export function waitTime(checkedIn: string): string {
  const diff = Math.floor((Date.now() - new Date(checkedIn).getTime()) / 60000);
  if (diff < 1)  return '< 1 min';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

export function timeSince(ts: string | null): string {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1)  return 'just now';
  if (diff < 60) return `${diff} min ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
}
