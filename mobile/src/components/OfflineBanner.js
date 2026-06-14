import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';

const OfflineBanner = () => {
  const isOnline = useProductStore((s) => s.isOnline);
  const pendingCount = useProductStore((s) => s.pendingCount);
  const { colors: COLORS } = useThemeStore();

  if (isOnline && pendingCount === 0) return null;

  const bgColor = isOnline ? COLORS.success : COLORS.warning;
  const text = isOnline
    ? `Синхронізація ${pendingCount} змін${pendingCount > 1 ? '' : ''}...`
    : `Без інтернету${pendingCount > 0 ? ` · ${pendingCount} очікує` : ''}`;
  const icon = isOnline ? 'sync-outline' : 'cloud-offline-outline';

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={14} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});

export default OfflineBanner;
