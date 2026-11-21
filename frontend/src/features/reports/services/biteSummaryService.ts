import api from '../../../shared/services/api';
import type {
  BiteSummaryCasesQueryParams,
  BiteSummaryCasesResponse,
  BiteSummaryQueryParams,
  BiteSummaryResponse,
} from '../types/biteSummary.types';

export const biteSummaryService = {
  async getBiteSummary(params: BiteSummaryQueryParams = {}): Promise<BiteSummaryResponse> {
    const response = await api.get<BiteSummaryResponse>('/reports/bite-summary', { params });
    return response.data;
  },

  async getBiteSummaryCases(params: BiteSummaryCasesQueryParams = {}): Promise<BiteSummaryCasesResponse> {
    const response = await api.get<BiteSummaryCasesResponse>('/reports/bite-summary/cases', { params });
    return response.data;
  },
};

export default biteSummaryService;
