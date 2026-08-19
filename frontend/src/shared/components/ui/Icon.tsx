import React from 'react';

export type IconName =
  | 'dashboard'
  | 'patients'
  | 'queue'
  | 'biteCases'
  | 'vaccinations'
  | 'inventory'
  | 'reports'
  | 'users'
  | 'developerSettings'
  | 'databaseExplorer'
  | 'clinicSetup'
  | 'logout'
  | 'login'
  | 'activity'
  | 'security'
  | 'warning'
  | 'chevronDown'
  | 'chevronRight'
  | 'chevronLeft'
  | 'search'
  | 'filter'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'check'
  | 'info'
  | 'key'
  | 'phone'
  | 'email'
  | 'location'
  | 'send'
  | 'copy'
  | 'table'
  | 'settings'
  | 'print'
  | 'notification'
  | 'calendar';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Global Hugeicons System Icon Set
 * Signature 24x24 rounded stroke geometry from Hugeicons Design System
 */
export const GLOBAL_ICONS: Record<IconName, (props: { size: number; color: string; strokeWidth: number }) => React.ReactNode> = {
  // Hugeicons Dashboard Square
  dashboard: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="2.5" />
      <rect x="13" y="3" width="8" height="8" rx="2.5" />
      <rect x="3" y="13" width="8" height="8" rx="2.5" />
      <rect x="13" y="13" width="8" height="8" rx="2.5" />
    </svg>
  ),

  // Hugeicons User Group (Patients)
  patients: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3.5" />
      <path d="M3 19c0-3.31 2.69-6 6-6s6 2.69 6 6" />
      <circle cx="17" cy="8.5" r="2.5" />
      <path d="M15 19c0-2.21 1.79-4 4-4s4 1.79 4 4" />
    </svg>
  ),

  // Hugeicons Queue List
  queue: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="4" cy="6" r="1.25" fill={color} />
      <circle cx="4" cy="12" r="1.25" fill={color} />
      <circle cx="4" cy="18" r="1.25" fill={color} />
    </svg>
  ),

  // Hugeicons Health Pulse (Bite Cases)
  biteCases: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h4l2.5-6 4.5 12 3.5-9 2.5 3h3" />
    </svg>
  ),

  // Hugeicons Syringe / Vaccine
  vaccinations: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 3l3 3" />
      <path d="M14 7l3 3" />
      <path d="M10.5 10.5l6 6" />
      <path d="M15 6l3 3-9 9H6v-3l9-9z" />
      <path d="M3 21l3-3" />
      <path d="M9 12l-1.5-1.5" />
    </svg>
  ),

  // Hugeicons Package / Medicine Box (Inventory)
  inventory: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),

  // Hugeicons Analytics / Report Document
  reports: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2.5 2.5 0 0 0-2.5 2.5v15A2.5 2.5 0 0 0 6 22h12a2.5 2.5 0 0 0 2.5-2.5V8L14 2z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h3v5H8z" />
      <path d="M13 10h3v8h-3z" />
    </svg>
  ),

  // Hugeicons User Settings / Management
  users: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21c0-3.87 3.13-7 7-7s7 3.13 7 7" />
    </svg>
  ),

  // Hugeicons Source Code / Developer
  developerSettings: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 8l-4 4 4 4" />
      <path d="M17 8l4 4-4 4" />
      <path d="M14 4l-4 16" />
    </svg>
  ),

  // Hugeicons Database
  databaseExplorer: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  ),

  // Hugeicons Hospital / Clinic Building
  clinicSetup: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
      <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
      <path d="M12 7v4" />
      <path d="M10 9h4" />
    </svg>
  ),

  // Hugeicons Logout
  logout: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  ),

  // Hugeicons Login
  login: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="M14 17l5-5-5-5" />
      <path d="M19 12H7" />
    </svg>
  ),

  // Hugeicons Activity / Pulse
  activity: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),

  // Hugeicons Shield Security
  security: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),

  // Hugeicons Warning Triangle
  warning: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="17" r="0.5" fill={color} />
    </svg>
  ),

  // Hugeicons Chevrons
  chevronDown: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  chevronRight: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  chevronLeft: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),

  // Hugeicons Search
  search: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7.5" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  ),

  // Hugeicons Filter
  filter: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4.5h20" />
      <path d="M6 11.5h12" />
      <path d="M10 18.5h4" />
    </svg>
  ),

  // Hugeicons Add Plus
  plus: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),

  // Hugeicons Edit Pencil
  edit: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),

  // Hugeicons Delete Trash
  trash: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),

  // Hugeicons Tick Check
  check: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),

  // Hugeicons Info Circle
  info: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.5" fill={color} />
    </svg>
  ),

  // Hugeicons Key
  key: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.8 12.2L21 2" />
      <path d="M16 7l3 3" />
    </svg>
  ),

  // Hugeicons Phone Call
  phone: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),

  // Hugeicons Mail / Email
  email: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 6l9 6 9-6" />
    </svg>
  ),

  // Hugeicons Location Pin
  location: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z" />
      <circle cx="12" cy="9" r="3" />
    </svg>
  ),

  // Hugeicons Send Paper Plane
  send: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),

  // Hugeicons Copy Clipboard
  copy: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),

  // Hugeicons Table Sheet
  table: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
    </svg>
  ),

  // Hugeicons Settings Cog
  settings: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  // Hugeicons Printer
  print: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  notification: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </svg>
  ),
  calendar: ({ size, color, strokeWidth }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

export const Icon = ({
  name,
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
  style,
  className,
  ...rest
}: IconProps) => {
  const iconRenderer = GLOBAL_ICONS[name];
  if (!iconRenderer) return null;
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
      {...rest}
    >
      {iconRenderer({ size, color, strokeWidth })}
    </span>
  );
};

