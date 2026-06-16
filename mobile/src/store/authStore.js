/**
 * @file authStore.js
 * @description Zustand state store managing user authentication and profile status.
 * Leverages Expo SecureStore to persist JWT credentials securely on the device,
 * manages login/register API calls, and orchestrates onboarding flow states.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';
import * as syncQueue from '../services/syncQueue';

/**
 * Extracts and formats error messages returned by the FastAPI backend.
 * Handles both standard string error responses and structured Pydantic array validation messages.
 * 
 * @param {object} error - The caught Axios/Network error object.
 * @param {string} defaultMessage - Fallback text if message extraction fails.
 * @returns {string} Flattened string error message.
 */
const extractErrorMessage = (error, defaultMessage) => {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    // Join Pydantic validation error lists (e.g., "field: msg, field2: msg")
    return detail.map(err => err.msg).join(', ');
  } else if (typeof detail === 'string') {
    return detail;
  }
  return defaultMessage;
};

/**
 * Zustand authorization store configuration.
 */
const useAuthStore = create((set, get) => ({
  // State variables
  user: null,                // Decoded user data object (name, email, limits, etc.)
  token: null,               // Active JWT access token
  isLoading: false,          // Loader state flag during auth operations
  isInitializing: true,      // True while the application is parsing cached tokens on boot
  isAuthenticated: false,    // Authentication state flag
  needsOnboarding: false,    // Tracks if the onboarding checklist flow needs to be shown

  /**
   * Disables the onboarding redirect flag.
   */
  finishOnboarding: () => set({ needsOnboarding: false }),

  /**
   * Initializes the session on application startup.
   * Scans SecureStore for a saved JWT token, updates store state,
   * and attempts to fetch user details to verify the token.
   * Gracefully ignores network errors, only signing out on explicit 401 Unauthorized errors.
   */
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        set({ token, isAuthenticated: true, needsOnboarding: false });
        // Validate and load user profile data
        const response = await authAPI.getMe();
        set({ user: response.data });
      }
    } catch (error) {
      // Force user log out only if the session token is rejected by the server (401 Unauthorized)
      if (error.response?.status === 401) {
        await SecureStore.deleteItemAsync('auth_token');
        set({ token: null, isAuthenticated: false, user: null });
      }
    } finally {
      set({ isInitializing: false });
    }
  },

  /**
   * Refreshes active user profile details from the server.
   */
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

  /**
   * Creates a new user profile on the server.
   * Stores the returned access token securely and flags that the user needs onboarding.
   * 
   * @param {string} email - Registration email address.
   * @param {string} password - Registration password.
   * @param {string} name - User display name.
   * @returns {Promise<object>} Status indicating success/failure and error messages.
   */
  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register({ email, password, name });
      const { access_token, user } = response.data;
      // Persist access token in native keychain/keystore
      await SecureStore.setItemAsync('auth_token', access_token);
      
      set({ token: access_token, user, isAuthenticated: true, isLoading: false, needsOnboarding: true });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: extractErrorMessage(error, 'Помилка реєстрації') };
    }
  },

  /**
   * Authenticates user credentials.
   * Saves access tokens on success.
   * 
   * @param {string} email - Input email.
   * @param {string} password - Input password.
   * @returns {Promise<object>} Status object.
   */
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
      return { success: false, error: extractErrorMessage(error, 'Невірний email або пароль') };
    }
  },

  /**
   * Logs out the user.
   * Cleans SecureStore, flushes local offline sync queues, and resets active state parameters.
   */
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await syncQueue.clear(); // Empty the sync queue to prevent cross-account syncing leaks
    set({ token: null, user: null, isAuthenticated: false, needsOnboarding: false });
  },

  /**
   * Updates user profile parameters (e.g. name, dietary habits, allergens).
   * 
   * @param {object} data - Profile fields to modify.
   * @returns {Promise<object>} Status object.
   */
  updateProfile: async (data) => {
    try {
      const response = await authAPI.updateMe(data);
      set({ user: response.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: extractErrorMessage(error, 'Помилка оновлення') };
    }
  },
}));

export default useAuthStore;
