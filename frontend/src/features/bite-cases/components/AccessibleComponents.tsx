/**
 * Accessible Components for Bite Cases Dashboard
 * WCAG AA Compliant with proper ARIA attributes
 */

import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import '../styles/biteCasesAccessibility.css';

/**
 * Accessible Progress Bar
 * Includes ARIA attributes for screen readers
 */
export function AccessibleProgress({ 
  value, 
  color, 
  width = 74,
  label
}: { 
  value: number; 
  color: string; 
  width?: number;
  label: string;
}) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  return (
    <Box 
      sx={{ width, height: 4, borderRadius: 2, bgcolor: 'var(--bc-track)', overflow: 'hidden' }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
      aria-label={label}
    >
      <Box sx={{ width: `${clampedValue}%`, height: '100%', borderRadius: 2, bgcolor: color }} />
    </Box>
  );
}

/**
 * Accessible Icon Button
 * Ensures minimum 44x44px touch target and proper ARIA label
 */
export function AccessibleIconButton({
  icon,
  label,
  onClick,
  color,
  size = 'medium',
  ...props
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}) {
  const sizeMap = {
    small: { minWidth: 44, minHeight: 44, p: 1 },
    medium: { minWidth: 44, minHeight: 44, p: 1.5 },
    large: { minWidth: 48, minHeight: 48, p: 2 },
  };

  return (
    <Tooltip title={label} arrow>
      <IconButton
        onClick={onClick}
        aria-label={label}
        className="bc-focusable bc-touch-target"
        sx={{
          ...sizeMap[size],
          color: color || 'var(--bc-text-secondary)',
          '&:focus-visible': {
            outline: '2px solid var(--bc-focus-ring)',
            outlineOffset: '2px',
          },
        }}
        {...props}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}

/**
 * Accessible Count Display
 * Improved color contrast for WCAG AA
 */
export function AccessibleCount({ 
  count, 
  color,
  ariaLabel 
}: { 
  count: number; 
  color: string;
  ariaLabel?: string;
}) {
  return count > 0 ? (
    <Typography 
      sx={{ fontSize: 12, color, fontWeight: 700 }}
      aria-label={ariaLabel || `Count: ${count}`}
    >
      {count}
    </Typography>
  ) : (
    <Typography 
      sx={{ color: 'var(--bc-text-secondary)', fontSize: 13 }}
      aria-label={ariaLabel || "No items"}
    >
      —
    </Typography>
  );
}

/**
 * Accessible Info Icon with Tooltip
 * Proper ARIA and keyboard support
 */
export function InfoTooltip({ 
  title,
  size = 11 
}: { 
  title: string;
  size?: number;
}) {
  return (
    <Tooltip title={title} arrow>
      <InfoOutlined
        sx={{
          fontSize: size,
          color: 'var(--bc-text-secondary)',
          cursor: 'help',
          flexShrink: 0,
        }}
        role="img"
        aria-label={`Information: ${title}`}
        tabIndex={0}
        className="bc-focusable"
      />
    </Tooltip>
  );
}

/**
 * Screen Reader Only Text
 * Visually hidden but announced by screen readers
 */
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Skip to Main Content Link
 * Allows keyboard users to bypass navigation
 */
export function SkipToMain() {
  return (
    <a href="#main-content" className="skip-to-main">
      Skip to main content
    </a>
  );
}
