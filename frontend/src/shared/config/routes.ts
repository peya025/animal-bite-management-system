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

  REPORTS: {
    LIST: '/reports',
  },

  USERS: {
    LIST:   '/users',
    INVITE: '/users/invite',
  },

  SETUP: '/setup',
  CLINIC_INFO: '/clinic-info',
  PROFILE: '/profile',
} as const;

/** Helper: build a concrete path by replacing :params */
export function buildRoute(route: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (path, [key, val]) => path.replace(`:${key}`, String(val)),
    route,
  );
}
