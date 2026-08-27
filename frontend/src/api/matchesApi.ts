import { axiosClient } from './axiosClient';
import { ApiResponse, PaginatedData } from '../types';

export const matchesApi = {
  getMatches: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/matches', { params });
  },
  getMatch: async (id: string): Promise<ApiResponse<{ match: any }>> => {
    return axiosClient.get(`/matches/${id}`);
  },
  markViewed: async (id: string): Promise<ApiResponse<null>> => {
    return axiosClient.post(`/matches/${id}/viewed`);
  },
  dismissMatch: async (id: string): Promise<ApiResponse<null>> => {
    return axiosClient.post(`/matches/${id}/dismiss`);
  },
  refreshMatch: async (id: string): Promise<ApiResponse<{ match: any }>> => {
    return axiosClient.post(`/matches/${id}/refresh`);
  }
};
