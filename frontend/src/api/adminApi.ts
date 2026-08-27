import { axiosClient } from './axiosClient';
import { ApiResponse, PaginatedData } from '../types';

export const adminApi = {
  getDashboard: async (): Promise<ApiResponse<{ stats: any; recentUsers: any[] }>> => {
    return axiosClient.get('/admin/dashboard');
  },
  getUsers: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/admin/users', { params });
  },
  getUser: async (id: string): Promise<ApiResponse<{ user: any; stats: any }>> => {
    return axiosClient.get(`/admin/users/${id}`);
  },
  updateUserRole: async (id: string, data: any): Promise<ApiResponse<{ user: any }>> => {
    return axiosClient.patch(`/admin/users/${id}/role`, data);
  },
  suspendUser: async (id: string, data: any): Promise<ApiResponse<{ user: any }>> => {
    return axiosClient.patch(`/admin/users/${id}/suspend`, data);
  },
  unsuspendUser: async (id: string): Promise<ApiResponse<{ user: any }>> => {
    return axiosClient.patch(`/admin/users/${id}/unsuspend`);
  },
  deleteUser: async (id: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/admin/users/${id}`);
  },
  getPosts: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/admin/posts', { params });
  },
  deletePost: async (id: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/admin/posts/${id}`);
  },
  updatePostStatus: async (id: string, data: any): Promise<ApiResponse<{ post: any }>> => {
    return axiosClient.patch(`/admin/posts/${id}/status`, data);
  },
  getCategories: async (): Promise<ApiResponse<{ categories: any[] }>> => {
    return axiosClient.get('/admin/categories');
  },
  createCategory: async (data: any): Promise<ApiResponse<{ category: any }>> => {
    return axiosClient.post('/admin/categories', data);
  },
  updateCategory: async (id: string, data: any): Promise<ApiResponse<{ category: any }>> => {
    return axiosClient.patch(`/admin/categories/${id}`, data);
  },
  deleteCategory: async (id: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/admin/categories/${id}`);
  },
  getClaims: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/admin/claims', { params });
  },
  getMatches: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/admin/matches', { params });
  },
  getReports: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/admin/reports', { params });
  },
  getAnalytics: async (): Promise<ApiResponse<{ totals: any; recoveryRate: string; postsPerDay: any[] }>> => {
    return axiosClient.get('/admin/analytics');
  },
  getAuditLogs: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/admin/audit-logs', { params });
  },
  updatePostExpirySettings: async (data: any): Promise<ApiResponse<{ expiryDays: number; warnDays: number }>> => {
    return axiosClient.patch('/admin/settings/post-expiry', data);
  }
};
