/**
 * Shared accessible UI primitives for Bite Cases Summary views.
 */

import { Box, Chip, Typography } from '@mui/material';

export const BC_BORDER = '1px solid var(--bc-border)';

export function getStageBadgeProps(value: string): {
  color: string;
  bg: string;
  border: string;
} {
  const lower = value.toLowerCase();
  if (lower.includes('completed')) {
    return {
      color: 'var(--bc-green-strong)',
      bg: 'var(--bc-success-bg)',
      border: 'var(--bc-success-border)',
    };
  }
  if (lower.includes('no administration recorded') || lower.includes('overdue')) {
    return {
      color: 'var(--bc-red-strong)',
      bg: 'var(--bc-danger-bg)',
      border: 'var(--bc-danger-border)',
    };
  }
  if (
    lower.includes('awaiting') ||
    lower.includes('not yet') ||
    lower.includes('unknown') ||
    lower.includes('transferred')
  ) {
    return {
      color: 'var(--bc-amber-strong)',
      bg: 'var(--bc-amber-bg)',
      border: 'var(--bc-amber-border)',
    };
  }
  if (lower.includes('not applicable')) {
    return {
      color: 'var(--bc-text-secondary)',
      bg: 'var(--bc-surface-3)',
      border: 'var(--bc-border)',
    };
  }
  return { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
}

export function SemanticChip({ label }: { label: string }) {
  const tone = getStageBadgeProps(label);
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 22,
        fontSize: '0.72rem',
        fontWeight: 600,
        color: tone.color,
        bgcolor: tone.bg,
        border: `1px solid ${tone.border}`,
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}

export function DohStatLine({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        py: 0.55,
        borderBottom: '1px dashed var(--bc-border)',
        gap: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text-2)' }}>
        {label}
        {hint ? (
          <Typography
            component="span"
            sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', ml: 0.6 }}
          >
            ({hint})
          </Typography>
        ) : null}
      </Typography>
      <Typography
        sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)', whiteSpace: 'nowrap' }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function HorizontalDistBar({
  label,
  count,
  total,
  color,
  onClick,
  subLabel,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  onClick?: () => void;
  subLabel?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 1000) / 10) : 0;

  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      sx={{
        width: '100%',
        textAlign: 'left',
        border: 0,
        background: 'transparent',
        p: 0.5,
        borderRadius: '6px',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'var(--bc-surface-2)' } : undefined,
        '&:focus-visible': {
          outline: '2px solid var(--bc-focus-ring)',
          outlineOffset: '2px',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 1,
          mb: 0.35,
        }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'var(--bc-text-2)' }}>
          {label}
          {subLabel ? (
            <Typography
              component="span"
              sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', ml: 0.75 }}
            >
              {subLabel}
            </Typography>
          ) : null}
        </Typography>
        <Typography
          sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text)', whiteSpace: 'nowrap' }}
        >
          {count} ({total > 0 ? `${pct.toFixed(1)}%` : '—'})
        </Typography>
      </Box>
      <Box
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`${label}: ${count} of ${total}`}
        sx={{
          width: '100%',
          height: 8,
          borderRadius: 4,
          bgcolor: 'var(--bc-track)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 4,
            bgcolor: color,
            transition: 'width 0.2s ease',
          }}
        />
      </Box>
    </Box>
  );
}
