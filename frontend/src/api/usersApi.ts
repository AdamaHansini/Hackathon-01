import { axiosClient } from './axiosClient';
import { ApiResponse, User, PaginatedData } from '../types';

export const usersApi = {
  getMe: async (): Promise<ApiResponse<{ user: User }>> => {
    return axiosClient.get('/users/me');
  },
  updateMe: async (data: any): Promise<ApiResponse<{ user: User }>> => {
    return axiosClient.patch('/users/me', data);
  },
  updateAvatar: async (formData: FormData): Promise<ApiResponse<{ user: User }>> => {
    return axiosClient.patch('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getDashboard: async (): Promise<ApiResponse<{ stats: any }>> => {
    return axiosClient.get('/users/me/dashboard');
  },
  getMyPosts: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/users/me/posts', { params });
  },
  getMyClaims: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/users/me/claims', { params });
  },
  getMyMatches: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/users/me/matches', { params });
  },
  getMyNotifications: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/users/me/notifications', { params });
  },
  updateNotificationPreferences: async (data: any): Promise<ApiResponse<{ user: User }>> => {
    return axiosClient.patch('/users/me/notification-preferences', data);
  },
  getPublicProfile: async (id: string): Promise<ApiResponse<{ user: Partial<User> }>> => {
    return axiosClient.get(`/users/${id}/public-profile`);
  },
  getTrustScore: async (id: string): Promise<ApiResponse<{ trustScore: number; details: any }>> => {
    return axiosClient.get(`/users/${id}/trust-score`);
  }
};
