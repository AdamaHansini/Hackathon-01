import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to normalize errors and handle 401
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Clear local auth state if needed, but Zustand will handle this mostly via the API hook failing
      // Optional: trigger a custom event or redirect here if needed
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    const normalizedError = error.response?.data || {
      success: false,
      message: error.message || 'An unexpected error occurred',
    };
    
    return Promise.reject(normalizedError);
  }
);
