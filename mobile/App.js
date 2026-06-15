import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert, View } from 'react-native';
import { useNavigationContainerRef } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import AppNavigator from './src/navigation/AppNavigator';
import useThemeStore from './src/store/themeStore';
import useProductStore from './src/store/productStore';
import useCategoryStore from './src/store/categoryStore';
import { premiumLimitListeners, notifyPremiumLimitReached } from './src/services/api';
import { drainQueue } from './src/services/syncService';
import * as syncQueue from './src/services/syncQueue';
import OfflineBanner from './src/components/OfflineBanner';
import './src/locales/i18n';

export default function App() {
  const { initializeTheme, theme } = useThemeStore();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

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

  useEffect(() => {
    const initializePendingCount = async () => {
      const ops = await syncQueue.getAll();
      useProductStore.setState({ pendingCount: ops.length });
    };
    initializePendingCount();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      useProductStore.setState({ isOnline: online });
      useCategoryStore.setState({ isOnline: online });

      if (online) {
        drainQueue({
          product: useProductStore,
          category: useCategoryStore,
        }).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <OfflineBanner />
        <AppNavigator ref={navigationRef} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}