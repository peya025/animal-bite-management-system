import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AppThemeProvider } from '../../src/shared/contexts/ThemeContext';
import { AuthProvider } from '../../src/shared/contexts/AuthContext';
import { ClinicModuleConfigProvider } from '../../src/hooks/useClinicModuleConfig';
import NursePatientListPage from '../../src/features/patients/pages/NursePatientListPage';
import * as station2Routing from '../../src/features/patients/utils/station2FollowUpRouting';
import '../../src/styles/global.css';

// Expose pure helpers on window so Playwright can assert unit edge cases alongside full UI behavior
(window as any).__station2Routing = station2Routing;

localStorage.setItem('auth_token', 'test-station2-token');
localStorage.setItem(
  'userData',
  JSON.stringify({
    id: 10,
    name: 'Station 2 Nurse',
    email: 'nurse@abtc.local',
    role: 'treatment',
    clinic_id: 1,
    is_nursing: true,
    roles: [{ slug: 'follow_up_nurse' }],
  }),
);
localStorage.setItem(
  'clinicData',
  JSON.stringify({
    id: 1,
    name: 'Test ABTC Clinic',
  }),
);

function Harness() {
  return (
    <MemoryRouter initialEntries={['/nurse/patients']}>
      <AppThemeProvider>
        <CssBaseline />
        <AuthProvider>
          <ClinicModuleConfigProvider>
            <NursePatientListPage />
          </ClinicModuleConfigProvider>
        </AuthProvider>
      </AppThemeProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
