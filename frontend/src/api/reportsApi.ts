import { axiosClient } from './axiosClient';
import { ApiResponse, PaginatedData } from '../types';

export const reportsApi = {
  createReport: async (data: any): Promise<ApiResponse<{ report: any }>> => {
    return axiosClient.post('/reports', data);
  },
  getMyReports: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/reports/my-reports', { params });
  },
  getReport: async (id: string): Promise<ApiResponse<{ report: any }>> => {
    return axiosClient.get(`/reports/${id}`);
  },
  cancelReport: async (id: string): Promise<ApiResponse<{ report: any }>> => {
    return axiosClient.patch(`/reports/${id}/cancel`);
  }
};
