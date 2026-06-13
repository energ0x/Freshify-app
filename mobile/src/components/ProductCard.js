import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';
import { getExpiryLabel, getExpiryColor } from '../utils/dateHelpers';
import { API_URL } from '../utils/constants';

export default function ProductCard({ item, onPress, style }) {
  const { colors: COLORS } = useThemeStore();
  const expiryColor = getExpiryColor(item.expiry_date, COLORS);
  const styles = getStyles(COLORS, expiryColor);
  
  const categoryName = item.category_obj?.name;

  const getCategoryIcon = (categoryName) => {
    switch (categoryName) {
      case 'Молочні продукти': return 'water-outline';
      case "М'ясо та риба": return 'fish-outline';
      case 'Овочі': return 'leaf-outline';
      case 'Фрукти': return 'nutrition-outline';
      case 'Напої': return 'cafe-outline';
      case 'Хліб та випічка': return 'pizza-outline';
      default: return 'fast-food-outline';
    }
  };

  const renderIconOrImage = () => {
    if (item.image_url) {
      const imageUrl = item.image_url.startsWith('http') 
        ? item.image_url 
        : `${API_URL}${item.image_url}`;
        
      return (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      );
    }
    
    return (
      <View style={styles.iconContainer}>
         <Ionicons name={getCategoryIcon(categoryName)} size={24} color={COLORS.primary} />
      </View>
    );
  };

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.9}>
      {renderIconOrImage()}
      <View style={styles.mainInfo}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.subtext} numberOfLines={1}>
          {categoryName || 'Інше'}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <View style={styles.quantityBadge}>
           <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
        </View>
        <View style={styles.expiryBadge}>
          <Ionicons name="time" size={14} color={expiryColor} />
          <Text style={styles.expiryText} numberOfLines={1}>
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
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
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
  image: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  mainInfo: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  subtext: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
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
    maxWidth: 120,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '600',
    color: expiryColor,
    flexShrink: 1,
  },
});