import { Box, Paper, Skeleton, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color: 'success' | 'info' | 'warning' | 'error' | 'primary' | 
         'blue' | 'green' | 'yellow' | 'red' | 'purple';  // Support both naming conventions
  loading?: boolean;
}

// Color mapping for backwards compatibility with Dashboard
const COLOR_MAP: Record<string, keyof typeof COLORS> = {
  blue: 'info',
  green: 'success',
  yellow: 'warning',
  red: 'error',
  purple: 'primary',
};

const COLORS: Record<string, { stroke: string; track: string }> = {
  success: { stroke: '#1D9E75', track: '#d1fae5' },
  info:    { stroke: '#378ADD', track: '#dbeafe' },
  warning: { stroke: '#EF9F27', track: '#fef3c7' },
  error:   { stroke: '#E24B4A', track: '#fee2e2' },
  primary: { stroke: '#7F77DD', track: '#ede9fe' },
};

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StatCard({ 
  label, 
  value, 
  color, 
  loading 
}: StatCardProps) {
  // Map old color names to new ones
  const mappedColor = (COLOR_MAP[color] || color) as keyof typeof COLORS;
  const c = COLORS[mappedColor] ?? COLORS.info;

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
      {/* Donut chart visualization */}
      <Box sx={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          {/* Background circle */}
          <circle cx="32" cy="32" r={RADIUS} stroke={c.track} strokeWidth="6" />
          {/* Progress circle (72% filled) */}
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
        {/* Value in center */}
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

      {/* Label */}
      <Typography sx={{ fontSize: 11, color: '#6b7280', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </Typography>
    </Paper>
  );
}
