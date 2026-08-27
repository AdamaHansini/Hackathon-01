import { axiosClient } from './axiosClient';
import { ApiResponse, PaginatedData } from '../types';

export const claimsApi = {
  createClaim: async (data: any): Promise<ApiResponse<{ claim: any }>> => {
    return axiosClient.post('/claims', data);
  },
  getClaims: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/claims', { params });
  },
  getClaim: async (id: string): Promise<ApiResponse<{ claim: any; messages?: any[] }>> => {
    return axiosClient.get(`/claims/${id}`);
  },
  verifyClaim: async (id: string, data: { answers: { questionId: string; answer: string }[] }): Promise<ApiResponse<{ claim: any }>> => {
    return axiosClient.post(`/claims/${id}/verify`, data);
  },
  cancelClaim: async (id: string): Promise<ApiResponse<{ claim: any }>> => {
    return axiosClient.post(`/claims/${id}/cancel`);
  },
  approveClaim: async (id: string, notes?: string): Promise<ApiResponse<{ claim: any }>> => {
    return axiosClient.post(`/claims/${id}/approve`, { notes });
  },
  rejectClaim: async (id: string, notes?: string): Promise<ApiResponse<{ claim: any }>> => {
    return axiosClient.post(`/claims/${id}/reject`, { notes });
  },
  requestMoreInfo: async (id: string, notes: string): Promise<ApiResponse<{ claim: any }>> => {
    return axiosClient.post(`/claims/${id}/request-more-info`, { notes });
  },
  completeHandover: async (id: string): Promise<ApiResponse<{ claim: any; post: any }>> => {
    return axiosClient.post(`/claims/${id}/complete-handover`);
  },
  updateHandoverDetails: async (id: string, details: any): Promise<ApiResponse<{ claim: any }>> => {
    return axiosClient.patch(`/claims/${id}/handover-details`, details);
  }
};
