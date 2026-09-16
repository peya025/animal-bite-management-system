import { Box, Paper, Skeleton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: 'success' | 'info' | 'warning' | 'error' | 'primary' |
         'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'emerald' | 'teal' | string;
  loading?: boolean;
  progress?: number; // 0–1 or 0-100%
  total?: number; // Total count for dynamic percentage calculation
  subtitle?: string;
}

// Color mapping for backwards compatibility
const COLOR_MAP: Record<string, keyof typeof COLORS> = {
  blue: 'info',
  green: 'primary',
  emerald: 'primary',
  teal: 'primary',
  yellow: 'warning',
  red: 'error',
  purple: 'purple',
};

const COLORS: Record<string, { stroke: string; track: string; glow: string; text: string }> = {
  primary: { stroke: '#10b981', track: 'rgba(16, 185, 129, 0.16)', glow: 'rgba(16, 185, 129, 0.4)', text: '#34d399' },
  success: { stroke: '#10b981', track: 'rgba(16, 185, 129, 0.16)', glow: 'rgba(16, 185, 129, 0.4)', text: '#34d399' },
  info:    { stroke: '#38bdf8', track: 'rgba(56, 189, 248, 0.16)', glow: 'rgba(56, 189, 248, 0.4)', text: '#7dd3fc' },
  warning: { stroke: '#fbbf24', track: 'rgba(251, 191, 36, 0.16)', glow: 'rgba(251, 191, 36, 0.4)', text: '#fde68a' },
  error:   { stroke: '#f87171', track: 'rgba(248, 113, 113, 0.16)', glow: 'rgba(248, 113, 113, 0.4)', text: '#fca5a5' },
  purple:  { stroke: '#a78bfa', track: 'rgba(167, 139, 250, 0.16)', glow: 'rgba(167, 139, 250, 0.4)', text: '#c4b5fd' },
};

const RADIUS = 25;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StatCard({
  label,
  value,
  color = 'primary',
  loading = false,
  progress,
  total,
  subtitle,
}: StatCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const colorKey = color ? (COLOR_MAP[color] || color) : 'primary';
  const c = COLORS[colorKey] ?? (
    typeof color === 'string' && color.startsWith('#')
      ? { stroke: color, track: `${color}25`, glow: `${color}40`, text: color }
      : COLORS.primary
  );

  const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;

  // Calculate dynamic ring percentage (0 to 1)
  let rawProgress = 0;
  if (progress !== undefined) {
    rawProgress = progress > 1 ? progress / 100 : progress;
  } else if (total && total > 0) {
    rawProgress = numValue / total;
  } else if (numValue > 0) {
    rawProgress = numValue >= 100 ? 1 : numValue / 100;
    if (rawProgress < 0.12) rawProgress = 0.12;
  } else {
    rawProgress = 0;
  }

  const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);
  const dashArray = `${CIRCUMFERENCE * clampedProgress} ${CIRCUMFERENCE * (1 - clampedProgress)}`;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '20px',
        p: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.25,
        minHeight: 128,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(isDark
          ? {
              background: 'radial-gradient(ellipse at 30% 0%, #1e2e22 0%, #121c15 55%, #0a110d 100%)',
              border: '1px solid rgba(163, 230, 53, 0.3)',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 25px -4px rgba(163, 230, 53, 0.2), inset 0 1px 2px 0 rgba(255, 255, 255, 0.2), inset 0 0 0 1px rgba(163, 230, 53, 0.12)',
              '&:hover': {
                transform: 'translateY(-3px)',
                borderColor: 'rgba(163, 230, 53, 0.55)',
                boxShadow: `0 14px 34px -4px rgba(0, 0, 0, 0.7), 0 0 35px -2px rgba(163, 230, 53, 0.35), inset 0 1px 3px 0 rgba(255, 255, 255, 0.3)`,
              },
            }
          : {
              background: 'radial-gradient(ellipse at 30% 0%, #ecfdf5 0%, #f4fbf7 45%, #ffffff 100%)',
              border: '1px solid rgba(16, 185, 129, 0.32)',
              boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.15), 0 0 18px -3px rgba(132, 204, 22, 0.15), inset 0 1px 2px 0 rgba(255, 255, 255, 0.95), inset 0 0 0 1px rgba(16, 185, 129, 0.12)',
              '&:hover': {
                transform: 'translateY(-3px)',
                borderColor: 'rgba(16, 185, 129, 0.55)',
                boxShadow: `0 12px 28px -4px rgba(16, 185, 129, 0.25), 0 0 25px -2px rgba(132, 204, 22, 0.22), inset 0 1px 2px 0 rgba(255, 255, 255, 1)`,
              },
            }),
      }}
    >
      {/* Donut chart meter */}
      <Box sx={{ position: 'relative', width: 62, height: 62, mt: 0.25 }}>
        <svg width="62" height="62" viewBox="0 0 62 62" fill="none">
          <circle cx="31" cy="31" r={RADIUS} stroke={isDark ? c.track : 'rgba(16, 185, 129, 0.15)'} strokeWidth="5.5" />
          {!loading && (
            <circle
              cx="31"
              cy="31"
              r={RADIUS}
              stroke={c.stroke}
              strokeWidth="5.5"
              strokeDasharray={dashArray}
              strokeDashoffset={CIRCUMFERENCE * 0.25}
              strokeLinecap="round"
              transform="rotate(-90 31 31)"
              style={{ filter: isDark ? `drop-shadow(0 0 6px ${c.glow})` : `drop-shadow(0 0 4px rgba(16, 185, 129, 0.35))` }}
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
            <Skeleton width={24} height={20} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }} />
          ) : (
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 800,
                color: isDark ? '#ffffff' : '#064e3b',
                lineHeight: 1,
                letterSpacing: '-0.3px',
                fontFamily: "'Poppins', sans-serif",
                textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {value}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Label */}
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Typography
          sx={{
            fontSize: 11,
            color: isDark ? '#a7f3d0' : '#047857',
            textAlign: 'center',
            lineHeight: 1.3,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontSize: 10,
              color: isDark ? 'rgba(167, 243, 208, 0.7)' : '#6b7280',
              mt: 0.25,
              fontWeight: 500,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}