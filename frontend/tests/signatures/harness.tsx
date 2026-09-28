import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AppThemeProvider } from '../../src/shared/contexts/ThemeContext';
import { AuthProvider } from '../../src/shared/contexts/AuthContext';
import UserListPage from '../../src/features/users/pages/UserListPage';
import VaccinationRecordForm from '../../src/features/vaccinations/components/VaccinationRecordForm';
import '../../src/styles/global.css';

const entry = { queue_id: 1, patient_id: 1, bite_id: 1, patient: {
  patient_id: 1, first_name: 'Test', last_name: 'Patient', age: 30, gender: 'male',
} };
createRoot(document.getElementById('root')!).render(
  <BrowserRouter><AuthProvider><AppThemeProvider><CssBaseline />
    {new URLSearchParams(location.search).has('treatment')
      ? <VaccinationRecordForm open inline entry={entry} onClose={() => {}} onSave={() => {}} />
      : <UserListPage />}
  </AppThemeProvider></AuthProvider></BrowserRouter>,
);
