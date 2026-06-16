/**
 * @file i18n.js
 * @description Internationalization (i18n) setup for the Freshify application.
 * Configures i18next with support for React Native, loading English and Ukrainian translation dictionaries,
 * and falls back to system locale or defaults to English.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import uk from './uk.json';
import en from './en.json';

// Mapping supported language codes to translation files.
const RESOURCES = {
  uk: { translation: uk },
  en: { translation: en },
};

// AsyncStorage key utilized for persisting the user's manual language selection.
const LANGUAGE_KEY = 'app_language';

/**
 * Initializes i18n configurations asynchronously.
 * It first attempts to retrieve the user's manually selected language.
 * If none is saved, it detects the device's system language.
 * Falls back to English if the system language is unsupported.
 */
const initI18n = async () => {
  // Check if the user previously selected a language manually.
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  // If no saved language is found, determine the system language.
  if (!savedLanguage) {
    const systemLang = Localization.getLocales()[0].languageCode;
    // Set system language if supported, otherwise fallback to English ('en').
    savedLanguage = RESOURCES[systemLang] ? systemLang : 'en';
  }

  // Initialize i18next instance.
  i18n
    .use(initReactI18next) // Integrates i18next with react-i18next
    .init({
      resources: RESOURCES,
      lng: savedLanguage,
      fallbackLng: 'en',
      compatibilityJSON: 'v3', // Required for compatibility with older JSON formats in React Native
      interpolation: {
        escapeValue: false, // React already escapes values to prevent XSS attacks
      },
    });
};

// Execute initialization immediately upon module import.
initI18n();

export default i18n;