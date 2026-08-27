import { axiosClient } from './axiosClient';
import { ApiResponse, PaginatedData } from '../types';

export const moderatorApi = {
  getDashboard: async (): Promise<ApiResponse<{ stats: any }>> => {
    return axiosClient.get('/moderator/dashboard');
  },
  getReports: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/moderator/reports', { params });
  },
  getReport: async (id: string): Promise<ApiResponse<{ report: any }>> => {
    return axiosClient.get(`/moderator/reports/${id}`);
  },
  assignReport: async (id: string): Promise<ApiResponse<{ report: any }>> => {
    return axiosClient.patch(`/moderator/reports/${id}/assign`);
  },
  resolveReport: async (id: string, data: any): Promise<ApiResponse<{ report: any }>> => {
    return axiosClient.patch(`/moderator/reports/${id}/resolve`, data);
  },
  getPendingClaims: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/moderator/claims/pending', { params });
  },
  reviewClaim: async (id: string, data: any): Promise<ApiResponse<{ claim: any }>> => {
    return axiosClient.patch(`/moderator/claims/${id}/review`, data);
  },
  getSuspiciousActivity: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/moderator/suspicious-activity', { params });
  },
  reviewSuspiciousActivity: async (id: string, data: any): Promise<ApiResponse<{ activity: any }>> => {
    return axiosClient.patch(`/moderator/suspicious-activity/${id}/review`, data);
  },
  hidePost: async (id: string, data: any): Promise<ApiResponse<{ post: any }>> => {
    return axiosClient.patch(`/moderator/posts/${id}/hide`, data);
  },
  restorePost: async (id: string): Promise<ApiResponse<{ post: any }>> => {
    return axiosClient.patch(`/moderator/posts/${id}/restore`);
  },
  getAuditLogs: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/moderator/audit-logs', { params });
  }
};
