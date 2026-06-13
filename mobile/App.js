import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';
import { useNavigationContainerRef } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import AppNavigator from './src/navigation/AppNavigator';
import useThemeStore from './src/store/themeStore';
import useProductStore from './src/store/productStore';
import { premiumLimitListeners, notifyPremiumLimitReached } from './src/services/api';
import './src/locales/i18n';

export default function App() {
  const { initializeTheme, theme } = useThemeStore();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Слухач зміни стану мережі для синхронізації офлайн-черги
  useEffect(() => {
    const syncIfOnline = (state) => {
      // isInternetReachable може бути null в деяких випадках на Android, тому перевіряємо isConnected
      if (state.isConnected && state.isInternetReachable !== false) {
        useProductStore.getState().syncOfflineQueue();
      }
    };

    // Перевірка при старті
    NetInfo.fetch().then(syncIfOnline);

    // Підписка на зміни
    const unsubscribeNetInfo = NetInfo.addEventListener(syncIfOnline);

    return () => {
      unsubscribeNetInfo();
    };
  }, []);

  useEffect(() => {
    const handleLimitReached = (message) => {
      Alert.alert(
        "Ліміт вичерпано",
        "Ви вичерпали денний ліміт на цю дію. Отримайте безлімітний доступ з Freshify Premium!",
        [
          { text: "Пізніше", style: "cancel" },
          {
            text: "Отримати Premium",
            onPress: () => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('Premium');
              }
            },
          },
        ]
      );
    };

    premiumLimitListeners.add(handleLimitReached);

    return () => {
      premiumLimitListeners.delete(handleLimitReached);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <AppNavigator ref={navigationRef} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}