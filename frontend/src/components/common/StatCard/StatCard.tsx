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
  primary: { stroke: '#00e5a0', track: 'rgba(0, 229, 160, 0.14)', glow: 'rgba(0, 229, 160, 0.55)', text: '#00e5a0' },
  success: { stroke: '#00e5a0', track: 'rgba(0, 229, 160, 0.14)', glow: 'rgba(0, 229, 160, 0.55)', text: '#00e5a0' },
  info:    { stroke: '#38bdf8', track: 'rgba(56, 189, 248, 0.14)', glow: 'rgba(56, 189, 248, 0.55)', text: '#7dd3fc' },
  warning: { stroke: '#fbbf24', track: 'rgba(251, 191, 36, 0.14)', glow: 'rgba(251, 191, 36, 0.55)', text: '#fde68a' },
  error:   { stroke: '#f87171', track: 'rgba(248, 113, 113, 0.14)', glow: 'rgba(248, 113, 113, 0.55)', text: '#fca5a5' },
  purple:  { stroke: '#a78bfa', track: 'rgba(167, 139, 250, 0.14)', glow: 'rgba(167, 139, 250, 0.55)', text: '#c4b5fd' },
};

// Ring dimensions — larger to match reference image
const SIZE         = 84;
const RADIUS       = 34;
const STROKE_W     = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CX = SIZE / 2;
const CY = SIZE / 2;

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

  const hoverShadow = isDark
    ? colorKey === 'error' || colorKey === 'red'
      ? '0 8px 24px rgba(239, 68, 68, 0.35), 0 0 16px rgba(239, 68, 68, 0.25)'
      : colorKey === 'warning' || colorKey === 'yellow' || colorKey === 'orange'
      ? '0 8px 24px rgba(245, 158, 11, 0.35), 0 0 16px rgba(245, 158, 11, 0.25)'
      : colorKey === 'info' || colorKey === 'blue' || colorKey === 'cyan'
      ? '0 8px 24px rgba(56, 189, 248, 0.35), 0 0 16px rgba(56, 189, 248, 0.25)'
      : colorKey === 'purple'
      ? '0 8px 24px rgba(167, 139, 250, 0.35), 0 0 16px rgba(167, 139, 250, 0.25)'
      : '0 8px 24px rgba(16, 185, 129, 0.35), 0 0 16px rgba(16, 185, 129, 0.25)'
    : colorKey === 'error' || colorKey === 'red'
    ? '0 8px 22px rgba(239, 68, 68, 0.28), 0 2px 8px rgba(239, 68, 68, 0.16)'
    : colorKey === 'warning' || colorKey === 'yellow' || colorKey === 'orange'
    ? '0 8px 22px rgba(245, 158, 11, 0.28), 0 2px 8px rgba(245, 158, 11, 0.16)'
    : colorKey === 'info' || colorKey === 'blue' || colorKey === 'cyan'
    ? '0 8px 22px rgba(56, 189, 248, 0.30), 0 2px 8px rgba(56, 189, 248, 0.16)'
    : colorKey === 'purple'
    ? '0 8px 22px rgba(167, 139, 250, 0.30), 0 2px 8px rgba(167, 139, 250, 0.16)'
    : '0 8px 22px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(16, 185, 129, 0.16)';

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '20px',
        p: '18px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        minHeight: 148,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(isDark
          ? {
              background: '#111827',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              '&:hover': {
                boxShadow: hoverShadow,
              },
            }
          : {
              background: '#ffffff',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              '&:hover': {
                boxShadow: hoverShadow,
              },
            }),
      }}
    >
      {/* ── Donut ring + value ───────────────────────────────── */}
      <Box sx={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          fill="none"
          style={{ display: 'block' }}
        >
          {/* Track circle */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            stroke={isDark ? c.track : 'rgba(16, 185, 129, 0.13)'}
            strokeWidth={STROKE_W}
          />
          {/* Filled arc */}
          {!loading && (
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              stroke={isDark ? c.stroke : '#10b981'}
              strokeWidth={STROKE_W}
              strokeDasharray={dashArray}
              strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{
                filter: isDark
                  ? `drop-shadow(0 0 9px ${c.glow}) drop-shadow(0 0 3px ${c.stroke})`
                  : 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.45))',
                transition: 'stroke-dasharray 0.6s ease',
              }}
            />
          )}
        </svg>

        {/* Centre value */}
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
            <Skeleton
              width={28}
              height={22}
              sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
            />
          ) : (
            <Typography
              sx={{
                fontSize: String(value).length > 4 ? 13 : 18,
                fontWeight: 900,
                color: isDark ? '#ffffff' : '#064e3b',
                lineHeight: 1,
                letterSpacing: '-0.5px',
                fontFamily: "'Poppins', sans-serif",
                textShadow: isDark
                  ? `0 0 14px rgba(0,229,160,0.35), 0 1px 4px rgba(0,0,0,0.6)`
                  : 'none',
              }}
            >
              {value}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Label ────────────────────────────────────────────── */}
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Typography
          sx={{
            fontSize: 10.5,
            color: isDark ? c.text : '#047857',
            textAlign: 'center',
            lineHeight: 1.3,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: "'Poppins', sans-serif",
            textShadow: isDark ? `0 0 10px ${c.glow}` : 'none',
          }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontSize: 10,
              color: isDark ? 'rgba(0, 229, 160, 0.6)' : '#6b7280',
              mt: 0.25,
              fontWeight: 500,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}