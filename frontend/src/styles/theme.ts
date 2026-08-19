import { createTheme } from '@mui/material/styles';

const POPPINS = "'Poppins', 'Inter', 'Segoe UI', sans-serif";

/**
 * Dynamic application theme builder based on mode (light or dark)
 */
export const getAppTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';

  const colors = {
    bg: isDark ? '#0b1220' : '#f5f7fa',
    surface: isDark ? '#111827' : '#ffffff',
    surfaceAlt: isDark ? '#182437' : '#f9fafb',
    border: isDark ? '#243244' : '#e5e7eb',
    inputBorder: isDark ? '#334155' : '#d7e3da',
    text: isDark ? '#f8fafc' : '#111827',
    textSecondary: isDark ? '#94a3b8' : '#6b7280',
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#10b981',
        dark: '#059669',
        light: '#d1fae5',
      },
      background: {
        default: colors.bg,
        paper: colors.surface,
      },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
      },
      divider: colors.border,
    },
    typography: {
      fontFamily: POPPINS,
      h5: {
        fontFamily: POPPINS,
        fontSize: '25px',
        lineHeight: 1.2,
        fontWeight: 600,
        letterSpacing: '-0.5px',
      },
      body2: {
        fontFamily: POPPINS,
        fontSize: '13px',
        lineHeight: 1.5,
      },
      allVariants: {
        fontFamily: POPPINS,
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface,
            backgroundImage: 'none',
            borderColor: colors.border,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            boxShadow: isDark
              ? '0 18px 50px rgba(0, 0, 0, 0.45)'
              : '0 18px 50px rgba(23, 61, 41, 0.12)',
            backgroundColor: colors.surface,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            fontFamily: POPPINS,
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 8,
            padding: '9px 18px',
            minHeight: 36,
            boxSizing: 'border-box',
            transition: 'all 0.2s ease',
          },
          contained: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
            border: 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #0fb981 0%, #047857 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
            },
            '&.Mui-disabled': {
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              opacity: 0.6,
              color: 'rgba(255, 255, 255, 0.8)',
            },
          },
          outlined: {
            background: colors.surface,
            borderColor: colors.border,
            color: colors.textSecondary,
            borderWidth: '1px',
            '&:hover': {
              background: colors.surfaceAlt,
              borderColor: isDark ? '#475569' : '#d1d5db',
              color: colors.text,
            },
          },
          text: {
            color: colors.textSecondary,
            '&:hover': {
              background: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(107, 114, 128, 0.08)',
              color: colors.text,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: colors.surface,
            color: colors.text,
            minHeight: 40,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.inputBorder },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#475569' : '#9fc5ad' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#10b981',
              borderWidth: '1.5px',
            },
          },
          input: {
            fontSize: '14px',
            lineHeight: 1.4,
            padding: '10px 14px',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: colors.textSecondary,
            fontSize: '14px',
            '&.Mui-focused': {
              color: '#10b981',
            },
          },
          shrink: {
            fontSize: '14px',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            fontSize: '14px',
            lineHeight: 1.4,
            padding: '10px 14px',
            minHeight: 'unset',
            display: 'flex',
            alignItems: 'center',
          },
          icon: {
            color: colors.textSecondary,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 46,
            padding: '12px 16px',
            fontSize: '14px',
            lineHeight: 1.4,
            borderRadius: 8,
            margin: '2px 6px',
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: `
          *, *::before, *::after {
            font-family: ${POPPINS} !important;
            box-sizing: border-box;
          }
          body {
            font-family: ${POPPINS};
            background-color: ${colors.bg};
            color: ${colors.textSecondary};
          }
        `,
      },
    },
  });
};

// Static default theme for compatibility
export const appTheme = getAppTheme('light');

export default appTheme;
