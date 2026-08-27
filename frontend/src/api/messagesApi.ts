import { axiosClient } from './axiosClient';
import { ApiResponse, PaginatedData } from '../types';

export const messagesApi = {
  createConversation: async (claimId: string): Promise<ApiResponse<{ conversation: any }>> => {
    return axiosClient.post(`/conversations/claim/${claimId}`);
  },
  getConversations: async (params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/conversations', { params });
  },
  getConversation: async (id: string): Promise<ApiResponse<{ conversation: any }>> => {
    return axiosClient.get(`/conversations/${id}`);
  },
  getMessages: async (id: string, params?: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get(`/conversations/${id}/messages`, { params });
  },
  sendMessage: async (id: string, data: { content: string }): Promise<ApiResponse<{ message: any }>> => {
    return axiosClient.post(`/conversations/${id}/messages`, data);
  },
  markMessageRead: async (id: string): Promise<ApiResponse<{ message: any }>> => {
    return axiosClient.patch(`/messages/${id}/read`);
  },
  reportMessage: async (id: string, data: { reason: string }): Promise<ApiResponse<{ report: any }>> => {
    return axiosClient.post(`/messages/${id}/report`, data);
  }
};
