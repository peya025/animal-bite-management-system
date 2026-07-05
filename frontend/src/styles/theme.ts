import { createTheme } from '@mui/material/styles';

const POPPINS = "'Poppins', 'Inter', 'Segoe UI', sans-serif";

/**
 * Application theme — sets Poppins as the global font for all MUI components
 * and every DOM element via CssBaseline.
 */
export const appTheme = createTheme({
  typography: {
    fontFamily: POPPINS,
    allVariants: {
      fontFamily: POPPINS,
    },
  },
  components: {
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
