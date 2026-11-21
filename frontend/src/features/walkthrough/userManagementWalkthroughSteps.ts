import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export function getUserManagementSteps(route: string = ROUTES.USERS.LIST): WalkthroughStep[] {
  return [
    // Step 1: Uniform Welcome / Overview Modal (Centered in viewport)
    {
      id: 'admin-users-overview',
      module: 'User Management',
      section: 'Overview',
      route,
      title: 'User Management Overview',
      content:
        'Welcome to User Management! Manage all clinic personnel, clinical workstation role assignments (Doctors, Nurses, Receptionists, Administrators), and patient mobile app accounts in one central place.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 2: Invite Staff (Image 1)
    {
      id: 'admin-users-invite',
      module: 'User Management',
      section: 'Staff Actions',
      route,
      title: 'Invite Staff',
      content:
        'Click here to send an invitation link by email to onboard a new clinic worker with their designated clinical workstation role.',
      targetSelector:
        '[data-walkthrough="admin-users-invite-btn"], [data-tour="admin-users-invite-btn"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 3: Add User (Image 2)
    {
      id: 'admin-users-add',
      module: 'User Management',
      section: 'Staff Actions',
      route,
      title: 'Add User',
      content:
        'Click here to manually create a staff user account with their name, email, password, clinical workstation role, and PRC professional license.',
      targetSelector:
        '[data-walkthrough="admin-users-add-btn"], [data-tour="admin-users-add-btn"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 4: Filter by Role (Image 5 & 6)
    {
      id: 'admin-users-role-filter',
      module: 'User Management',
      section: 'Staff Users',
      route,
      activateSelector: '[data-walkthrough="admin-users-tab-staff"]',
      title: 'Filter by Role',
      content:
        'Filter clinic staff by their clinical duty: Intake Nurse (Station 1), Follow-Up Nurse (Station 2), Dual-Role Nurse, Doctor / Triage, or Receptionist.',
      targetSelector:
        '[data-walkthrough="admin-users-role-filter"], [data-tour="admin-users-role-filter"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 5: Staff Users Roster (Image 3)
    {
      id: 'admin-users-staff-table',
      module: 'User Management',
      section: 'Staff Users',
      route,
      activateSelector: '[data-walkthrough="admin-users-tab-staff"]',
      title: 'Staff Users Directory',
      content:
        'Browse all clinic staff, their workstation roles, professional licenses, electronic signatures on file, and status. Click "Edit" to update or "Deactivate" to suspend access.',
      targetSelector:
        '[data-walkthrough="admin-users-staff-table"], [data-tour="admin-users-staff-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },

    // Step 6: Patient Accounts Search & Filters (Image 4 + search bar)
    {
      id: 'admin-users-patient-search',
      module: 'User Management',
      section: 'Patient Accounts',
      route,
      activateSelector: '[data-walkthrough="admin-users-tab-patients"]',
      title: 'Patient Accounts Search & Filters',
      content:
        'Search mobile app patient accounts by name, email, or contact number. Filter by account status (Active or Inactive) and click Refresh to reload.',
      targetSelector:
        '[data-walkthrough="admin-users-patient-search"], [data-tour="admin-users-patient-search"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },

    // Step 7: Patient Accounts Directory (Image 4)
    {
      id: 'admin-users-patient-table',
      module: 'User Management',
      section: 'Patient Accounts',
      route,
      activateSelector: '[data-walkthrough="admin-users-tab-patients"]',
      title: 'Patient Accounts Directory',
      content:
        'View patient accounts registered through the mobile app. Check linked pre-registered profiles, last login dates, and manage account access.',
      targetSelector:
        '[data-walkthrough="admin-users-patient-table"], [data-tour="admin-users-patient-table"]',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
  ];
}

export const USER_MANAGEMENT_STEPS: WalkthroughStep[] = getUserManagementSteps();
