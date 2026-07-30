import api from './api';
import type { StaffUser, AssignedModule } from '../types';

export const staffApi = {
  /**
   * Get all staff members with their assigned modules
   * Admin only
   */
  getAllStaff: async (): Promise<StaffUser[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  /**
   * Update staff member's assigned module
   * Admin only
   */
  updateAssignedModule: async (
    userId: number,
    assignedModule: AssignedModule
  ): Promise<StaffUser> => {
    const response = await api.put(`/users/${userId}/assigned-module`, {
      assigned_module: assignedModule,
    });
    return response.data.user;
  },
};
