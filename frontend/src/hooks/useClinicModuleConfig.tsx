import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clinicConfigApi } from '../api/clinicConfigApi';
import { useAuth } from '../shared/contexts/AuthContext';
import type {
  ClinicModuleConfig,
  ClinicClinicalOptions,
  ClinicalOptionItem,
  FieldRules,
  FieldRuleValue,
  ClinicModuleSections,
  ClinicStationModules,
} from '../types';
import {
  DEFAULT_CANONICAL_FIELD_RULES,
  DEFAULT_CLINICAL_OPTIONS,
} from '../types';
import {
  type FieldPolicyContext,
  getRawFieldRule,
  isEffectiveFieldRequired,
  isEffectiveFieldVisible,
  isEffectiveSectionEnabled,
  isEffectiveStationEnabled,
} from '../shared/forms/configuredFieldPolicy';

export interface ClinicModuleConfigContextValue {
  config: ClinicModuleConfig | null;
  loading: boolean;
  error: string | null;
  revision: number | null;
  clinicId: number | null;
  canEdit: boolean;
  refreshConfig: () => Promise<ClinicModuleConfig | null>;
  invalidateConfig: () => void;
  // Field-level helpers (combine enclosing section + station module + conditional rules)
  isFieldVisible: (fieldName: keyof FieldRules, context?: FieldPolicyContext) => boolean;
  isFieldRequired: (fieldName: keyof FieldRules, context?: FieldPolicyContext) => boolean;
  getFieldRule: (fieldName: keyof FieldRules) => FieldRuleValue;
  // Section-level helpers
  isSectionEnabled: (sectionName: keyof ClinicModuleSections) => boolean;
  // Station/Module-level helpers
  isModuleEnabled: (moduleName: keyof ClinicStationModules) => boolean;
  isTriageModuleEnabled: () => boolean;
  isRegistrationModuleEnabled: () => boolean;
  isTreatmentModuleEnabled: () => boolean;
  // Clinical dropdown options (Mode of Exposure & Body Part)
  clinicalOptions: ClinicClinicalOptions;
  exposureModeOptions: ClinicalOptionItem[];
  bodyPartGroupOptions: ClinicalOptionItem[];
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
  const requestSeqRef = useRef<number>(0);
  const activeClinicIdRef = useRef<number | null>(currentClinicId);
  const isAuthenticatedRef = useRef<boolean>(isAuthenticated);

  activeClinicIdRef.current = currentClinicId;
  isAuthenticatedRef.current = isAuthenticated;

  // Clear cache and drop any in-flight responses if user logs out or changes clinic
  useEffect(() => {
    requestSeqRef.current += 1;

    if (!isAuthenticated) {
      clinicConfigMemoryCache.clear();
      setConfig(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (currentClinicId && clinicConfigMemoryCache.has(currentClinicId)) {
      setConfig(clinicConfigMemoryCache.get(currentClinicId)!);
      setLoading(false);
    } else if (!initialConfig) {
      setConfig(null);
    }
  }, [isAuthenticated, currentClinicId, initialConfig]);

  const fetchConfig = useCallback(async (forcedClinicId?: number): Promise<ClinicModuleConfig | null> => {
    const seq = ++requestSeqRef.current;
    const targetClinicId = forcedClinicId ?? activeClinicIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await clinicConfigApi.getModuleConfig();
      if (seq !== requestSeqRef.current || !isAuthenticatedRef.current) {
        return null;
      }
      if (data.clinic_id) {
        clinicConfigMemoryCache.set(data.clinic_id, data);
      }
      if (
        activeClinicIdRef.current != null &&
        data.clinic_id != null &&
        data.clinic_id !== activeClinicIdRef.current &&
        forcedClinicId == null
      ) {
        return null;
      }
      setConfig(data);
      return data;
    } catch (err: any) {
      if (seq !== requestSeqRef.current || !isAuthenticatedRef.current) {
        return null;
      }
      const errMsg = err.response?.data?.message || err.message || 'Failed to load clinic configuration';
      setError(errMsg);
      // Retain memory cache if available, otherwise preserve null
      if (targetClinicId && clinicConfigMemoryCache.has(targetClinicId)) {
        setConfig(clinicConfigMemoryCache.get(targetClinicId)!);
      }
      return null;
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
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
    (fieldName: keyof FieldRules, context?: FieldPolicyContext): boolean => {
      return isEffectiveFieldVisible(config, fieldName, context);
    },
    [config]
  );

  const isFieldRequired = useCallback(
    (fieldName: keyof FieldRules, context?: FieldPolicyContext): boolean => {
      return isEffectiveFieldRequired(config, fieldName, context);
    },
    [config]
  );

  const getFieldRule = useCallback(
    (fieldName: keyof FieldRules): FieldRuleValue => {
      return getRawFieldRule(config, fieldName);
    },
    [config]
  );

  const isSectionEnabled = useCallback(
    (sectionName: keyof ClinicModuleSections): boolean => {
      return isEffectiveSectionEnabled(config, sectionName);
    },
    [config]
  );

  const isModuleEnabled = useCallback(
    (moduleName: keyof ClinicStationModules): boolean => {
      return isEffectiveStationEnabled(config, moduleName);
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

  const clinicalOptions = useMemo<ClinicClinicalOptions>(() => {
    const raw = config?.clinical_options;
    return {
      exposure_modes:
        Array.isArray(raw?.exposure_modes) && raw.exposure_modes.length > 0
          ? raw.exposure_modes
          : DEFAULT_CLINICAL_OPTIONS.exposure_modes,
      body_part_groups:
        Array.isArray(raw?.body_part_groups) && raw.body_part_groups.length > 0
          ? raw.body_part_groups
          : DEFAULT_CLINICAL_OPTIONS.body_part_groups,
    };
  }, [config?.clinical_options]);

  const exposureModeOptions = useMemo<ClinicalOptionItem[]>(
    () => clinicalOptions.exposure_modes.filter((o) => o.enabled),
    [clinicalOptions.exposure_modes]
  );

  const bodyPartGroupOptions = useMemo<ClinicalOptionItem[]>(
    () => clinicalOptions.body_part_groups.filter((o) => o.enabled),
    [clinicalOptions.body_part_groups]
  );

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
    clinicalOptions,
    exposureModeOptions,
    bodyPartGroupOptions,
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
    clinicalOptions,
    exposureModeOptions,
    bodyPartGroupOptions,
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
    isFieldVisible: (f, ctx) => isEffectiveFieldVisible(null, f, ctx),
    isFieldRequired: (f, ctx) => isEffectiveFieldRequired(null, f, ctx),
    getFieldRule: (f) => getRawFieldRule(null, f),
    isSectionEnabled: (s) => isEffectiveSectionEnabled(null, s),
    isModuleEnabled: (m) => isEffectiveStationEnabled(null, m),
    isTriageModuleEnabled: () => true,
    isRegistrationModuleEnabled: () => true,
    isTreatmentModuleEnabled: () => true,
    clinicalOptions: DEFAULT_CLINICAL_OPTIONS,
    exposureModeOptions: DEFAULT_CLINICAL_OPTIONS.exposure_modes,
    bodyPartGroupOptions: DEFAULT_CLINICAL_OPTIONS.body_part_groups,
  };
}

export default useClinicModuleConfig;
