/**
 * @file constants.js
 * @description Centralized configuration variables for the application.
 * Defines API endpoints, light/dark theme palettes, default unit listings,
 * charitable links, and notification configurations.
 */

import { EXPO_PUBLIC_API_URL } from '@env';

/**
 * Backend API URL target.
 * Resolves to the EXPO_PUBLIC_API_URL environment variable if set,
 * otherwise falls back to the default local development IP (http://192.168.0.101:8000).
 */
export const API_URL = EXPO_PUBLIC_API_URL || "http://192.168.0.101:8000";

/**
 * Color tokens defining the application's light theme.
 * Implements a nature-friendly green/brown palette aligned with freshness.
 */
export const lightColors = {
  primary: '#578E5B',               // Primary brand color (green)
  onPrimary: '#FFFFFF',             // Text/icons color on top of primary color
  primaryContainer: '#D9F8D6',      // Light background container for primary elements
  onPrimaryContainer: '#133918',    // Text/icons color on top of primaryContainer
  
  secondary: '#C96F43',             // Accent color (orange/brown)
  onSecondary: '#FFFFFF',           // Text/icons color on top of secondary color
  secondaryContainer: '#FFDBCB',    // Light background container for secondary elements
  onSecondaryContainer: '#351000',  // Text/icons color on top of secondaryContainer
  
  tertiary: '#755A41',              // Soft brown details
  onTertiary: '#FFFFFF',            // Text/icons color on top of tertiary color
  tertiaryContainer: '#FFDCBF',     // Background container for tertiary elements
  onTertiaryContainer: '#2B1706',   // Text/icons color on top of tertiaryContainer
  
  danger: '#A64242',                // Destructive actions or errors
  errorContainer: '#FFDAD6',        // Background container for error states
  onErrorContainer: '#410002',      // Text color on top of errorContainer
  
  warning: '#D69E2E',               // Warnings (e.g. expiring soon)
  success: '#417544',               // Success indicators
  
  background: '#F2EDE8',            // Global app background color
  surface: '#FAF8F5',               // Cards, headers, inputs background
  surfaceVariant: '#DFD8D0',        // Alternate background container
  onSurfaceVariant: '#4E463F',      // Text color on surfaceVariant
  
  text: '#1C2826',                  // Primary dark body text
  textLight: '#757D75',             // Secondary muted gray text
  
  border: '#DFD8D0',                // Dividers and border outlines
  outline: '#82786F',               // Focus borders or prominent outlines
  
  cardBg: '#FAF8F5',                // Card background color
  primaryDark: '#294D45',           // Darker green variant for special elements
};

/**
 * Color tokens defining the application's dark theme.
 * Optimized for readability in low-light environments while retaining brand consistency.
 */
export const darkColors = {
  primary: '#BDEDBC',               // Light green primary token for dark surfaces
  onPrimary: '#295D31',             // Contrast text on primary
  primaryContainer: '#407545',      // Accent container for dark mode
  onPrimaryContainer: '#D9F8D6',    // Contrast text on primary container
  
  secondary: '#FFB693',             // Muted orange accent
  onSecondary: '#5A2A04',           // Dark contrast text on secondary
  secondaryContainer: '#793D15',    // Darker container background for secondary
  onSecondaryContainer: '#FFDBCB',  // Muted contrast text on secondary container
  
  tertiary: '#E5C0A0',              // Muted brown details
  onTertiary: '#422C17',            // Text color on top of tertiary
  tertiaryContainer: '#5B422B',     // Container background for tertiary elements
  onTertiaryContainer: '#FFDCBF',   // Text color on top of tertiaryContainer
  
  danger: '#FFB4AB',                // Muted red for destructive actions
  errorContainer: '#93000A',        // Dark red container background
  onErrorContainer: '#FFDAD6',      // Text color on top of errorContainer
  
  warning: '#F3C059',               // Bright gold warning color
  success: '#75B074',               // Soft green success indicator
  
  background: '#191C1A',            // Global dark app background color
  surface: '#111412',               // Dark cards and header background
  surfaceVariant: '#434844',        // Secondary container background
  onSurfaceVariant: '#C3C8C2',      // Text color on surfaceVariant
  
  text: '#E1E3DF',                  // Primary light body text
  textLight: '#A3ADA5',             // Muted gray text for secondary details
  
  border: '#434844',                // Dark borders and dividers
  outline: '#8D928C',               // Dark outline border
  
  cardBg: '#191C1A',                // Dark card background
  primaryDark: '#75B074',           // Dynamic primary color replacement for dark mode
};

/**
 * Static COLORS reference.
 * Retained for backward compatibility with components that don't yet consume useThemeStore().
 * Defaults to the light color scheme.
 * 
 * @deprecated Use useThemeStore().colors inside components instead.
 */
export const COLORS = lightColors;

/**
 * Measurement units supported for cataloging products.
 */
export const UNITS = ['pcs', 'kg', 'g', 'l', 'ml'];

/**
 * Information details regarding the charity partner.
 * Used when prompting users to donate expired or surplus items.
 */
export const CHARITY = {
  name: 'Повернись живим',
  url: 'https://savelife.in.ua',
};

/**
 * Threshold limits utilized throughout the application.
 */
export const NOTIFICATION_THRESHOLDS = {
  expiringSoon: 3,  // Number of days left to trigger an "expiring soon" warning
  lowQuantity: 2,   // Quantity count left to trigger a "low stock" warning
};