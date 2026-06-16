/**
 * @file themeStore.js
 * @description Zustand state store for theme management.
 * Handles switching between light and dark visual themes, persisting the preference in AsyncStorage,
 * and subscribing to OS system-level appearance modifications.
 */

import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../utils/constants';

// Key used to store manually configured theme strings in AsyncStorage.
const THEME_KEY = 'app_theme';

/**
 * Zustand theme store configuration.
 * Exposes variables for current theme, color tokens, and system mode flag.
 */
const useThemeStore = create((set) => ({
  // State variables
  theme: 'light',           // 'light' or 'dark'
  colors: lightColors,       // Holds the set of color codes corresponding to the active theme
  isSystemTheme: true,      // Flag representing whether the app configuration follows OS system settings

  /**
   * Initializes the application theme on startup.
   * Retrieves any saved user preference from AsyncStorage.
   * If none exists, falls back to the device's current system theme.
   */
  initializeTheme: async () => {
    const storedTheme = await AsyncStorage.getItem(THEME_KEY);
    const systemTheme = Appearance.getColorScheme() || 'light';

    if (storedTheme) {
      // User manual setting found
      set({ 
        theme: storedTheme, 
        colors: storedTheme === 'dark' ? darkColors : lightColors,
        isSystemTheme: false,
      });
    } else {
      // No setting found: align colors to system theme scheme
      set({ 
        theme: systemTheme, 
        colors: systemTheme === 'dark' ? darkColors : lightColors,
        isSystemTheme: true,
      });
    }
  },

  /**
   * Manually switches the application theme and saves the choice.
   * Disables system theme alignment tracking.
   * 
   * @param {'light'|'dark'} newTheme - Target theme key.
   */
  toggleTheme: async (newTheme) => {
    await AsyncStorage.setItem(THEME_KEY, newTheme);
    set({ 
      theme: newTheme, 
      colors: newTheme === 'dark' ? darkColors : lightColors,
      isSystemTheme: false,
    });
  },

  /**
   * Enables or disables system-wide theme alignment.
   * 
   * @param {boolean} useSystem - True to follow the OS theme, false to pin current setting.
   */
  setSystemTheme: async (useSystem) => {
    if (useSystem) {
      // Clear manual storage key and update colors to system values
      await AsyncStorage.removeItem(THEME_KEY);
      const systemTheme = Appearance.getColorScheme() || 'light';
      set({
        theme: systemTheme,
        colors: systemTheme === 'dark' ? darkColors : lightColors,
        isSystemTheme: true,
      });
    } else {
      // Pin current theme and write it to AsyncStorage
      const currentTheme = useThemeStore.getState().theme;
      await AsyncStorage.setItem(THEME_KEY, currentTheme);
      set({ isSystemTheme: false });
    }
  },
}));

// Subscribe to OS system theme changes.
Appearance.addChangeListener(({ colorScheme }) => {
  const { isSystemTheme, setSystemTheme } = useThemeStore.getState();
  // If the user hasn't set a manual override, react to system appearance updates
  if (isSystemTheme) {
    setSystemTheme(true); // Updates active theme dynamically to match new OS appearance
  }
});

export default useThemeStore;
