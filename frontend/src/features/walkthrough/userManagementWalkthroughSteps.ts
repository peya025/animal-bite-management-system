import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export const USER_MANAGEMENT_STEPS: WalkthroughStep[] = [
  {
    id: 'users-roster',
    module: 'User Management',
    route: ROUTES.USERS.LIST,
    title: 'Staff Accounts Roster',
    content:
      'Review all registered clinic personnel, their active roles (Doctor, Nurse, Registration Staff, Admin), and account verification statuses.',
    targetSelector: 'main.page-content, .users-table-container',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'users-invite',
    module: 'User Management',
    route: ROUTES.USERS.LIST,
    title: 'Add & Invite Staff',
    content:
      'Create new staff user accounts, designate clinical roles, or send invitation credentials to onboarding healthcare personnel.',
    targetSelector: 'a[href*="/users/create"], button, main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  },
  {
    id: 'users-actions',
    module: 'User Management',
    route: ROUTES.USERS.LIST,
    title: 'Account Status & Role Permissions',
    content:
      'Edit user profiles, adjust role assignments, toggle account active status, or reset credentials securely.',
    targetSelector: '.MuiTableContainer-root, .MuiTable-root, main.page-content',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  },
];

export function getUserManagementSteps(route: string = ROUTES.USERS.LIST): WalkthroughStep[] {
  return USER_MANAGEMENT_STEPS.map(step => ({ ...step, route }));
}
