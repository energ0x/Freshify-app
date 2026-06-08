import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('auth_token').catch(() => {});
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

// Products
export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  create: (data) => api.post('/products', data),
  get: (id) => api.get(`/products/${id}`),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  consume: (id, quantity) => api.post(`/products/${id}/consume`, { quantity }),
  getConsumed: (limit = 100) => api.get('/products/history/consumed', { params: { limit } }),
  getExpiring: (days = 3) => api.get('/products/expiring', { params: { days } }),
  getExpired: () => api.get('/products/expired'),
};

// AI
export const aiAPI = {
  analyzeImage: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'product.jpg',
    });
    return api.post('/ai/analyze-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Recipes
export const recipesAPI = {
  get: (includeGrocery = false) => api.get('/recipes', { params: { include_grocery: includeGrocery } }),
};

// Grocery
export const groceryAPI = {
  list: () => api.get('/grocery'),
  create: (data) => api.post('/grocery', data),
  update: (id, data) => api.put(`/grocery/${id}`, data),
  delete: (id) => api.delete(`/grocery/${id}`),
  addFromFridge: (productIds) => api.post('/grocery/from-fridge', { product_ids: productIds }),
};

// Analytics
export const analyticsAPI = {
  get: (days = 30) => api.get('/analytics', { params: { days } }),
  getRecommendations: (days = 30) => api.get('/analytics/ai-recommendations', { params: { days } }),
};

// Settings
export const settingsAPI = {
  getDonation: () => api.get('/settings/donation'),
  updateDonation: (data) => api.put('/settings/donation', data),
};

// Achievements
export const achievementsAPI = {
  get: () => api.get('/achievements'),
};


export default api;
