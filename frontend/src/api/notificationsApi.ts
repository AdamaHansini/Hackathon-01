import { axiosClient } from './axiosClient';
import { ApiResponse, PaginatedData } from '../types';

export const notificationsApi = {
  getNotifications: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/notifications', { params });
  },
  markRead: async (id: string): Promise<ApiResponse<{ notification: any }>> => {
    return axiosClient.patch(`/notifications/${id}/read`);
  },
  markAllRead: async (): Promise<ApiResponse<null>> => {
    return axiosClient.patch('/notifications/read-all');
  },
  deleteNotification: async (id: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/notifications/${id}`);
  }
};
