import { Box, Button, Typography } from '@mui/material';
import type { ReactNode, SyntheticEvent } from 'react';

export interface EmptyStateProps {
  /** Icon or illustration to display above the text */
  icon?: ReactNode;
  /** Primary message (bold) */
  title: string;
  /** Secondary / helper message */
  subtitle?: string;
  /** Optional call-to-action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Extra vertical padding (default 6 = 48px) */
  py?: number;
}

/**
 * Standalone empty state component.
 * Used both inside DataTable cells and as a standalone section placeholder.
 *
 * @example
 * <EmptyState
 *   icon={<PeopleAlt sx={{ fontSize: 36, color: '#d1d5db' }} />}
 *   title="No patients registered yet"
 *   subtitle="Add your first patient to get started"
 *   action={{ label: 'Add Patient', onClick: () => setOpen(true) }}
 * />
 */
export default function EmptyState({
  icon,
  title,
  subtitle,
  action,
  py = 6,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py,
        px: 3,
        gap: 0,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: 3,
            bgcolor: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2.5,
          }}
        >
          {icon}
        </Box>
      )}

      <Typography
        sx={{ fontWeight: 600, fontSize: 15, color: '#6b7280', mb: subtitle ? 0.5 : 0 }}
      >
        {title}
      </Typography>

      {subtitle && (
        <Typography sx={{ fontSize: 13, color: '#9ca3af', mb: action ? 2 : 0 }}>
          {subtitle}
        </Typography>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant="contained"
          disableElevation
          sx={{
            mt: subtitle ? 0 : 2,
            bgcolor: '#10b981',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 13,
            py: 1,
            px: 2.5,
            borderRadius: 1.5,
            '&:hover': { bgcolor: '#059669' },
          }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
