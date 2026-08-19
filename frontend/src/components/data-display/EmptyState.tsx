import { Box, Button, Typography } from '@mui/material';

interface EmptyStateProps {
  /** Icon node rendered in the container box */
  icon?: React.ReactNode;
  /** Primary headline */
  title?: string;
  /** Secondary description */
  subtitle?: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Called when the action button is clicked */
  onAction?: () => void;
}

/**
 * Reusable empty state — used inside DataTable and any list with no data.
 *
 * @example
 *   <EmptyState
 *     icon={<InventoryIcon sx={{ fontSize: 36, color: '#d1d5db' }} />}
 *     title="No inventory records"
 *     subtitle="Add your first vaccine batch to get started"
 *     actionLabel="Add Stock"
 *     onAction={() => setOpen(true)}
 *   />
 */
export default function EmptyState({
  icon,
  title = 'No records found',
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
      {icon && (
        <Box sx={{
          width: 72, height: 72,
          borderRadius: 3,
          bgcolor: 'var(--bg-secondary)',
          border: '1px solid var(--table-row-border)',
          mx: 'auto', mb: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
      )}
      <Typography sx={{ fontWeight: 600, fontSize: 15, color: 'var(--text-h)', mb: 0.5 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', mb: actionLabel ? 2.5 : 0 }}>
          {subtitle}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          disableElevation
          sx={{
            bgcolor: '#10b981',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 13,
            borderRadius: 1.5,
            px: 3,
            '&:hover': { bgcolor: '#059669' },
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
