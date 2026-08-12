import api from '../../../shared/services/api';
import type { BiteMapData, MapFilters } from '../types/biteCase.types';

class BiteCaseService {
  /**
   * Get bite cases with location data for map visualization
   */
  async getMapData(filters?: MapFilters): Promise<BiteMapData> {
    const response = await api.get('/cases/map-data', {
      params: filters,
    });
    return response.data;
  }
}

export default new BiteCaseService();
