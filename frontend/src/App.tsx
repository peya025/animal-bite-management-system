import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './features/auth/pages/LoginPage';
import InitialSetupRoute from './components/InitialSetupRoute';
import AcceptInvitationPage from './features/auth/pages/AcceptInvitationPage';
import PatientList from './features/patients/pages/PatientListPage';
import NursePatientList from './features/patients/pages/NursePatientListPage';
import DoctorPatientList from './features/patients/pages/DoctorPatientListPage';
import VaccineInventory from './features/inventory/pages/VaccineInventoryPage';
import VaccineTypeManagementPage from './features/inventory/pages/VaccineTypeManagementPage';
import QueueDashboard from './features/queue/pages/QueueDashboardPage';
import QueueDisplayPage from './features/queue/pages/QueueDisplayPage';
import QueuePatientDetailPage from './features/queue/pages/QueuePatientDetailPage';
import BiteCaseRiskDashboard from './features/bite-cases/pages/BiteCaseRiskDashboard';
import BiteCaseListPage from './features/bite-cases/pages/BiteCaseListPage';
import BiteMapPage from './features/bite-cases/pages/BiteMapPage';
import ClinicInformation from './features/clinic-setup/pages/ClinicInformationPage';
import ClinicOperatingSchedulePage from './features/clinic-setup/pages/ClinicOperatingSchedulePage';
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
const AppointmentDiagnosticsPage = lazy(() => import('./features/developer/pages/AppointmentDiagnosticsPage'));

import { AppStyleScope } from './styles/SimpleDashboard.styles';

