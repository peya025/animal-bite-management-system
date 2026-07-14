import { createTheme } from '@mui/material/styles';

const POPPINS = "'Poppins', 'Inter', 'Segoe UI', sans-serif";

/**
 * Application theme — sets Poppins as the global font for all MUI components
 * and every DOM element via CssBaseline.
 */
export const appTheme = createTheme({
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
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: '1px solid #e0eae3',
          borderRadius: 14,
          boxShadow: '0 18px 50px rgba(23, 61, 41, 0.12)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d7e3da' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9fc5ad' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#277a4b',
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after {
          font-family: ${POPPINS} !important;
          box-sizing: border-box;
        }
        body {
          font-family: ${POPPINS};
        }
      `,
    },
  },
});

export default appTheme;
