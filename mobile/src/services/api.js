/**
 * @file api.js
 * @description Centralized Axios API client configuration.
 * Configures request and response interceptors (JWT injection, token invalidation, premium limit tracking),
 * exposes custom event systems to communicate limit events to UI layers, and defines endpoints grouping
 * for authentication, categories, products, AI vision, grocery items, settings, achievements, and daily tasks.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../utils/constants';

// Create a configured Axios client instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds connection timeout
});

// Request interceptor: attaches the JWT token from SecureStore if it exists
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

// Listener sets utilized for publishing events to UI components
export const premiumLimitListeners = new Set();
export const dailyTasksListeners = new Set();

/**
 * Notifies all premium limit listeners that a usage ceiling has been met.
 * 
 * @param {string} message - Usage limitation notice message from backend.
 */
export const notifyPremiumLimitReached = (message) => {
  premiumLimitListeners.forEach(listener => listener(message));
};

/**
 * Publishes an event to listeners stating that daily tasks state has been altered.
 */
export const notifyDailyTasksUpdated = () => {
  dailyTasksListeners.forEach(listener => listener());
};

// Response interceptor: handles unauthorized requests and premium restriction errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If request fails due to invalid/expired token (401), drop token locally
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('auth_token').catch(() => {});
    } 
    // If request fails due to premium usage limits (403 Forbidden with specific message)
    else if (error.response?.status === 403 && error.response?.data?.detail?.includes('Limit reached')) {
      notifyPremiumLimitReached(error.response.data.detail);
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  activatePremium: () => api.post('/auth/me/activate-premium'),
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const categoriesAPI = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  restoreDefaults: () => api.post('/categories/restore-defaults'),
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  create: async (data) => {
    const res = await api.post('/products', data);
    try { notifyDailyTasksUpdated(); } catch (e) {}
    return res;
  },
  get: (id) => api.get(`/products/${id}`),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  consume: async (id, quantity) => {
    const res = await api.post(`/products/${id}/consume`, { quantity });
    try { notifyDailyTasksUpdated(); } catch (e) {}
    return res;
  },
  getConsumed: (limit = 100) => api.get('/products/history/consumed', { params: { limit } }),
  getExpiring: (days = 3) => api.get('/products/expiring', { params: { days } }),
  getExpired: () => api.get('/products/expired'),
  analyzeBarcode: (barcode, lang = 'uk') => api.get(`/products/barcode/${barcode}?lang=${lang}`),
  
  /**
   * Uploads raw photo for barcode or receipt processing.
   * Uses multipart form data.
   */
  uploadImage: async (imageUri) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'product.jpg',
    });
    const res = await api.post('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    try { notifyDailyTasksUpdated(); } catch (e) {}
    return res;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI / VISION API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const aiAPI = {
  /**
   * Dispatches captured photos to AI vision endpoint.
   * Mode dictates the type of analysis (e.g. 'product' info extraction or 'receipt' parsing).
   */
  analyzeImage: async (imageUri, lang = 'uk', mode = 'product') => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'product.jpg',
    });
    return api.post(`/ai/analyze-image?lang=${lang}&mode=${mode}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RECIPES WebSocket API
// ─────────────────────────────────────────────────────────────────────────────
// Note: Recipes streaming/generation uses WebSockets instead of HTTP request/response.
export const recipesAPI = {};

// ─────────────────────────────────────────────────────────────────────────────
// GROCERY / SHOPPING LIST API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const groceryAPI = {
  list: () => api.get('/grocery'),
  create: (data) => api.post('/grocery', data),
  update: (id, data) => api.put(`/grocery/${id}`, data),
  delete: (id) => api.delete(`/grocery/${id}`),
  addFromFridge: (productIds) => api.post('/grocery/from-fridge', { product_ids: productIds }),
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  get: (params) => api.get('/analytics', { params }),
};

// ─────────────────────────────────────────────────────────────────────────────
// USER SETTINGS API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const settingsAPI = {
  getDonation: () => api.get('/settings/donation'),
  updateDonation: (data) => api.put('/settings/donation', data),
};

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENTS API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const achievementsAPI = {
  get: () => api.get('/achievements'),
};

// ─────────────────────────────────────────────────────────────────────────────
// DAILY TASKS / LEAGUE STREAKS API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const dailyTasksAPI = {
  list: () => api.get('/api/v1/daily-tasks'),
  getStreaks: () => api.get('/api/v1/daily-tasks/streaks'),
  getSummary: () => api.get('/api/v1/daily-tasks/summary'),
};

export default api;