import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { getExpiryLabel, getExpiryColor } from '../utils/dateHelpers';

export default function ProductCard({ item, onPress }) {
  const expiryColor = getExpiryColor(item.expiry_date, COLORS);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.mainInfo}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.subtext}>
          {item.category || 'Інше'} • {item.quantity} {item.unit}
        </Text>
      </View>
      <View style={styles.expiryInfo}>
        <Ionicons name="time-outline" size={16} color={expiryColor} />
        <Text style={[styles.expiryText, { color: expiryColor }]}>
          {getExpiryLabel(item.expiry_date) || 'Не вказано'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mainInfo: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  expiryInfo: {
    alignItems: 'flex-end',
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});