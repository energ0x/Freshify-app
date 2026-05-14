import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
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
          title: '⏰ Термін придатності скоро закінчується',
          body: `${product.name} — залишилось 3 дні`,
          data: { productId: product.id, type: 'expiring_soon' },
        },
        trigger: { seconds: 5 },
      });
    } else if (days === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Продукт закінчується сьогодні',
          body: `${product.name} — вживіть або викиньте`,
          data: { productId: product.id, type: 'expires_today' },
        },
        trigger: { seconds: 5 },
      });
    } else if (days < 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❌ Продукт прострочений',
          body: `${product.name} — термін придатності минув`,
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
        title: '📦 Продукт закінчується',
        body: `${product.name} — залишилось мало (${product.quantity} ${product.unit})`,
        data: { productId: product.id, type: 'low_quantity' },
      },
      trigger: { seconds: 2 },
    });
  }
}
