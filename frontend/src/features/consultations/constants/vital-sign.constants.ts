export type VitalStatusLevel = 'low' | 'normal' | 'warning' | 'critical';
export type VitalStatusIcon = 'info' | 'check' | 'warning' | 'alert';

export interface VitalStatusDefinition {
  level: VitalStatusLevel;
  label: string;
  icon: VitalStatusIcon;
  color: string;
  borderColor: string;
  backgroundColor: string;
}

export const VITAL_STATUS_DEFINITIONS: Record<VitalStatusLevel, VitalStatusDefinition> = {
  low: {
    level: 'low',
    label: 'Low',
    icon: 'info',
    color: '#1d4ed8',
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  normal: {
    level: 'normal',
    label: 'Normal',
    icon: 'check',
    color: '#15803d',
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  warning: {
    level: 'warning',
    label: 'Warning',
    icon: 'warning',
    color: '#b45309',
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  critical: {
    level: 'critical',
    label: 'Critical',
    icon: 'alert',
    color: '#b91c1c',
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
};

// RHU policy thresholds are kept here so classification rules can be adjusted centrally.
export const BLOOD_PRESSURE_THRESHOLDS = {
  systolic: { lowBelow: 90, normalMax: 119, warningMax: 179 },
  diastolic: { lowBelow: 60, normalMax: 79, warningMax: 119 },
} as const;

export const TEMPERATURE_THRESHOLDS = {
  criticalLowBelow: 35.0,
  lowMax: 35.9,
  normalMin: 36.0,
  normalMax: 37.4,
  warningMax: 39.9,
} as const;
