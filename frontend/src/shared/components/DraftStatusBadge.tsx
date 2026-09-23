import type { CSSProperties } from 'react';
import type { DraftStatus } from '../hooks/useFormDraft';

interface DraftStatusBadgeProps {
  status: DraftStatus;
  savedAt?: string;
  /** Extra inline styles for positioning inside a form footer */
  style?: CSSProperties;
  className?: string;
}

/**
 * Small pill that shows the current auto-save state.
 *
 *  idle    — renders nothing (no clutter on a pristine form)
 *  saving  — animated dots + "Saving…"
 *  saved   — green tick + "Draft saved"
 *  error   — yellow warning + "Draft save failed — your changes are still here"
 */
export default function DraftStatusBadge({
  status,
  savedAt,
  style,
  className,
}: DraftStatusBadgeProps) {
  if (status === 'idle') return null;

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 500,
    padding: '3px 9px',
    borderRadius: 20,
    lineHeight: 1.4,
    transition: 'opacity 0.25s',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    ...style,
  };

  if (status === 'saving') {
    return (
      <span
        style={{ ...base, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb' }}
        className={className}
        aria-live="polite"
        aria-label="Saving draft…"
        role="status"
      >
        <SavingDots />
        Saving&hellip;
      </span>
    );
  }

  if (status === 'saved') {
    const label = savedAt ? formatTime(savedAt) : undefined;
    return (
      <span
        style={{ ...base, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        className={className}
        aria-live="polite"
        role="status"
        title={savedAt ? `Last saved at ${new Date(savedAt).toLocaleTimeString()}` : undefined}
      >
        {/* Checkmark icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Draft saved{label ? ` · ${label}` : ''}
      </span>
    );
  }

  // status === 'error'
  return (
    <span
      style={{ ...base, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a' }}
      className={className}
      aria-live="assertive"
      role="alert"
      title="Could not write to localStorage. Your entries are safe in the page but won't survive a reload."
    >
      {/* Warning icon */}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      Draft save failed
    </span>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Convert an ISO string to a short human time like "2:34 PM" */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Three animated dots that pulse to signal an in-progress save */
function SavingDots() {
  return (
    <>
      <style>{`
        @keyframes draftDotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scaleY(0.6); }
          40%            { opacity: 1;   transform: scaleY(1);   }
        }
        .draft-dot { display: inline-block; width: 3px; height: 8px; border-radius: 2px; background: currentColor; animation: draftDotPulse 1.2s ease-in-out infinite; }
        .draft-dot:nth-child(2) { animation-delay: 0.2s; }
        .draft-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }} aria-hidden="true">
        <span className="draft-dot" />
        <span className="draft-dot" />
        <span className="draft-dot" />
      </span>
    </>
  );
}
