import React from 'react';
import type { VitalStatus } from '../utils/vitalSignStatus';

interface VitalStatusIndicatorProps {
  status: VitalStatus;
}

function StatusIcon({ name }: { name: VitalStatus['icon'] }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === 'warning') return <svg {...common}><path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>;
  if (name === 'alert') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
}

export default function VitalStatusIndicator({ status }: VitalStatusIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        marginTop: 6,
        padding: '4px 7px',
        border: `1px solid ${status.borderColor}`,
        borderRadius: 5,
        backgroundColor: status.backgroundColor,
        color: status.color,
        fontSize: 12,
        lineHeight: 1.3,
        fontWeight: 600,
      }}
    >
      <StatusIcon name={status.icon} />
      <span>{status.message}</span>
    </div>
  );
}
