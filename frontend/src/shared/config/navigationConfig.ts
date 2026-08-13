import React from 'react';
import { ROUTES } from './routes';
import { GLOBAL_NAV_ICONS } from '../components/ui/Icon';

export interface SubMenuItem {
  label: string;
  path: string;
  roles?: string[];
}

export interface NavItemConfig {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  roles: string[];
  submenu?: SubMenuItem[];
}

export const ROLE_LABELS: Record<string, string> = {
  developer: 'Developer',
  admin: 'Administrator',
  registration: 'Registration Staff',
  triage: 'Triage / Doctor',
  treatment: 'Treatment Staff',
};

export const DYNAMIC_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: GLOBAL_NAV_ICONS['Dashboard'],
    roles: ['developer', 'admin', 'registration', 'triage', 'treatment'],
  },
  {
    label: 'Patient Registration',
    path: ROUTES.PATIENTS.LIST,
    icon: GLOBAL_NAV_ICONS['Patient Registration'],
    roles: ['registration', 'admin'],
  },
  {
    label: 'Patient Queue',
    path: ROUTES.QUEUE.DASHBOARD,
    icon: GLOBAL_NAV_ICONS['Patient Queue'],
    roles: ['registration', 'triage', 'treatment', 'admin'],
  },
  {
    label: 'Patients List',
    path: ROUTES.PATIENTS.DOCTOR_LIST,
    icon: GLOBAL_NAV_ICONS['Patients'],
    roles: ['triage'],
  },
  {
    label: 'Patients List',
    path: ROUTES.PATIENTS.NURSE_LIST,
    icon: GLOBAL_NAV_ICONS['Patients'],
    roles: ['treatment'],
  },
  {
    label: 'Bite Cases Summary',
    path: ROUTES.BITE_CASES.LIST,
    icon: GLOBAL_NAV_ICONS['Bite Cases'],
    roles: ['triage', 'treatment', 'admin'],
  },
  {
    label: 'Bite Map',
    path: ROUTES.BITE_CASES.MAP,
    icon: GLOBAL_NAV_ICONS['Bite Map'],
    roles: ['developer', 'admin', 'registration', 'triage', 'treatment'],
  },
  {
    label: 'Vaccine Inventory',
    path: ROUTES.INVENTORY.LIST,
    icon: GLOBAL_NAV_ICONS['Vaccine Inventory'],
    roles: ['treatment', 'admin'],
  },
  {
    label: 'Vaccination Schedule',
    path: ROUTES.VACCINATIONS.LIST,
    icon: GLOBAL_NAV_ICONS['Vaccinations'],
    roles: ['triage', 'treatment'],
  },
  {
    label: 'Treatment Records',
    path: ROUTES.TREATMENT_RECORDS.LIST,
    icon: GLOBAL_NAV_ICONS['Treatment Records'],
    roles: ['treatment', 'triage'],
  },
  {
    label: 'Reports & Analytics',
    path: ROUTES.REPORTS.LIST,
    icon: GLOBAL_NAV_ICONS['Reports & Analytics'],
    roles: ['registration', 'triage', 'treatment', 'admin'],
  },
  {
    label: 'User Management',
    path: ROUTES.USERS.LIST,
    icon: GLOBAL_NAV_ICONS['User Management'],
    roles: ['admin'],
  },
  {
    label: 'Clinic Setup',
    icon: GLOBAL_NAV_ICONS['Clinic Setup'],
    roles: ['admin'],
    submenu: [
      { label: 'Clinic Information', path: ROUTES.CLINIC_SETUP.INFO },
      { label: 'Module Configuration', path: ROUTES.CLINIC_SETUP.MODULES },
      { label: 'Staff Assignments', path: ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS },
      { label: 'Staff Activity Monitor', path: ROUTES.AUDIT.ACTIVITY },
      { label: 'Predefined Templates', path: ROUTES.CLINIC_SETUP.TEMPLATES },
    ],
  },
  {
    label: 'Developer Tools',
    icon: GLOBAL_NAV_ICONS['Developer Settings'],
    roles: ['developer'],
    submenu: [
      { label: 'Landing & Footer Settings', path: ROUTES.DEVELOPER_SETTINGS },
      { label: 'Database Explorer (XAMPP)', path: ROUTES.DATABASE_EXPLORER },
    ],
  },
];

/** Filter nav items dynamically based on user role */
export function getNavItemsForRole(role?: string): NavItemConfig[] {
  if (!role) return [];
  return DYNAMIC_NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
    if (!item.submenu) return item;
    // Filter submenu items by role if specified
    const filteredSubmenu = item.submenu.filter((sub) => !sub.roles || sub.roles.includes(role));
    return { ...item, submenu: filteredSubmenu };
  });
}

/** Dynamic exact / prefix route active check */
export function isRouteActive(targetPath: string, currentPath: string, navItems: NavItemConfig[]): boolean {
  if (!targetPath) return false;
  if (currentPath === targetPath) return true;
  if (targetPath === ROUTES.DASHBOARD || targetPath === '/') return false;

  // If another nav item has an exact match with the currentPath, targetPath is not active
  const hasExactOtherMatch = navItems.some(
    (item) => item.path === currentPath || item.submenu?.some((sub) => sub.path === currentPath)
  );
  if (hasExactOtherMatch) return false;

  return currentPath.startsWith(targetPath + '/');
}

/** Check if any item in a submenu is active */
export function isSubmenuActive(submenu: SubMenuItem[] | undefined, currentPath: string, navItems: NavItemConfig[]): boolean {
  if (!submenu) return false;
  return submenu.some((sub) => isRouteActive(sub.path, currentPath, navItems));
}

/** Automatically find parent menu label that should be expanded for current path */
export function findActiveParentSubmenu(currentPath: string, navItems: NavItemConfig[]): string | null {
  for (const item of navItems) {
    if (item.submenu && isSubmenuActive(item.submenu, currentPath, navItems)) {
      return item.label;
    }
  }
  return null;
}
