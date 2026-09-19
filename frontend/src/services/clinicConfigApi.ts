import api from './api';
import type { ClinicModuleConfig, FieldRules } from '../types';

export const clinicConfigApi = {
  /**
   * Get current clinic's module configuration
   */
  getModuleConfig: async (): Promise<ClinicModuleConfig> => {
    const response = await api.get('/setup/module-config');
    return response.data;
  },

  /**
   * Update module configuration (Admin only)
   */
  updateModuleConfig: async (data: {
    triage_module_enabled: boolean;
    field_rules: FieldRules;
  }): Promise<ClinicModuleConfig> => {
    const response = await api.put('/setup/module-config', data);
    return response.data.config;
  },
};
