import React from 'react';

interface DoseRowProps {
  dose: any;
  isCompleted: boolean;
  isPrerequisiteLocked: boolean;
  prereqPeriod?: string;
  onClick?: () => void;
}

const BORDER_RADIUS = 8;

export function DoseRow({
  dose,
  isCompleted,
  isPrerequisiteLocked,
  prereqPeriod,
  onClick,
}: DoseRowProps) {
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const displayDate = formatDateDisplay(dose.date || dose.ideal_date || dose.scheduled_date);
  const isDrift = !isCompleted && dose.schedule_drift_days !== undefined && dose.schedule_drift_days > 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: BORDER_RADIUS,
        border: '1px solid var(--border-color, #e5e7eb)',
        background: 'var(--card-bg-solid, #ffffff)',
        marginBottom: 8,
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h, #1f2937)' }}>
          {dose.period} {displayDate ? `· ${displayDate}` : ''}
        </span>
      </div>

      <div style={{ fontSize: 12 }}>
        {isCompleted ? (
          <span style={{ color: '#15803d', fontWeight: 600 }}>
            ✓ Administered {Number(dose.total_doses) > 1 ? `(${dose.next_dose_index || 1}/${dose.total_doses} of 1 vial)` : ''}
            {dose.signature_path || dose.signature ? ' · ✍️ Signed' : ''}
          </span>
        ) : isPrerequisiteLocked ? (
          <span style={{ color: '#64748b' }}>
            Locked until {prereqPeriod || 'previous dose'} is recorded
          </span>
        ) : isDrift ? (
          <span style={{ color: '#b45309', fontWeight: 500 }}>
            Ideal date {formatShortDate(dose.ideal_date)} (+{dose.schedule_drift_days} {dose.schedule_drift_days === 1 ? 'day' : 'days'})
          </span>
        ) : (
          <span style={{ color: '#64748b' }}>
            Scheduled
          </span>
        )}
      </div>
    </div>
  );
}
