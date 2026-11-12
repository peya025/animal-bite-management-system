import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { clinicConfigApi } from '../api/clinicConfigApi';
import { useAuth } from '../shared/contexts/AuthContext';
import type {
  ClinicModuleConfig,
  FieldRules,
  FieldRuleValue,
  ClinicModuleSections,
  ClinicStationModules,
} from '../types';
import {
  DEFAULT_CANONICAL_FIELD_RULES,
  DEFAULT_CANONICAL_SECTIONS,
  DEFAULT_CANONICAL_MODULES,
} from '../types';

export interface ClinicModuleConfigContextValue {
  config: ClinicModuleConfig | null;
  loading: boolean;
  error: string | null;
  revision: number | null;
  clinicId: number | null;
  canEdit: boolean;
  refreshConfig: () => Promise<ClinicModuleConfig | null>;
  invalidateConfig: () => void;
  // Field-level helpers
  isFieldVisible: (fieldName: keyof FieldRules) => boolean;
  isFieldRequired: (fieldName: keyof FieldRules) => boolean;
  getFieldRule: (fieldName: keyof FieldRules) => FieldRuleValue;
  // Section-level helpers
  isSectionEnabled: (sectionName: keyof ClinicModuleSections) => boolean;
  // Station/Module-level helpers
  isModuleEnabled: (moduleName: keyof ClinicStationModules) => boolean;
  isTriageModuleEnabled: () => boolean;
  isRegistrationModuleEnabled: () => boolean;
  isTreatmentModuleEnabled: () => boolean;
}

export const MOCK_CLINIC_MODULE_CONFIG: Readonly<ClinicModuleConfig> = Object.freeze({
  schema_version: 1,
  revision: 1,
  clinic_id: 1,
  can_edit: true,
  triage_module_enabled: true,
  registration_module_enabled: true,
  treatment_module_enabled: true,
  patient_registration_enabled: true,
  address_section_enabled: true,
  socioeconomic_section_enabled: true,
  gov_programs_section_enabled: true,
  bite_intake_section_enabled: true,
  triage_section_enabled: true,
  treatment_section_enabled: true,
  field_rules: { ...DEFAULT_CANONICAL_FIELD_RULES },
  created_at: '2026-11-11T12:00:00.000000Z',
  updated_at: '2026-11-11T12:00:00.000000Z',
});

// Cache store keyed by clinic ID
const clinicConfigMemoryCache = new Map<number, ClinicModuleConfig>();

export const clearClinicConfigCache = (clinicId?: number) => {
  if (clinicId !== undefined) {
    clinicConfigMemoryCache.delete(clinicId);
  } else {
    clinicConfigMemoryCache.clear();
  }
};

const ClinicModuleConfigContext = createContext<ClinicModuleConfigContextValue | null>(null);

export interface ClinicModuleConfigProviderProps {
  children: React.ReactNode;
  initialConfig?: ClinicModuleConfig;
}

