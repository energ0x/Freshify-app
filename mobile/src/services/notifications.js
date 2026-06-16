/**
 * @file notifications.js
 * @description Notification service manager for the Freshify application.
 * Configures Expo Notifications handlers, manages OS permissions, sets up Android notification channels,
 * and schedules alerts for products nearing expiration or running low in stock.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import i18next from 'i18next'; // Direct reference to translation dictionary outside of React components context
import { getDaysUntilExpiry } from '../utils/dateHelpers';

// Establish how incoming notifications should behave if the application is currently in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests notification permissions from the OS and configures channels on Android.
 * 
 * @returns {Promise<string|null>} Granted permission status, or null if denied or running on a simulator.
 */
export async function registerForPushNotifications() {
  // Notifications require physical device capabilities; skip on simulators.
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Prompt the user if permission hasn't been requested or granted yet.
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Setup notification channel configuration on Android devices.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('freshify', {
      name: 'Freshify',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2ECC71',
    });
  }

  return finalStatus;
}

/**
 * Calculates remaining life for all products and schedules corresponding notifications.
 * Wipes out previously scheduled notification tasks before building the new list.
 * 
 * @param {Array<object>} products - Array of product objects.
 */
export async function scheduleExpiryNotifications(products) {
  // Clear any existing registered notifications to prevent duplicate alerts.
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const product of products) {
    if (!product.expiry_date) continue;
    const days = getDaysUntilExpiry(product.expiry_date);

    // Schedule notification based on days remaining until expiry.
    if (days === 3) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18next.t('notifications.expiringSoonTitle'),
          body: i18next.t('notifications.expiringSoonBody', { name: product.name }),
          data: { productId: product.id, type: 'expiring_soon' },
        },
        trigger: { seconds: 5 }, // Fire in 5 seconds for simulation/testing
      });
    } else if (days === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18next.t('notifications.expiresTodayTitle'),
          body: i18next.t('notifications.expiresTodayBody', { name: product.name }),
          data: { productId: product.id, type: 'expires_today' },
        },
        trigger: { seconds: 5 },
      });
    } else if (days < 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18next.t('notifications.expiredTitle'),
          body: i18next.t('notifications.expiredBody', { name: product.name }),
          data: { productId: product.id, type: 'expired' },
        },
        trigger: { seconds: 5 },
      });
    }
  }
}

/**
 * Schedules a notification if the product's quantity falls below a critical threshold.
 * 
 * @param {object} product - Product details to inspect.
 */
export async function scheduleLowQuantityNotification(product) {
  // Trigger alert if the quantity drops below 2 units.
  if (product.quantity < 2) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18next.t('notifications.lowQuantityTitle'),
        body: i18next.t('notifications.lowQuantityBody', { 
          name: product.name, 
          quantity: product.quantity, 
          unit: product.unit 
        }),
        data: { productId: product.id, type: 'low_quantity' },
      },
      trigger: { seconds: 2 },
    });
  }
}