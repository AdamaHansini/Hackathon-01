import { axiosClient } from './axiosClient';
import { ApiResponse, PaginatedData } from '../types';

export const searchApi = {
  searchPosts: async (params: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/search/posts', { params });
  },
  searchNearby: async (params: any): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get('/search/nearby', { params });
  },
  getSearchSuggestions: async (q: string): Promise<ApiResponse<{ suggestions: string[] }>> => {
    return axiosClient.get('/search/suggestions', { params: { q } });
  }
};
