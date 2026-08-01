import { Box, Typography } from '@mui/material';
import { ArrowForward as NextIcon, Phone as CallIcon } from '@mui/icons-material';
import type { QueueEntry } from '../types';
import { VISIT_LABEL, waitTime } from '../types';

interface NextPatientBannerProps {
  entry: QueueEntry;
  onCall: (entry: QueueEntry) => void;
}

export function NextPatientBanner({ entry, onCall }: NextPatientBannerProps) {
  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid #10b981',
        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 50,
            height: 50,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <NextIcon sx={{ color: '#fff', fontSize: 26 }} />
        </Box>
        <Box>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              mb: 0.25,
            }}
          >
            Next in Queue
          </Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
            #{entry.queue_number} · {entry.patient.name}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            {VISIT_LABEL[entry.visit_type] ?? entry.visit_type} · Waiting {waitTime(entry.checked_in_at)}
          </Typography>
        </Box>
      </Box>
      <button
        onClick={() => onCall(entry)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '9px 18px',
          background: '#fff',
          color: '#059669',
          border: 'none',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
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
  );
}
