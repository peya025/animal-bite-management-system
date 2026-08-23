import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ArrowForward as NextIcon, Phone as CallIcon, SkipNext as CallNextIcon } from '@mui/icons-material';
import type { QueueEntry } from '../types';
import { VISIT_LABEL, CATEGORY_LABEL, waitTime } from '../types';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';

interface NextPatientBannerProps {
  entry: QueueEntry;
  /** Called when staff confirm calling a specific patient */
  onCall: (entry: QueueEntry) => void;
  /** Called when staff press "Call Next" — auto-selects next eligible patient */
  onCallNext?: () => void;
  showActions?: boolean;
}

export function NextPatientBanner({ entry, onCall, onCallNext, showActions = true }: NextPatientBannerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const categoryLabel = entry.queue_category
    ? (CATEGORY_LABEL[entry.queue_category] ?? entry.queue_category)
    : null;

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

        {showActions && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {/* Call Next — auto-select the highest-priority waiting patient */}
            {onCallNext && (
              <button
                onClick={onCallNext}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              >
                <CallNextIcon style={{ fontSize: 16 }} />
                Call Next
              </button>
            )}

            {/* Call This Patient — opens confirmation dialog */}
            <button
              onClick={() => setConfirmOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px',
                background: '#fff', color: '#059669',
                border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              }}
            >
              <CallIcon style={{ fontSize: 16 }} />
              Call Patient
            </button>
          </Box>
        )}
      </Box>

      {/* Confirmation dialog — prevents accidental calls */}
      {showActions && confirmOpen && (
        <ConfirmationDialog
          variant="confirm"
          title="Call Patient"
          message={
            <>
              Call <strong>#{entry.queue_number} · {entry.patient.name}</strong> to the station?
              {categoryLabel && (
                <Box component="span" sx={{ display: 'block', mt: 0.5, fontSize: 12, color: '#6b7280' }}>
                  Category: {categoryLabel}
                </Box>
              )}
            </>
          }
          confirmLabel="Yes, Call Now"
          cancelLabel="Cancel"
          onConfirm={() => { setConfirmOpen(false); onCall(entry); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
