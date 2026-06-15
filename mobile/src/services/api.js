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

// Додамо подію, яку можна слухати з UI компонентів
export const premiumLimitListeners = new Set();

export const notifyPremiumLimitReached = (message) => {
  premiumLimitListeners.forEach(listener => listener(message));
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('auth_token').catch(() => {});
    } else if (error.response?.status === 403 && error.response?.data?.detail?.includes('Limit reached')) {
        notifyPremiumLimitReached(error.response.data.detail);
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
  activatePremium: () => api.post('/auth/me/activate-premium'),
};

// Categories
export const categoriesAPI = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  restoreDefaults: () => api.post('/categories/restore-defaults'),
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
  analyzeBarcode: (barcode, lang = 'uk') => api.get(`/products/barcode/${barcode}?lang=${lang}`),
  uploadImage: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'product.jpg',
    });
    return api.post('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// AI
export const aiAPI = {
  // ДОДАНО ПАРАМЕТР mode (за замовчуванням 'product')
  analyzeImage: async (imageUri, lang = 'uk', mode = 'product') => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'product.jpg',
    });
    // ДОДАНО mode У QUERY ПАРАМЕТРИ
    return api.post(`/ai/analyze-image?lang=${lang}&mode=${mode}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Recipes — streaming via WebSocket only; no REST equivalent on the backend
export const recipesAPI = {};

// Grocery
export const groceryAPI = {
  list: () => api.get('/grocery'),
  create: (data) => api.post('/grocery', data),
  update: (id, data) => api.put(`/grocery/${id}`, data),
  delete: (id) => api.delete(`/grocery/${id}`),
  addFromFridge: (productIds) => api.post('/grocery/from-fridge', { product_ids: productIds }),
};

// Analytics — AI recommendations stream via WebSocket only; REST endpoint returns raw data only
export const analyticsAPI = {
  get: (params) => api.get('/analytics', { params }),
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