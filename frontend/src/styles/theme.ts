import { createTheme } from '@mui/material/styles';

const POPPINS = "'Poppins', 'Inter', 'Segoe UI', sans-serif";

/**
 * Dynamic application theme builder based on mode (light or dark)
 */
export const getAppTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#10b981',
        dark: '#059669',
        light: '#d1fae5',
      },
      background: {
        default: isDark ? '#0f172a' : '#f5f7fa',
        paper: '#ffffff',
      },
      text: {
        primary: '#111827',
        secondary: '#6b7280',
      },
      divider: '#e5e7eb',
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
            backgroundColor: '#ffffff',
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            border: '1px solid #e0eae3',
            borderRadius: 14,
            boxShadow: '0 18px 50px rgba(23, 61, 41, 0.12)',
            backgroundColor: '#ffffff',
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
            background: '#ffffff',
            borderColor: '#e5e7eb',
            color: '#6b7280',
            borderWidth: '1px',
            '&:hover': {
              background: '#f9fafb',
              borderColor: '#d1d5db',
              color: '#111827',
            },
          },
          text: {
            color: '#6b7280',
            '&:hover': {
              background: 'rgba(107, 114, 128, 0.08)',
              color: '#111827',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: '#ffffff',
            color: '#111827',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d7e3da' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9fc5ad' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#10b981',
              borderWidth: '1.5px',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: '#6b7280',
            '&.Mui-focused': {
              color: '#10b981',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: '#6b7280',
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
            background-color: ${isDark ? '#0f172a' : '#f5f7fa'};
            color: #374151;
          }
        `,
      },
    },
  });
};

// Static default theme for compatibility
export const appTheme = getAppTheme('light');

export default appTheme;