/** Centralized Hugeicons Navigation Map (Keyed by Nav Label) */
export const GLOBAL_NAV_ICONS: Record<string, React.ReactNode> = {
  Dashboard: <Icon name="dashboard" />,
  Patients: <Icon name="patients" />,
  'Patient Registration': <Icon name="patients" />,
  'Patient Registration (Form 1)': <Icon name="patients" />,
  Queue: <Icon name="queue" />,
  'Patient Queue': <Icon name="queue" />,
  'Bite Cases': <Icon name="biteCases" />,
  'Bite Map': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </svg>
  ),
  'Bite Incident Intake': <Icon name="biteCases" />,
  'Individual Treatment (Form 2)': <Icon name="vaccinations" />,
  Vaccinations: <Icon name="vaccinations" />,
  'Vaccination & Treatment': <Icon name="vaccinations" />,
  'Vaccination Schedule (Form 3)': <Icon name="vaccinations" />,
  'Vaccination Cards (Form 3)': <Icon name="vaccinations" />,
  'Treatment Records': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2.5 2.5 0 0 0-2.5 2.5v15A2.5 2.5 0 0 0 6 22h12a2.5 2.5 0 0 0 2.5-2.5V8L14 2z" />
      <path d="M14 2v6h6" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
    </svg>
  ),
  'Treatment Record Cards (Forms 2 & 3)': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2.5 2.5 0 0 0-2.5 2.5v15A2.5 2.5 0 0 0 6 22h12a2.5 2.5 0 0 0 2.5-2.5V8L14 2z" />
      <path d="M14 2v6h6" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
    </svg>
  ),
  Inventory: <Icon name="inventory" />,
  'Vaccine Inventory': <Icon name="inventory" />,
  Reports: <Icon name="reports" />,
  'Reports & Surveillance': <Icon name="reports" />,
  'Reports & Analytics': <Icon name="reports" />,
  Users: <Icon name="users" />,
  'User Management': <Icon name="users" />,
  'Developer Settings': <Icon name="developerSettings" />,
  'Database Explorer': <Icon name="databaseExplorer" />,
  'Clinic Setup': <Icon name="clinicSetup" />,
  'Staff Activity': <Icon name="activity" />,
  'Staff Activity Monitor': <Icon name="activity" />,
};
