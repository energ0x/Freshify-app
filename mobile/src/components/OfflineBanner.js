/**
 * @file OfflineBanner.js
 * @description A top banner overlay component that dynamically informs the user
 * about internet connection state (offline mode) and pending changes waiting to be synced with the server.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';

/**
 * OfflineBanner functional component that overlays the screen at the top of the safe area.
 * Displays synchronization notifications or offline warnings depending on the connection state.
 *
 * @returns {React.ReactElement|null} The banner component, or null if the app is online with no pending queue items.
 */
const OfflineBanner = () => {
  const { t } = useTranslation();
  const isOnline = useProductStore((s) => s.isOnline);
  const pendingCount = useProductStore((s) => s.pendingCount);
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  // Show only if there is a connectivity issue (offline or pending unsynced local mutations)
  if (isOnline && pendingCount === 0) return null;

  const isDark = theme === 'dark';
  // Compute dynamic color values: green tint for sync, orange tint for offline warn
  const bgColor = isOnline ? (isDark ? '#1b5e20' : '#4CAF50') : (isDark ? '#bf360c' : '#FF9800');

  const icon = isOnline ? 'sync' : 'cloud-offline';

  let text;
  // Compute localized messaging depending on combination of online/offline status and pending items
  if (isOnline) {
    // This branch triggers if the user has a connection but local items are still processing (pendingCount > 0)
    text = t('common.syncing', { count: pendingCount });
  } else {
    text = pendingCount > 0
      ? t('common.offline_pending', { count: pendingCount })
      : t('common.offline');
  }

  return (
    <View style={[styles.banner, {
      backgroundColor: bgColor,
      top: insets.top, // Adapts layout offset dynamically below device status bar notch
    }]}>
      <Ionicons name={icon} size={16} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', // Absolute layering overlays content at the top of screen hierarchy
    left: 16,
    right: 16,
    zIndex: 9999, // Overrides all normal display elements
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16, // Pill rounded corners
    elevation: 4, // Shadow mapping on Android
    shadowColor: '#000', // Shadow mapping on iOS
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