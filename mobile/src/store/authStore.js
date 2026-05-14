import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        set({ token, isAuthenticated: true });
        const response = await authAPI.getMe();
        set({ user: response.data });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      set({ token: null, isAuthenticated: false, user: null });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register({ email, password, name });
      const { access_token, user } = response.data;
      await SecureStore.setItemAsync('auth_token', access_token);
      set({ token: access_token, user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.response?.data?.detail || 'Помилка реєстрації' };
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.login({ email, password });
      const { access_token, user } = response.data;
      await SecureStore.setItemAsync('auth_token', access_token);
      set({ token: access_token, user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.response?.data?.detail || 'Невірний email або пароль' };
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateProfile: async (data) => {
    try {
      const response = await authAPI.updateMe(data);
      set({ user: response.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Помилка оновлення' };
    }
  },
}));

export default useAuthStore;
