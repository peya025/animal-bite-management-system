import { Box, Paper, Skeleton, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color: 'success' | 'info' | 'warning' | 'error' | 'primary' |
         'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
  progress?: number; // 0–1, default 0.72
}

// Color mapping for backwards compatibility
const COLOR_MAP: Record<string, keyof typeof COLORS> = {
  blue: 'info',
  green: 'success',
  yellow: 'warning',
  red: 'error',
  purple: 'primary',
};

const COLORS: Record<string, { stroke: string; track: string; bg: string; bgHover: string }> = {
  success: { stroke: '#1D9E75', track: '#d1fae5', bg: '#f0fdf4', bgHover: '#d1fae5' },
  info:    { stroke: '#378ADD', track: '#dbeafe', bg: '#eff6ff', bgHover: '#bfdbfe' },
  warning: { stroke: '#EF9F27', track: '#fef3c7', bg: '#fffbeb', bgHover: '#fde68a' },
  error:   { stroke: '#E24B4A', track: '#fee2e2', bg: '#fef2f2', bgHover: '#fecaca' },
  primary: { stroke: '#7F77DD', track: '#ede9fe', bg: '#f5f3ff', bgHover: '#ddd6fe' },
};

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StatCard({
  label,
  value,
  icon,
  color,
  loading = false,
  progress = 0.72,
}: StatCardProps) {
  const mappedColor = (COLOR_MAP[color] || color) as keyof typeof COLORS;
  const c = COLORS[mappedColor] ?? COLORS.info;

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const dashArray = `${CIRCUMFERENCE * clampedProgress} ${CIRCUMFERENCE * (1 - clampedProgress)}`;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '0.5px solid #e5e7eb',
        borderRadius: 3,
        p: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: c.bg, // ✅ Always shows the light colored background
        transition: 'background-color 0.2s ease',
        cursor: 'default',
        '&:hover': {
          bgcolor: c.bgHover, // Slightly deeper shade on hover
        },
      }}
    >
      {/* Donut chart */}
      <Box sx={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r={RADIUS} stroke={c.track} strokeWidth="6" />
          {!loading && (
            <circle
              cx="32"
              cy="32"
              r={RADIUS}
              stroke={c.stroke}
              strokeWidth="6"
              strokeDasharray={dashArray}
              strokeDashoffset={CIRCUMFERENCE * 0.25}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
            />
          )}
        </svg>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <Skeleton width={24} height={20} />
          ) : (
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 600,
                color: '#111827',
                lineHeight: 1,
              }}
            >
              {value}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Label + optional icon */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {icon && (
          <Box sx={{ display: 'flex', fontSize: 14, color: '#6b7280' }}>
            {icon}
          </Box>
        )}
        <Typography
          sx={{
            fontSize: 11,
            color: '#6b7280',
            textAlign: 'center',
            lineHeight: 1.3,
            fontWeight: 500,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}