import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import uk from './uk.json';
import en from './en.json';

const RESOURCES = {
  uk: { translation: uk },
  en: { translation: en },
};

const LANGUAGE_KEY = 'app_language';

const initI18n = async () => {
  // Перевіряємо, чи користувач вже обирав мову вручну
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  // Якщо ні — беремо системну мову телефону (перші 2 літери, напр. 'uk' або 'en')
  if (!savedLanguage) {
    const systemLang = Localization.getLocales()[0].languageCode;
    savedLanguage = RESOURCES[systemLang] ? systemLang : 'en'; // Fallback на англійську, якщо мова не підтримується
  }

  i18n
    .use(initReactI18next)
    .init({
      resources: RESOURCES,
      lng: savedLanguage,
      fallbackLng: 'en',
      compatibilityJSON: 'v3', // Важливо для React Native
      interpolation: {
        escapeValue: false, // React вже захищає від XSS
      },
    });
};

initI18n();

export default i18n;