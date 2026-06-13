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

i18n
  .use(initReactI18next)
  .init({
    resources: RESOURCES,
    lng: 'en',
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
  });

AsyncStorage.getItem(LANGUAGE_KEY).then(savedLanguage => {
  if (!savedLanguage) {
    const systemLang = Localization.getLocales()[0].languageCode;
    savedLanguage = RESOURCES[systemLang] ? systemLang : 'en';
  }
  i18n.changeLanguage(savedLanguage);
});

export default i18n;