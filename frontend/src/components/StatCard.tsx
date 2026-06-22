import { Box, Paper, Skeleton, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const COLORS: Record<string, { stroke: string; track: string }> = {
  success: { stroke: '#1D9E75', track: '#d1fae5' },
  info:    { stroke: '#378ADD', track: '#dbeafe' },
  warning: { stroke: '#EF9F27', track: '#fef3c7' },
  error:   { stroke: '#E24B4A', track: '#fee2e2' },
  primary: { stroke: '#7F77DD', track: '#ede9fe' },
};

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StatCard({ label, value, color, loading }: StatCardProps) {
  const c = COLORS[color] ?? COLORS.info;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '0.5px solid #e5e7eb',
        borderRadius: 3,
        p: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        bgcolor: '#fff',
      }}
    >
      <Box sx={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r={RADIUS} stroke={c.track} strokeWidth="6" />
          {!loading && (
            <circle
              cx="32" cy="32" r={RADIUS}
              stroke={c.stroke}
              strokeWidth="6"
              strokeDasharray={`${CIRCUMFERENCE * 0.72} ${CIRCUMFERENCE * 0.28}`}
              strokeDashoffset="41"
              strokeLinecap="round"
            />
          )}
        </svg>
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loading
            ? <Skeleton width={24} height={20} />
            : <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#111827', lineHeight: 1 }}>
                {value}
              </Typography>
          }
        </Box>
      </Box>

      <Typography sx={{ fontSize: 11, color: '#6b7280', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </Typography>
    </Paper>
  );
}