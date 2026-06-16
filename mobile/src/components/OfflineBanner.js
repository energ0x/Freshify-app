import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';

const OfflineBanner = () => {
  const { t } = useTranslation();
  const isOnline = useProductStore((s) => s.isOnline);
  const pendingCount = useProductStore((s) => s.pendingCount);
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  // Показуємо лише якщо є проблема (оффлайн або щось чекає на синхронізацію)
  if (isOnline && pendingCount === 0) return null;

  const isDark = theme === 'dark';
  const bgColor = isOnline ? (isDark ? '#1b5e20' : '#4CAF50') : (isDark ? '#bf360c' : '#FF9800');

  const icon = isOnline ? 'sync' : 'cloud-offline';

  let text;
  if (isOnline) {
    // Ця гілка виконується, тільки якщо pendingCount > 0, через ранній вихід
    text = t('common.syncing', { count: pendingCount });
  } else {
    text = pendingCount > 0
      ? t('common.offline_pending', { count: pendingCount })
      : t('common.offline');
  }

  return (
    <View style={[styles.banner, {
      backgroundColor: bgColor,
      top: insets.top, // Адаптується під "чубчик" (notch)
    }]}>
      <Ionicons name={icon} size={16} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', // Це найважливіше: накладається поверх всього
    left: 16,
    right: 16,
    zIndex: 9999, // Завжди зверху
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16, // Округлені кути
    elevation: 4, // Тінь для Android
    shadowColor: '#000', // Тінь для iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default OfflineBanner;