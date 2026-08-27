import { axiosClient } from './axiosClient';
import { ApiResponse, ItemPost, PaginatedData } from '../types';

export const postsApi = {
  createPost: async (postData: any): Promise<ApiResponse<{ post: ItemPost }>> => {
    return axiosClient.post('/posts', postData);
  },
  getPost: async (id: string): Promise<ApiResponse<{ post: ItemPost }>> => {
    return axiosClient.get(`/posts/${id}`);
  },
  updatePost: async (id: string, updateData: any): Promise<ApiResponse<{ post: ItemPost }>> => {
    return axiosClient.patch(`/posts/${id}`, updateData);
  },
  deletePost: async (id: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/posts/${id}`);
  },
  uploadImages: async (id: string, formData: FormData): Promise<ApiResponse<{ images: any[] }>> => {
    return axiosClient.post(`/posts/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteImage: async (id: string, imageId: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/posts/${id}/images/${imageId}`);
  },
  renewPost: async (id: string): Promise<ApiResponse<{ post: ItemPost }>> => {
    return axiosClient.post(`/posts/${id}/renew`);
  },
  cancelPost: async (id: string): Promise<ApiResponse<{ post: ItemPost }>> => {
    return axiosClient.post(`/posts/${id}/cancel`);
  },
  markReturned: async (id: string): Promise<ApiResponse<{ post: ItemPost }>> => {
    return axiosClient.post(`/posts/${id}/mark-returned`);
  },
  getPostMatches: async (id: string): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get(`/posts/${id}/matches`);
  },
  getPostClaims: async (id: string): Promise<ApiResponse<PaginatedData<any>>> => {
    return axiosClient.get(`/posts/${id}/claims`);
  },
  getVerificationQuestions: async (id: string): Promise<ApiResponse<{ questions: any[] }>> => {
    return axiosClient.get(`/posts/${id}/verification-questions`);
  },
  addVerificationQuestion: async (id: string, questionData: any): Promise<ApiResponse<{ question: any }>> => {
    return axiosClient.post(`/posts/${id}/verification-questions`, questionData);
  },
  updateVerificationQuestion: async (id: string, questionId: string, questionData: any): Promise<ApiResponse<{ question: any }>> => {
    return axiosClient.patch(`/posts/${id}/verification-questions/${questionId}`, questionData);
  },
  deleteVerificationQuestion: async (id: string, questionId: string): Promise<ApiResponse<null>> => {
    return axiosClient.delete(`/posts/${id}/verification-questions/${questionId}`);
  }
};
