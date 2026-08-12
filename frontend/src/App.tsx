import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './features/auth/pages/LoginPage';
import SetupWizard from './features/clinic-setup/pages/SetupWizardPage';
import AcceptInvitationPage from './features/auth/pages/AcceptInvitationPage';
import PatientList from './features/patients/pages/PatientListPage';
import NursePatientList from './features/patients/pages/NursePatientListPage';
import DoctorPatientList from './features/patients/pages/DoctorPatientListPage';
import VaccineInventory from './features/inventory/pages/VaccineInventoryPage';
import QueueDashboard from './features/queue/pages/QueueDashboardPage';
import QueuePatientDetailPage from './features/queue/pages/QueuePatientDetailPage';
import BiteCaseRiskDashboard from './features/bite-cases/pages/BiteCaseRiskDashboard';
import BiteCaseListPage from './features/bite-cases/pages/BiteCaseListPage';
import BiteMapPage from './features/bite-cases/pages/BiteMapPage';
import ClinicInformation from './features/clinic-setup/pages/ClinicInformationPage';
import ModuleConfigPage from './features/clinic-setup/pages/ModuleConfigPage';
import StaffAssignmentPage from './features/clinic-setup/pages/StaffAssignmentPage';
import VaccinationSchedulePage from './features/vaccinations/pages/VaccinationSchedulePage';
import UserListPage from './features/users/pages/UserListPage';
import UserCreatePage from './features/users/pages/UserCreatePage';
import UserProfilePage from './features/users/pages/UserProfilePage';

// Lazy-loaded secondary & heavy pages
const StaffActivityPage = lazy(() => import('./features/audit/pages/StaffActivityPage'));
const ReportsDashboardPage = lazy(() => import('./features/reports/pages/ReportsDashboardPage'));
const TreatmentRecordsPage = lazy(() => import('./features/treatment-records/pages/TreatmentRecordsPage'));
const DeveloperLandingSettingsPage = lazy(() => import('./features/developer/pages/DeveloperLandingSettingsPage'));
const DeveloperDatabaseExplorerPage = lazy(() => import('./features/developer/pages/DeveloperDatabaseExplorerPage'));

import { AppStyleScope } from './styles/SimpleDashboard.styles';
import { ROUTES } from './shared/config/routes';
import { AppLayout } from './shared/components/layout/AppLayout';
import { SimpleDashboardPage } from './features/dashboard/pages/SimpleDashboardPage';

// Auth Check Helper
function isAuthenticated(): boolean {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  return !!(token && userData);
}

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <AppStyleScope>
      <Suspense
        fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#10b981' }}>
            <span>Loading page...</span>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
          
          {/* Authenticated Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><SimpleDashboardPage /></ProtectedRoute>} />
          
          {/* Authenticated Application Routes */}
          <Route path="/patients" element={<ProtectedRoute><AppLayout title="Patients"><PatientList /></AppLayout></ProtectedRoute>} />
          <Route path="/nurse/patients" element={<ProtectedRoute><AppLayout title="My Patients"><NursePatientList /></AppLayout></ProtectedRoute>} />
          <Route path="/doctor/patients" element={<ProtectedRoute><AppLayout title="My Patients"><DoctorPatientList /></AppLayout></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><AppLayout title="Vaccine Inventory"><VaccineInventory /></AppLayout></ProtectedRoute>} />
          <Route path="/queue" element={<ProtectedRoute><AppLayout title="Queue"><QueueDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/queue/:queueId/patient" element={<ProtectedRoute><AppLayout title="Patient Detail"><QueuePatientDetailPage /></AppLayout></ProtectedRoute>} />
          <Route path="/bite-cases" element={<ProtectedRoute><AppLayout title="Bite Cases & Risk Surveillance"><BiteCaseRiskDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/bite-map" element={<ProtectedRoute><AppLayout title="Bite Location Map"><BiteMapPage /></AppLayout></ProtectedRoute>} />
          <Route path="/bite-cases/map" element={<Navigate to="/bite-map" replace />} />
          <Route path="/bite-intakes" element={<ProtectedRoute><AppLayout title="Bite Incident Intakes"><BiteCaseListPage /></AppLayout></ProtectedRoute>} />
          <Route path="/vaccinations" element={<ProtectedRoute><AppLayout title="Vaccination Schedule (Form 3)"><VaccinationSchedulePage /></AppLayout></ProtectedRoute>} />
          <Route path="/vaccinations/record" element={<ProtectedRoute><AppLayout title="Record Vaccination"><VaccinationSchedulePage /></AppLayout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><AppLayout title="User Management"><UserListPage /></AppLayout></ProtectedRoute>} />
          <Route path="/staff-activity" element={<ProtectedRoute><AppLayout title="Staff Activity Monitor"><StaffActivityPage /></AppLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><AppLayout title="Reports & Analytics"><ReportsDashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/treatment-records" element={<ProtectedRoute><AppLayout title="Individual Treatment Record (Form 2)"><TreatmentRecordsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/users/create" element={<ProtectedRoute><AppLayout title="Add User"><UserCreatePage /></AppLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AppLayout title="My Profile"><UserProfilePage /></AppLayout></ProtectedRoute>} />
          <Route path="/developer/landing-settings" element={<ProtectedRoute><AppLayout title="Developer Landing Settings"><DeveloperLandingSettingsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/developer/database-explorer" element={<ProtectedRoute><AppLayout title="Database Explorer (XAMPP)"><DeveloperDatabaseExplorerPage /></AppLayout></ProtectedRoute>} />
          <Route path="/setup/clinic-info" element={<ProtectedRoute><AppLayout title="Clinic Information"><ClinicInformation /></AppLayout></ProtectedRoute>} />
          <Route path="/setup/modules" element={<ProtectedRoute><AppLayout title="Module Configuration"><ModuleConfigPage /></AppLayout></ProtectedRoute>} />
          <Route path="/setup/staff-assignments" element={<ProtectedRoute><AppLayout title="Staff Module Assignments"><StaffAssignmentPage /></AppLayout></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </AppStyleScope>
  );
}

export default App;
