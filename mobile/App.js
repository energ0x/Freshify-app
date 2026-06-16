/**
 * @file App.js
 * @description Root component of the Freshify mobile application.
 * Sets up basic global providers (gesture handlers, safe area context), monitors network connectivity
 * for offline database sync, manages global premium limit event listeners, and loads user preference configurations
 * (e.g. localization, theme).
 */

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

/**
 * App component.
 * Configures global lifecycle effects and encapsulates navigation and status UI.
 * 
 * @returns {React.JSX.Element} The rendered root component tree.
 */
export default function App() {
  const { initializeTheme, theme } = useThemeStore();
  // Reference to the main navigation container used to programmatically redirect users.
  const navigationRef = useNavigationContainerRef();

  // Initialize the application's appearance theme from stored local settings.
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Hook into premium usage limit notifications from the API layer.
  useEffect(() => {
    /**
     * Triggered when an API call indicates that the user's daily usage limit was reached.
     * Displays an alert prompting the user to upgrade to Premium.
     * 
     * @param {string} message - The limit warning message from the server/client.
     */
    const handleLimitReached = (message) => {
      Alert.alert(
        "Ліміт вичерпано",
        "Ви вичерпали денний ліміт на цю дію. Отримайте безлімітний доступ з Freshify Premium!",
        [
          { text: "Пізніше", style: "cancel" },
          {
            text: "Отримати Premium",
            onPress: () => {
              // Redirect the user to the Premium purchase screen if navigation is loaded.
              if (navigationRef.isReady()) {
                navigationRef.navigate('Premium');
              }
            },
          },
        ]
      );
    };

    // Add this handler to the global listener set.
    premiumLimitListeners.add(handleLimitReached);

    // Clean up listener when App unmounts.
    return () => {
      premiumLimitListeners.delete(handleLimitReached);
    };
  }, []);

  // Monitor network connectivity and manage local DB to remote server synchronization queue.
  useEffect(() => {
    /**
     * Count the number of offline transactions pending to be synced to the backend
     * and update the product store's counter for UI feedback.
     */
    const initializePendingCount = async () => {
      const ops = await syncQueue.getAll();
      useProductStore.setState({ pendingCount: ops.length });
    };
    initializePendingCount();

    // Subscribe to network connectivity changes using NetInfo.
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Determine if internet is currently active and reachable.
      const online = state.isConnected && state.isInternetReachable !== false;
      
      // Update online status in global state stores.
      useProductStore.setState({ isOnline: online });
      useCategoryStore.setState({ isOnline: online });

      // If network connection is restored, immediately attempt to drain the offline sync queue.
      if (online) {
        drainQueue({
          product: useProductStore,
          category: useCategoryStore,
        }).catch(() => {});
      }
    });

    // Unsubscribe from NetInfo events on cleanup.
    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Dynamic status bar style based on dark/light theme */}
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        
        {/* Banner notifying user when the device is running offline */}
        <OfflineBanner />
        
        {/* Top-level Navigation setup */}
        <AppNavigator ref={navigationRef} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}