import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AppThemeProvider } from '../../src/shared/contexts/ThemeContext';
import { AuthProvider } from '../../src/shared/contexts/AuthContext';
import RegistrationReportsPage from '../../src/features/reports/pages/RegistrationReportsPage';

createRoot(document.getElementById('root')!).render(<AppThemeProvider><CssBaseline /><BrowserRouter><AuthProvider><RegistrationReportsPage /></AuthProvider></BrowserRouter></AppThemeProvider>);
