import { Box, Typography } from '@mui/material';
import { ArrowForward as NextIcon, SkipNext as SkipIcon } from '@mui/icons-material';
import type { QueueEntry } from '../types';
import { VISIT_LABEL, CATEGORY_LABEL, waitTime } from '../types';

interface NextPatientBannerProps {
  entry: QueueEntry;
  /** The currently-called patient (if any). Skip is only enabled when one exists. */
  calledEntry?: QueueEntry | null;
  /** Called when staff press "Skip" — returns called patient to waiting, then calls next */
  onSkip?: () => void;
  showActions?: boolean;
}

export function NextPatientBanner({ entry, calledEntry, onSkip, showActions = true }: NextPatientBannerProps) {
  const categoryLabel = entry.queue_category
    ? (CATEGORY_LABEL[entry.queue_category] ?? entry.queue_category)
    : null;

  // Skip is only possible when a patient is currently called
  const skipDisabled = !calledEntry;

  return (
    <>
      <Box sx={{
        mb: 3,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid #10b981',
        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 50, height: 50, borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <NextIcon sx={{ color: '#fff', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 0.25 }}>
              Next in Queue
            </Typography>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
              #{entry.queue_number} · {entry.patient.name}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              {VISIT_LABEL[entry.visit_type] ?? entry.visit_type}
              {categoryLabel && ` · ${categoryLabel}`}
              {' · Waiting '}{waitTime(entry.checked_in_at)}
            </Typography>
          </Box>
        </Box>

        {showActions && onSkip && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {/* Skip — returns the currently-called patient to waiting and calls next.
                Disabled when no patient is currently in "called" status. */}
            <button
              onClick={skipDisabled ? undefined : onSkip}
              disabled={skipDisabled}
              title={
                skipDisabled
                  ? 'No patient is currently called. A patient must be called before you can skip.'
                  : `Skip ${calledEntry ? `#${calledEntry.queue_number} · ${calledEntry.patient.name}` : ''} and call next waiting patient`
              }
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px',
                background: skipDisabled ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.15)',
                color: skipDisabled ? 'rgba(255,255,255,0.35)' : '#fff',
                border: `1px solid ${skipDisabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)'}`,
                borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: skipDisabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
                opacity: skipDisabled ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (!skipDisabled) e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={e => {
                if (!skipDisabled) e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              }}
            >
              <SkipIcon style={{ fontSize: 16 }} />
              Skip
            </button>
          </Box>
        )}
      </Box>
    </>
  );
}
