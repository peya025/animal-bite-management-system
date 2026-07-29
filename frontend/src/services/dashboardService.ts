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
  async getStats(): Promise<DashboardStats> {
    // Fetch each endpoint independently — a failure on one won't crash the dashboard
    const safe = async (fn: () => Promise<any>) => {
      try { return await fn(); } catch { return null; }
    };

    const [patients, biteCases, vaccinations, queue] = await Promise.all([
      safe(() => api.get('/patients',     { params: { per_page: 100 } })),
      safe(() => api.get('/cases',        { params: { per_page: 100 } })),
      safe(() => api.get('/vaccinations', { params: { per_page: 100 } })),
      safe(() => api.get('/queue',        { params: { per_page: 100 } })),
    ]);

    const patientsData     = patients?.data?.data       ?? patients?.data       ?? [];
    const biteCasesData    = biteCases?.data?.data      ?? biteCases?.data      ?? [];
    const vaccinationsData = vaccinations?.data?.data   ?? vaccinations?.data   ?? [];
    // queue returns { queue: [...] } from the backend
    const queueData        = queue?.data?.queue ?? queue?.data?.data ?? queue?.data ?? [];

    return {
      total_patients:       patients?.data?.total       ?? (Array.isArray(patientsData)     ? patientsData.length     : 0),
      active_cases:         Array.isArray(biteCasesData)    ? biteCasesData.filter((c: any)    => c.status === 'ongoing' || c.status === 'active').length : 0,
      pending_vaccinations: Array.isArray(vaccinationsData) ? vaccinationsData.filter((v: any) => v.status === 'pending' || v.status === 'scheduled').length : 0,
      today_queue:          Array.isArray(queueData)        ? queueData.filter((q: any)        => q.status === 'waiting' || q.status === 'pending').length  : 0,
      recent_patients:      Array.isArray(patientsData)     ? patientsData.slice(0, 5)     : [],
      upcoming_vaccinations:Array.isArray(vaccinationsData) ? vaccinationsData.slice(0, 5) : [],
    };
  }
}

export default new DashboardService();