export const ClinicModuleConfigProvider: React.FC<ClinicModuleConfigProviderProps> = ({
  children,
  initialConfig,
}) => {
  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    authContext = useAuth();
  } catch {
    // Graceful when rendered outside AuthProvider (e.g. tests)
  }

  const currentClinicId = authContext?.clinic?.id ?? authContext?.user?.clinic_id ?? initialConfig?.clinic_id ?? null;
  const isAuthenticated = authContext?.isAuthenticated ?? true;

  const [config, setConfig] = useState<ClinicModuleConfig | null>(() => {
    if (initialConfig) return initialConfig;
    if (currentClinicId && clinicConfigMemoryCache.has(currentClinicId)) {
      return clinicConfigMemoryCache.get(currentClinicId)!;
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!config);
  const [error, setError] = useState<string | null>(null);

  // Clear cache if user logs out or changes clinic
  useEffect(() => {
    if (!isAuthenticated) {
      clinicConfigMemoryCache.clear();
      setConfig(null);
      setError(null);
      return;
    }

    if (currentClinicId && clinicConfigMemoryCache.has(currentClinicId)) {
      setConfig(clinicConfigMemoryCache.get(currentClinicId)!);
      setLoading(false);
    }
  }, [isAuthenticated, currentClinicId]);

  const fetchConfig = useCallback(async (forcedClinicId?: number): Promise<ClinicModuleConfig | null> => {
    const targetClinicId = forcedClinicId ?? currentClinicId;
    setLoading(true);
    setError(null);

    try {
      const data = await clinicConfigApi.getModuleConfig();
      if (data.clinic_id) {
        clinicConfigMemoryCache.set(data.clinic_id, data);
      }
      setConfig(data);
      return data;
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to load clinic configuration';
      setError(errMsg);
      // Retain memory cache if available, otherwise preserve null
      if (targetClinicId && clinicConfigMemoryCache.has(targetClinicId)) {
        setConfig(clinicConfigMemoryCache.get(targetClinicId)!);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentClinicId]);

  useEffect(() => {
    if (isAuthenticated && !initialConfig) {
      fetchConfig();
    }
  }, [isAuthenticated, currentClinicId, fetchConfig, initialConfig]);

  const invalidateConfig = useCallback(() => {
    if (currentClinicId) {
      clinicConfigMemoryCache.delete(currentClinicId);
    } else {
      clinicConfigMemoryCache.clear();
    }
    fetchConfig();
  }, [currentClinicId, fetchConfig]);

  const refreshConfig = useCallback(async () => {
    return fetchConfig();
  }, [fetchConfig]);

  const isFieldVisible = useCallback(
    (fieldName: keyof FieldRules): boolean => {
      if (config?.field_rules) {
        return config.field_rules[fieldName] !== 'hidden';
      }
      // Fail-safe default: Visible unless default rule is hidden
      return DEFAULT_CANONICAL_FIELD_RULES[fieldName] !== 'hidden';
    },
    [config]
  );

  const isFieldRequired = useCallback(
    (fieldName: keyof FieldRules): boolean => {
      // Locked clinical safeguard LF1 invariant
      if (fieldName === 'exposure_category') return true;

      if (config?.field_rules) {
        return config.field_rules[fieldName] === 'required';
      }
      // Baseline preservation: if config cannot load, DO NOT make all fields optional
      return DEFAULT_CANONICAL_FIELD_RULES[fieldName] === 'required';
    },
    [config]
  );

  const getFieldRule = useCallback(
    (fieldName: keyof FieldRules): FieldRuleValue => {
      if (fieldName === 'exposure_category') return 'required';
      if (config?.field_rules) {
        return config.field_rules[fieldName] ?? 'optional';
      }
      return DEFAULT_CANONICAL_FIELD_RULES[fieldName] ?? 'optional';
    },
    [config]
  );

  const isSectionEnabled = useCallback(
    (sectionName: keyof ClinicModuleSections): boolean => {
      if (config) {
        return config[sectionName] ?? true;
      }
      return DEFAULT_CANONICAL_SECTIONS[sectionName] ?? true;
    },
    [config]
  );

  const isModuleEnabled = useCallback(
    (moduleName: keyof ClinicStationModules): boolean => {
      if (config) {
        return config[moduleName] ?? true;
      }
      return DEFAULT_CANONICAL_MODULES[moduleName] ?? true;
    },
    [config]
  );

  const isTriageModuleEnabled = useCallback((): boolean => {
    return isModuleEnabled('triage_module_enabled');
  }, [isModuleEnabled]);

  const isRegistrationModuleEnabled = useCallback((): boolean => {
    return isModuleEnabled('registration_module_enabled');
  }, [isModuleEnabled]);

  const isTreatmentModuleEnabled = useCallback((): boolean => {
    return isModuleEnabled('treatment_module_enabled');
  }, [isModuleEnabled]);

  const value = useMemo<ClinicModuleConfigContextValue>(() => ({
    config,
    loading,
    error,
    revision: config?.revision ?? null,
    clinicId: config?.clinic_id ?? currentClinicId,
    canEdit: config?.can_edit ?? (authContext?.user?.role === 'admin'),
    refreshConfig,
    invalidateConfig,
    isFieldVisible,
    isFieldRequired,
    getFieldRule,
    isSectionEnabled,
    isModuleEnabled,
    isTriageModuleEnabled,
    isRegistrationModuleEnabled,
    isTreatmentModuleEnabled,
  }), [
    config,
    loading,
    error,
    currentClinicId,
    authContext?.user?.role,
    refreshConfig,
    invalidateConfig,
    isFieldVisible,
    isFieldRequired,
    getFieldRule,
    isSectionEnabled,
    isModuleEnabled,
    isTriageModuleEnabled,
    isRegistrationModuleEnabled,
    isTreatmentModuleEnabled,
  ]);

  return (
    <ClinicModuleConfigContext.Provider value={value}>
      {children}
    </ClinicModuleConfigContext.Provider>
  );
};

/**
 * Hook to consume clinic module configuration.
 * Can be used within ClinicModuleConfigProvider or standalone.
 */
export function useClinicModuleConfig(): ClinicModuleConfigContextValue {
  const context = useContext(ClinicModuleConfigContext);
  if (context) {
    return context;
  }

  // Standalone fallback (e.g. if rendered in isolated component without provider)
  return {
    config: null,
    loading: false,
    error: null,
    revision: null,
    clinicId: null,
    canEdit: false,
    refreshConfig: async () => null,
    invalidateConfig: () => {},
    isFieldVisible: (f) => DEFAULT_CANONICAL_FIELD_RULES[f] !== 'hidden',
    isFieldRequired: (f) => DEFAULT_CANONICAL_FIELD_RULES[f] === 'required',
    getFieldRule: (f) => DEFAULT_CANONICAL_FIELD_RULES[f] ?? 'optional',
    isSectionEnabled: (s) => DEFAULT_CANONICAL_SECTIONS[s] ?? true,
    isModuleEnabled: (m) => DEFAULT_CANONICAL_MODULES[m] ?? true,
    isTriageModuleEnabled: () => true,
    isRegistrationModuleEnabled: () => true,
    isTreatmentModuleEnabled: () => true,
  };
}

export default useClinicModuleConfig;
