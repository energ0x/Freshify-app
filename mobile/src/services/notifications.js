import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import i18next from 'i18next'; // Звертаємось напряму до i18next поза React-компонентами
import { getDaysUntilExpiry } from '../utils/dateHelpers';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

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

export async function scheduleExpiryNotifications(products) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const product of products) {
    if (!product.expiry_date) continue;
    const days = getDaysUntilExpiry(product.expiry_date);

    if (days === 3) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18next.t('notifications.expiringSoonTitle'),
          body: i18next.t('notifications.expiringSoonBody', { name: product.name }),
          data: { productId: product.id, type: 'expiring_soon' },
        },
        trigger: { seconds: 5 },
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

export async function scheduleLowQuantityNotification(product) {
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