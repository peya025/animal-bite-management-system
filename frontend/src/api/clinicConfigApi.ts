import api from '../shared/services/api';
import type {
  ClinicModuleConfig,
  ClinicModuleConfigUpdatePayload,
  ClinicModuleConfigUpdateResponse,
  ClinicModuleConfigConflictResponse,
  ClinicModuleConfigHistoryItem,
} from '../types';

export class ClinicConfigConflictError extends Error {
  public readonly currentRevision: number;
  public readonly suppliedRevision: number;
  public readonly serverConfig: ClinicModuleConfig;

  constructor(conflictData: ClinicModuleConfigConflictResponse) {
    super(conflictData.message || 'Configuration conflict detected. Stale revision.');
    this.name = 'ClinicConfigConflictError';
    this.currentRevision = conflictData.current_revision;
    this.suppliedRevision = conflictData.supplied_revision;
    this.serverConfig = conflictData.config;
  }
}

export class ClinicConfigValidationError extends Error {
  public readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]> = {}) {
    super(message || 'Validation error while saving configuration.');
    this.name = 'ClinicConfigValidationError';
    this.errors = errors;
  }
}

export const clinicConfigApi = {
  /**
   * Get current clinic's module configuration.
   * Primary route: /clinic-module-config
   * Compatibility fallback: /setup/module-config
   */
  getModuleConfig: async (signal?: AbortSignal): Promise<ClinicModuleConfig> => {
    try {
      const response = await api.get<ClinicModuleConfig>('/clinic-module-config', { signal });
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Fallback for rollout compatibility
        const fallback = await api.get<ClinicModuleConfig>('/setup/module-config', { signal });
        return fallback.data;
      }
      throw err;
    }
  },

  /**
   * Update module configuration (Admin only).
   * Atomically updates if revision counter matches.
   * Increments revision and logs audit log on backend.
   */
  updateModuleConfig: async (
    payload: ClinicModuleConfigUpdatePayload,
    signal?: AbortSignal
  ): Promise<ClinicModuleConfig> => {
    try {
      const response = await api.put<ClinicModuleConfigUpdateResponse>(
        '/clinic-module-config',
        payload,
        { signal }
      );
      return response.data.config;
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Stale revision conflict
        const conflictData = err.response.data as ClinicModuleConfigConflictResponse;
        throw new ClinicConfigConflictError(conflictData);
      }
      if (err.response?.status === 422) {
        // Validation error
        const message = err.response.data?.message || 'Validation failed';
        const errors = err.response.data?.errors || {};
        throw new ClinicConfigValidationError(message, errors);
      }
      if (err.response?.status === 404) {
        // Rollout compatibility fallback
        const fallback = await api.put<ClinicModuleConfigUpdateResponse>(
          '/setup/module-config',
          payload,
          { signal }
        );
        return fallback.data.config;
      }
      throw err;
    }
  },

  /**
   * Get audit log history of module configuration changes for the user's clinic.
   * Admin only.
   */
  getModuleConfigHistory: async (signal?: AbortSignal): Promise<ClinicModuleConfigHistoryItem[]> => {
    try {
      const response = await api.get<ClinicModuleConfigHistoryItem[]>(
        '/clinic-module-config/history',
        { signal }
      );
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await api.get<ClinicModuleConfigHistoryItem[]>(
          '/setup/module-config/history',
          { signal }
        );
        return fallback.data;
      }
      throw err;
    }
  },
};

export default clinicConfigApi;
