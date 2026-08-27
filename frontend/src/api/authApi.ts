import { axiosClient } from './axiosClient';
import { ApiResponse, User } from '../types';

export const authApi = {
  me: async (): Promise<ApiResponse<{ user: User }>> => {
    return axiosClient.get('/auth/me');
  },
  login: async (credentials: any): Promise<ApiResponse<{ user: User; accessToken: string }>> => {
    return axiosClient.post('/auth/login', credentials);
  },
  register: async (userData: any): Promise<ApiResponse<{ user: User; accessToken: string }>> => {
    return axiosClient.post('/auth/register', userData);
  },
  logout: async (): Promise<ApiResponse<null>> => {
    return axiosClient.post('/auth/logout');
  },
  forgotPassword: async (data: { email: string }): Promise<ApiResponse<null>> => {
    return axiosClient.post('/auth/forgot-password', data);
  },
  resetPassword: async (token: string, data: any): Promise<ApiResponse<null>> => {
    return axiosClient.post(`/auth/reset-password/${token}`, data);
  },
  changePassword: async (data: any): Promise<ApiResponse<null>> => {
    return axiosClient.patch('/auth/change-password', data);
  },
  refreshToken: async (): Promise<ApiResponse<{ accessToken: string }>> => {
    return axiosClient.post('/auth/refresh-token');
  },
};