import { AppLayout } from './shared/components/layout/AppLayout';
import { SimpleDashboardPage } from './features/dashboard/pages/SimpleDashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';

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
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/setup" element={<InitialSetupRoute />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
          
          {/* Authenticated Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><SimpleDashboardPage /></ProtectedRoute>} />
          
          {/* Authenticated Application Routes */}
          <Route path="/patients" element={<ProtectedRoute allowedRoles={['registration', 'admin', 'developer']}><AppLayout title="Patient Registration"><PatientList /></AppLayout></ProtectedRoute>} />
          <Route path="/patient-registry" element={<ProtectedRoute allowedRoles={['triage', 'treatment', 'admin', 'developer']}><AppLayout title="Patient Registry"><PatientList /></AppLayout></ProtectedRoute>} />
          <Route path="/nurse/patients" element={<ProtectedRoute allowedRoles={['treatment', 'admin', 'developer']}><AppLayout title="Station 2 · Follow-up Doses"><NursePatientList /></AppLayout></ProtectedRoute>} />
          <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={['triage', 'admin', 'developer']}><AppLayout title="Patients List"><DoctorPatientList /></AppLayout></ProtectedRoute>} />
          <Route path="/patients/doctor" element={<Navigate to="/doctor/patients" replace />} />
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'treatment', 'developer']}><AppLayout title="Vaccine Inventory"><VaccineInventory /></AppLayout></ProtectedRoute>} />
          <Route path="/inventory/administrations" element={<ProtectedRoute allowedRoles={['admin', 'treatment', 'developer']}><AppLayout title="Inventory Transaction"><VaccineInventory initialTab="administrations" /></AppLayout></ProtectedRoute>} />
          <Route path="/inventory/types" element={<ProtectedRoute allowedRoles={['admin', 'developer']}><AppLayout title="Vaccine Setup"><VaccineTypeManagementPage /></AppLayout></ProtectedRoute>} />
          <Route path="/queue" element={<ProtectedRoute allowedRoles={['registration', 'triage', 'treatment', 'admin', 'developer']}><AppLayout title="Station 1 · New & Day 0"><QueueDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/queue/display" element={<ProtectedRoute allowedRoles={['registration', 'triage', 'treatment', 'admin', 'developer']}><QueueDisplayPage /></ProtectedRoute>} />
          <Route path="/queue/:queueId/patient" element={<ProtectedRoute allowedRoles={['registration', 'triage', 'treatment', 'admin', 'developer']}><AppLayout title="Patient Detail"><QueuePatientDetailPage /></AppLayout></ProtectedRoute>} />
          <Route path="/bite-cases" element={<ProtectedRoute allowedRoles={['triage', 'treatment', 'admin', 'developer']}><AppLayout title="Bite Cases Summary"><BiteCaseRiskDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/bite-map" element={<ProtectedRoute allowedRoles={['developer', 'admin', 'registration', 'triage', 'treatment']}><AppLayout title="Bite Map"><BiteMapPage /></AppLayout></ProtectedRoute>} />
          <Route path="/bite-cases/map" element={<Navigate to="/bite-map" replace />} />
          <Route path="/bite-intakes" element={<ProtectedRoute allowedRoles={['registration', 'triage', 'treatment', 'admin', 'developer']}><AppLayout title="Bite Incident Intakes"><BiteCaseListPage /></AppLayout></ProtectedRoute>} />
          <Route path="/vaccinations" element={<ProtectedRoute allowedRoles={['triage', 'treatment', 'admin', 'developer']}><AppLayout title="Vaccination Schedule"><VaccinationSchedulePage /></AppLayout></ProtectedRoute>} />
          <Route path="/vaccinations/record" element={<ProtectedRoute allowedRoles={['triage', 'treatment', 'admin', 'developer']}><AppLayout title="Vaccination Schedule"><VaccinationSchedulePage /></AppLayout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'developer']}><AppLayout title="User Management"><UserListPage /></AppLayout></ProtectedRoute>} />
          <Route path="/staff-activity" element={<ProtectedRoute allowedRoles={['admin', 'developer']}><AppLayout title="Staff Activity Monitor"><StaffActivityPage /></AppLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['registration', 'triage', 'treatment', 'admin', 'developer']}><AppLayout title="Reports & Analytics"><ReportsDashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/treatment-records" element={<ProtectedRoute allowedRoles={['triage', 'admin', 'developer']}><AppLayout title="Individual Treatment Record (Form 2)"><TreatmentRecordsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/users/create" element={<ProtectedRoute allowedRoles={['admin', 'developer']}><AppLayout title="User Management"><UserCreatePage /></AppLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['developer', 'admin', 'registration', 'triage', 'treatment']}><AppLayout title="My Profile"><UserProfilePage /></AppLayout></ProtectedRoute>} />
          <Route path="/developer/landing-settings" element={<ProtectedRoute allowedRoles={['developer', 'admin']}><AppLayout title="Landing & Footer Settings"><DeveloperLandingSettingsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/developer/database-explorer" element={<ProtectedRoute allowedRoles={['developer', 'admin']}><AppLayout title="Database Explorer (XAMPP)"><DeveloperDatabaseExplorerPage /></AppLayout></ProtectedRoute>} />
          <Route path="/developer/appointment-diagnostics" element={<ProtectedRoute allowedRoles={['developer', 'admin']}><AppLayout title="Appointment Bug Catcher"><AppointmentDiagnosticsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/setup/clinic-info" element={<ProtectedRoute allowedRoles={['admin', 'developer']}><AppLayout title="Clinic Information"><ClinicInformation /></AppLayout></ProtectedRoute>} />
          <Route path="/setup/schedule" element={<ProtectedRoute allowedRoles={['admin', 'developer']}><AppLayout title="Operating Schedule"><ClinicOperatingSchedulePage /></AppLayout></ProtectedRoute>} />
          <Route path="/setup/modules" element={<ProtectedRoute allowedRoles={['admin', 'developer']}><AppLayout title="Module Configuration"><ModuleConfigPage /></AppLayout></ProtectedRoute>} />
          <Route path="/setup/staff-assignments" element={<ProtectedRoute allowedRoles={['admin', 'developer']}><AppLayout title="Staff Assignments"><StaffAssignmentPage /></AppLayout></ProtectedRoute>} />
          
          {/* Legacy / Alias Route Redirects */}
          <Route path="/registration" element={<Navigate to="/patients" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppStyleScope>
  );
}

export default App;
