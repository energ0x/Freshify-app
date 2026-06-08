import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitializing: true,
  isAuthenticated: false,
  needsOnboarding: false,
  
  finishOnboarding: () => set({ needsOnboarding: false }),

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        set({ token, isAuthenticated: true, needsOnboarding: false });
        const response = await authAPI.getMe();
        set({ user: response.data });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      set({ token: null, isAuthenticated: false, user: null }); 
    } finally {
      set({ isInitializing: false });
    }
  },

  refreshUser: async () => {
    try {
      if (get().isAuthenticated) {
        const response = await authAPI.getMe();
        set({ user: response.data });
      }
    } catch (error) {
      console.error("Failed to refresh user data", error);
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register({ email, password, name });
      const { access_token, user } = response.data;
      await SecureStore.setItemAsync('auth_token', access_token);
      
      set({ token: access_token, user, isAuthenticated: true, isLoading: false, needsOnboarding: true });
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
      
      set({ token: access_token, user, isAuthenticated: true, isLoading: false, needsOnboarding: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.response?.data?.detail || 'Невірний email або пароль' };
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null, isAuthenticated: false, needsOnboarding: false });
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
