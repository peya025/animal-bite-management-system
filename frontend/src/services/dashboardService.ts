import api from './api';

export interface DashboardStats {
  total_patients: number;
  active_cases: number;
  pending_vaccinations: number;
  today_queue: number;
  recent_patients?: any[];
  upcoming_vaccinations?: any[];
}

class DashboardService {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    // Since there's no dedicated dashboard endpoint, we'll fetch data from multiple endpoints
    const [patients, biteCases, vaccinations, queue] = await Promise.all([
      api.get('/patients'),
      api.get('/bite-cases'),
      api.get('/vaccinations/today'),
      api.get('/queue'),
    ]);

    return {
      total_patients: patients.data.data?.length || patients.data.total || 0,
      active_cases: biteCases.data.data?.filter((c: any) => c.status === 'ongoing').length || 0,
      pending_vaccinations: vaccinations.data.data?.filter((v: any) => v.status === 'pending').length || 0,
      today_queue: queue.data.data?.filter((q: any) => q.status === 'waiting').length || 0,
      recent_patients: patients.data.data?.slice(0, 5) || [],
      upcoming_vaccinations: vaccinations.data.data?.slice(0, 5) || [],
    };
  }

  /**
   * Get bite case statistics
   */
  async getBiteCaseStats() {
    const response = await api.get('/bite-cases/stats');
    return response.data;
  }
}

export default new DashboardService();
