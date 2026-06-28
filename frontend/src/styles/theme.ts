import { createTheme } from '@mui/material/styles';

/**
 * Application theme foundation.
 *
 * Keep the initial theme aligned with MUI's existing defaults so introducing
 * ThemeProvider does not restyle components that already render in production.
 * Design tokens will be added incrementally with the components that consume
 * them, with visual parity checked in the same change.
 */
export const appTheme = createTheme();

export default appTheme;
