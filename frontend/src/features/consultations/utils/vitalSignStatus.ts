import {
  BLOOD_PRESSURE_THRESHOLDS,
  TEMPERATURE_THRESHOLDS,
  VITAL_STATUS_DEFINITIONS,
  type VitalStatusDefinition,
  type VitalStatusLevel,
} from '../constants/vital-sign.constants';

export type VitalStatus = VitalStatusDefinition & { message: string };

const severity: Record<VitalStatusLevel, number> = {
  normal: 0,
  low: 1,
  warning: 2,
  critical: 3,
};

function status(level: VitalStatusLevel, message: string): VitalStatus {
  return { ...VITAL_STATUS_DEFINITIONS[level], message };
}

function classifyBloodPressureValue(value: number, type: 'systolic' | 'diastolic'): VitalStatusLevel {
  const thresholds = BLOOD_PRESSURE_THRESHOLDS[type];
  if (value < thresholds.lowBelow) return 'low';
  if (value > thresholds.warningMax) return 'critical';
  if (value > thresholds.normalMax) return 'warning';
  return 'normal';
}

export function getBloodPressureStatus(systolicValue: string, diastolicValue: string): VitalStatus | null {
  if (systolicValue.trim() === '' || diastolicValue.trim() === '') return null;

  const systolic = Number(systolicValue);
  const diastolic = Number(diastolicValue);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;

  const systolicLevel = classifyBloodPressureValue(systolic, 'systolic');
  const diastolicLevel = classifyBloodPressureValue(diastolic, 'diastolic');
  const level = severity[systolicLevel] >= severity[diastolicLevel] ? systolicLevel : diastolicLevel;

  if (level === 'critical') return status(level, 'Critical BP');
  if (level === 'warning') return status(level, 'High BP');
  if (level === 'low') return status(level, 'Low BP');
  return status(level, 'Normal');
}

export function getTemperatureStatus(value: string): VitalStatus | null {
  if (value.trim() === '') return null;

  const temperature = Number(value);
  if (!Number.isFinite(temperature)) return null;

  if (temperature < TEMPERATURE_THRESHOLDS.criticalLowBelow) {
    return status('critical', 'Critical Temperature');
  }
  if (temperature <= TEMPERATURE_THRESHOLDS.lowMax) {
    return status('low', 'Low Temperature');
  }
  if (temperature >= TEMPERATURE_THRESHOLDS.normalMin && temperature <= TEMPERATURE_THRESHOLDS.normalMax) {
    return status('normal', 'Normal');
  }
  if (temperature <= TEMPERATURE_THRESHOLDS.warningMax) {
    return status('warning', 'High Temperature');
  }
  return status('critical', 'Critical Temperature');
}
