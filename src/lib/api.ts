import axios from 'axios';
import { getApiBaseUrl } from '@/lib/productionBackend';

export const API_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || (error.message === 'Network Error' && !error.response)) {
      console.error('Network Error: Cannot reach API at:', API_URL);
    }

    const path = error.config?.url || '';
    if (error.response?.status === 401 && path.includes('/auth/me')) {
      localStorage.removeItem('token');
    }

    return Promise.reject(error);
  }
);

export default api;
