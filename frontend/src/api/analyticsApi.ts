import { axiosClient } from './axiosClient';
import { ApiResponse } from '../types';

export const analyticsApi = {
  getPlatformAnalytics: async (): Promise<ApiResponse<{ totals: any; recoveryRate: string; postsPerDay: any[] }>> => {
    return axiosClient.get('/analytics/platform');
  },
  getUserAnalytics: async (): Promise<ApiResponse<{ posts: any; claims: any; matches: any; trust: any }>> => {
    return axiosClient.get('/analytics/user/me');
  },
  getRecoveryRate: async (params?: any): Promise<ApiResponse<{ stats: any }>> => {
    return axiosClient.get('/analytics/recovery-rate', { params });
  },
  getCategoryStats: async (params?: any): Promise<ApiResponse<{ categories: any[] }>> => {
    return axiosClient.get('/analytics/category-stats', { params });
  },
  getMatchPerformance: async (params?: any): Promise<ApiResponse<{ matchPerformance: any[]; totalMatches: number }>> => {
    return axiosClient.get('/analytics/match-performance', { params });
  }
};
