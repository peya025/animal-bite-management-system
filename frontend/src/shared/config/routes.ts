/**
 * Centralised route path constants.
 * Use these instead of hardcoded strings so refactoring a URL
 * only requires changing one place.
 *
 * @example
 * import { ROUTES } from '../../shared/config/routes';
 * navigate(ROUTES.PATIENTS.LIST);
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  UNAUTHORIZED: '/unauthorized',

  PATIENTS: {
    LIST:    '/patients',
    CREATE:  '/patients/create',
    DETAILS: '/patients/:id',
    EDIT:    '/patients/:id/edit',
    NURSE_LIST: '/nurse/patients',
    DOCTOR_LIST: '/doctor/patients',
  },

  BITE_CASES: {
    LIST:   '/bite-cases',
    NEW:    '/bite-cases/new',
    DETAIL: '/bite-cases/:id',
    EDIT:   '/bite-cases/:id/edit',
  },

  VACCINATIONS: {
    LIST:     '/vaccinations',
    SCHEDULE: '/vaccinations/schedule',
  },

  QUEUE: {
    DASHBOARD:  '/queue',
    MANAGEMENT: '/queue/management',
  },

  INVENTORY: {
    LIST: '/inventory',
  },

  TREATMENT_RECORDS: {
    LIST: '/treatment-records',
    NEW:  '/treatment-records/new',
  },

  REPORTS: {
    LIST: '/reports',
  },

  USERS: {
    LIST:   '/users',
    INVITE: '/users/invite',
  },

  AUDIT: {
    ACTIVITY: '/staff-activity',
  },

  SETUP: '/setup',
  CLINIC_SETUP: {
    INFO:              '/setup/clinic-info',
    MODULES:           '/setup/modules',
    STAFF_ASSIGNMENTS: '/setup/staff-assignments',
    TEMPLATES:         '/setup/templates',
    VAX_SCHED:         '/setup/vaccination-schedules',
  },
  PROFILE: '/profile',
  DEVELOPER_SETTINGS: '/developer/landing-settings',
  DATABASE_EXPLORER: '/developer/database-explorer',
} as const;

/** Helper: build a concrete path by replacing :params */
export function buildRoute(route: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (path, [key, val]) => path.replace(`:${key}`, String(val)),
    route,
  );
}
