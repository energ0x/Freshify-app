import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../utils/constants';

const THEME_KEY = 'app_theme';

const useThemeStore = create((set) => ({
  theme: 'light', // 'light' or 'dark'
  colors: lightColors,
  isSystemTheme: true, // Чи використовується системна тема

  // Ініціалізація теми
  initializeTheme: async () => {
    const storedTheme = await AsyncStorage.getItem(THEME_KEY);
    const systemTheme = Appearance.getColorScheme() || 'light';

    if (storedTheme) {
      set({ 
        theme: storedTheme, 
        colors: storedTheme === 'dark' ? darkColors : lightColors,
        isSystemTheme: false,
      });
    } else {
      // Якщо в сховищі нічого немає, використовуємо системну
      set({ 
        theme: systemTheme, 
        colors: systemTheme === 'dark' ? darkColors : lightColors,
        isSystemTheme: true,
      });
    }
  },

  // Переключення теми вручну
  toggleTheme: async (newTheme) => {
    await AsyncStorage.setItem(THEME_KEY, newTheme);
    set({ 
      theme: newTheme, 
      colors: newTheme === 'dark' ? darkColors : lightColors,
      isSystemTheme: false,
    });
  },

  // Увімкнути/вимкнути системну тему
  setSystemTheme: async (useSystem) => {
    if (useSystem) {
      await AsyncStorage.removeItem(THEME_KEY);
      const systemTheme = Appearance.getColorScheme() || 'light';
      set({
        theme: systemTheme,
        colors: systemTheme === 'dark' ? darkColors : lightColors,
        isSystemTheme: true,
      });
    } else {
      // Якщо вимикаємо системну, залишаємо поточну як фіксовану
      const currentTheme = useThemeStore.getState().theme;
      await AsyncStorage.setItem(THEME_KEY, currentTheme);
      set({ isSystemTheme: false });
    }
  },
}));

// Підписка на зміни системної теми
Appearance.addChangeListener(({ colorScheme }) => {
  const { isSystemTheme, setSystemTheme } = useThemeStore.getState();
  if (isSystemTheme) {
    setSystemTheme(true); // Це оновить тему до нового системного значення
  }
});

export default useThemeStore;
