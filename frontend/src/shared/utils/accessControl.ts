import type { User, RoleItem } from '../types';

/** Documented background polling interval for workstation clinical notifications: 12 seconds */
export const NOTIFICATION_POLL_INTERVAL_MS = 12000;

export const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  admin: '/dashboard',
  developer: '/dashboard',
  registration: '/patients',
  triage: '/queue',
  doctor: '/queue',
  treatment: '/nurse/patients',
};

interface RoleLike {
  slug?: string;
  name?: string;
  default_route?: string;
}

interface NotificationLike {
  clinic_id?: number | string | null;
  user_id?: number | string | null;
  role?: string | null;
  category?: string;
  action_url?: string | null;
}

/**
 * Resolve the default authorized landing page for a user based on their primary
 * role, active nurse station preference, or assigned system roles.
 */
export function resolveDefaultAuthorizedRoute(user: User | null | undefined): string {
  if (!user) return '/dashboard';

  const roles: Array<RoleItem | RoleLike> = user.roles || [];
  const hasIntake = roles.some((r) => r.slug === 'intake_nurse');
  const hasFollowUp = roles.some((r) => r.slug === 'follow_up_nurse');

  // Solo / Dual-role Nurse: check active station mode preference
  if (hasIntake && hasFollowUp) {
    const activeStation = localStorage.getItem('active_station_mode');
    if (activeStation === 'follow_up') return '/nurse/patients';
    return '/queue';
  }

  if (hasIntake) return '/queue';
  if (hasFollowUp) return '/nurse/patients';

  // Triage / Doctor role
  if (user.role === 'triage' || (user as unknown as { role?: string }).role === 'doctor') {
    return '/queue';
  }

  // Check roles table default_route
  if (roles.length > 0 && roles[0]?.default_route) {
    return roles[0].default_route;
  }

  if (user.role && ROLE_DEFAULT_ROUTES[user.role]) {
    return ROLE_DEFAULT_ROUTES[user.role];
  }

  return '/dashboard';
}

/** Route to allowed roles mapping table */
const ROUTE_PERMISSIONS: Array<{ pattern: RegExp; allowedRoles: string[] }> = [
  { pattern: /^\/dashboard(\/.*)?$/, allowedRoles: ['developer', 'admin', 'registration', 'triage', 'treatment'] },
  { pattern: /^\/patients(\/(?!doctor).*|$)/, allowedRoles: ['registration', 'admin', 'developer'] },
  { pattern: /^\/patient-registry(\/.*)?$/, allowedRoles: ['triage', 'treatment', 'admin', 'developer'] },
  { pattern: /^\/patient-list(\/.*)?$/, allowedRoles: ['triage', 'treatment', 'admin', 'developer'] },
  { pattern: /^\/nurse\/patients(\/.*)?$/, allowedRoles: ['treatment', 'admin', 'developer'] },
  { pattern: /^\/doctor\/patients(\/.*)?$/, allowedRoles: ['triage', 'admin', 'developer'] },
  { pattern: /^\/patients\/doctor(\/.*)?$/, allowedRoles: ['triage', 'admin', 'developer'] },
  { pattern: /^\/inventory\/types(\/.*)?$/, allowedRoles: ['admin', 'developer'] },
  { pattern: /^\/inventory(\/.*)?$/, allowedRoles: ['admin', 'treatment', 'developer'] },
  { pattern: /^\/queue(\/.*)?$/, allowedRoles: ['registration', 'triage', 'treatment', 'admin', 'developer'] },
  { pattern: /^\/bite-cases(\/.*)?$/, allowedRoles: ['registration', 'triage', 'treatment', 'admin', 'developer'] },
  { pattern: /^\/bite-map(\/.*)?$/, allowedRoles: ['developer', 'admin', 'registration', 'triage', 'treatment'] },
  { pattern: /^\/bite-intakes(\/.*)?$/, allowedRoles: ['registration', 'triage', 'treatment', 'admin', 'developer'] },
  { pattern: /^\/vaccinations\/record(\/.*)?$/, allowedRoles: ['treatment', 'admin', 'developer'] },
  { pattern: /^\/vaccinations(\/.*)?$/, allowedRoles: ['triage', 'treatment', 'admin', 'developer'] },
  { pattern: /^\/treatment-records(\/.*)?$/, allowedRoles: ['triage', 'admin', 'developer'] },
  { pattern: /^\/users(\/.*)?$/, allowedRoles: ['admin', 'developer'] },
  { pattern: /^\/staff-activity(\/.*)?$/, allowedRoles: ['admin', 'developer'] },
  { pattern: /^\/reports(\/.*)?$/, allowedRoles: ['registration', 'triage', 'treatment', 'admin', 'developer'] },
  { pattern: /^\/profile(\/.*)?$/, allowedRoles: ['developer', 'admin', 'registration', 'triage', 'treatment'] },
  { pattern: /^\/developer(\/.*)?$/, allowedRoles: ['developer', 'admin'] },
  { pattern: /^\/setup(\/.*)?$/, allowedRoles: ['admin', 'developer'] },
  { pattern: /^\/registration(\/.*)?$/, allowedRoles: ['registration', 'admin', 'developer'] },
];

/**
 * Check if a user has permission to access a specific route path.
 */
export function canUserAccessRoute(user: User | null | undefined, path: string | null | undefined): boolean {
  if (!path) return true;
  if (!user || !user.role) return false;

  // Clean path: strip query params and hash
  const cleanPath = path.split('?')[0].split('#')[0] || '/';

  // Normalize legacy/alias aliases
  if (cleanPath === '/' || cleanPath === '/login') return true;

  for (const { pattern, allowedRoles } of ROUTE_PERMISSIONS) {
    if (pattern.test(cleanPath)) {
      return allowedRoles.includes(user.role);
    }
  }

  // Fallback: If route is unknown or unrestricted, allow authenticated user
  return true;
}

/**
 * Verify whether a notification is relevant to the logged-in user's role and clinic.
 */
export function isNotificationRelevantToUser(
  notification: NotificationLike,
  user: User | null | undefined
): boolean {
  if (!user) return false;

  // Clinic check
  if (notification.clinic_id && user.clinic_id && Number(notification.clinic_id) !== Number(user.clinic_id)) {
    return false;
  }

  // User-specific targeting
  if (notification.user_id && Number(notification.user_id) !== Number(user.id)) {
    return false;
  }

  const role = user.role;

  // Role-specific notification target
  if (notification.role && notification.role !== 'all' && notification.role !== role) {
    // Admin and developer have administrative oversight of clinic queue/inventory events
    if (role !== 'admin' && role !== 'developer') {
      return false;
    }
  }

  // Category relevance: Registration staff does not manage clinical inventory or batch expiries
  if (role === 'registration' && (notification.category === 'inventory' || notification.category === 'expiry')) {
    return false;
  }

  return true;
}
