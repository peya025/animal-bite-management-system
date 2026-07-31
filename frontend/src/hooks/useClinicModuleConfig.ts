import { useState, useEffect } from 'react';
import { clinicConfigApi } from '../services/clinicConfigApi';
import type { ClinicModuleConfig, FieldRuleValue } from '../types';

/**
 * Hook to fetch and use clinic module configuration
 * Provides helper functions to check field visibility and requirements
 */
export function useClinicModuleConfig() {
  const [config, setConfig] = useState<ClinicModuleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await clinicConfigApi.getModuleConfig();
        if (mounted) {
          setConfig(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Failed to fetch clinic module config:', err);
          setError(err.message || 'Failed to load configuration');
          // Set default config on error
          setConfig(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchConfig();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Check if a field should be visible (not hidden)
   * @param fieldName - Name of the field to check
   * @returns true if field should be shown, false if hidden
   */
  const isFieldVisible = (fieldName: string): boolean => {
    if (!config || !config.field_rules) return true; // Default: show all fields
    const rule = (config.field_rules as any)[fieldName];
    return rule !== 'hidden';
  };

  /**
   * Check if a field is required
   * @param fieldName - Name of the field to check
   * @returns true if field is required, false otherwise
   */
  const isFieldRequired = (fieldName: string): boolean => {
    if (!config || !config.field_rules) return false; // Default: no fields required
    const rule = (config.field_rules as any)[fieldName];
    return rule === 'required';
  };

  /**
   * Get the rule for a specific field
   * @param fieldName - Name of the field
   * @returns The field rule (required, optional, hidden)
   */
  const getFieldRule = (fieldName: string): FieldRuleValue => {
    if (!config || !config.field_rules) return 'optional';
    return (config.field_rules as any)[fieldName] || 'optional';
  };

  /**
   * Check if triage module is enabled
   * @returns true if triage module is enabled
   */
  const isTriageModuleEnabled = (): boolean => {
    return config?.triage_module_enabled ?? true; // Default: enabled
  };

  return {
    config,
    loading,
    error,
    isFieldVisible,
    isFieldRequired,
    getFieldRule,
    isTriageModuleEnabled,
  };
}
