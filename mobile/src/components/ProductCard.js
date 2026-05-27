import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';
import { getExpiryLabel, getExpiryColor } from '../utils/dateHelpers';

export default function ProductCard({ item, onPress }) {
  const { colors: COLORS } = useThemeStore();
  const expiryColor = getExpiryColor(item.expiry_date, COLORS);
  const styles = getStyles(COLORS, expiryColor);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Молочні продукти': return 'water-outline';
      case "М'ясо та риба": return 'fish-outline';
      case 'Овочі': return 'leaf-outline';
      case 'Фрукти': return 'nutrition-outline';
      case 'Напої': return 'cafe-outline';
      case 'Хліб та випічка': return 'pizza-outline';
      default: return 'fast-food-outline';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconContainer}>
         <Ionicons name={getCategoryIcon(item.category)} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.mainInfo}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.subtext}>
          {item.category || 'Інше'}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <View style={styles.quantityBadge}>
           <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
        </View>
        <View style={styles.expiryBadge}>
          <Ionicons name="time" size={14} color={expiryColor} />
          <Text style={styles.expiryText}>
            {getExpiryLabel(item.expiry_date) || 'Не вказано'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (COLORS, expiryColor) => StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainInfo: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  quantityBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${expiryColor}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 4,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '600',
    color: expiryColor,
  },
});