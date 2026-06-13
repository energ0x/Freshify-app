import { EXPO_PUBLIC_API_URL } from '@env';

export const API_URL = EXPO_PUBLIC_API_URL || "http://192.168.0.101:8000";

export const lightColors = {
  primary: '#578E5B', 
  onPrimary: '#FFFFFF',
  primaryContainer: '#D9F8D6',
  onPrimaryContainer: '#133918',
  
  secondary: '#C96F43', 
  onSecondary: '#FFFFFF',
  secondaryContainer: '#FFDBCB',
  onSecondaryContainer: '#351000',
  
  tertiary: '#755A41',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFDCBF',
  onTertiaryContainer: '#2B1706',
  
  danger: '#A64242', 
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  
  warning: '#D69E2E', 
  success: '#417544', 
  
  background: '#F2EDE8', 
  surface: '#FAF8F5', 
  surfaceVariant: '#DFD8D0',
  onSurfaceVariant: '#4E463F',
  
  text: '#1C2826', 
  textLight: '#757D75', 
  
  border: '#DFD8D0', 
  outline: '#82786F',
  
  cardBg: '#FAF8F5',
  primaryDark: '#294D45',
};

export const darkColors = {
  primary: '#BDEDBC',
  onPrimary: '#295D31',
  primaryContainer: '#407545',
  onPrimaryContainer: '#D9F8D6',
  
  secondary: '#FFB693',
  onSecondary: '#5A2A04',
  secondaryContainer: '#793D15',
  onSecondaryContainer: '#FFDBCB',
  
  tertiary: '#E5C0A0',
  onTertiary: '#422C17',
  tertiaryContainer: '#5B422B',
  onTertiaryContainer: '#FFDCBF',
  
  danger: '#FFB4AB',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  
  warning: '#F3C059',
  success: '#75B074',
  
  background: '#191C1A',
  surface: '#111412',
  surfaceVariant: '#434844',
  onSurfaceVariant: '#C3C8C2',
  
  text: '#E1E3DF',
  textLight: '#A3ADA5',
  
  border: '#434844',
  outline: '#8D928C',
  
  cardBg: '#191C1A',
  primaryDark: '#75B074',
};

// Для зворотної сумісності зі старими екранами залишаємо COLORS (який буде світлим за замовчуванням),
// але краще використовувати useThemeStore() у компонентах.
export const COLORS = lightColors;

export const UNITS = ['шт', 'кг', 'г', 'л', 'мл', 'упаковка', 'пачка', 'банка', 'пляшка'];

export const CHARITY = {
  name: 'Повернись живим',
  url: 'https://savelife.in.ua',
};

export const NOTIFICATION_THRESHOLDS = {
  expiringSoon: 3,
  lowQuantity: 2,
};