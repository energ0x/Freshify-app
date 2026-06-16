/**
 * @file ProductCard.js
 * @description Card component that displays details for a specific product,
 * including its image/icon, name, category, quantity, and expiration status with dynamic coloring.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import { getExpiryLabel, getExpiryColor } from '../utils/dateHelpers';
import { API_URL } from '../utils/constants';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

/**
 * ProductCard component that represents a single item in the inventory list.
 * Clicking the card triggers the onPress callback.
 * 
 * @param {Object} props
 * @param {Object} props.item - The product data object.
 * @param {string} props.item.name - Name of the product.
 * @param {string} props.item.expiry_date - The expiration date of the product.
 * @param {string} [props.item.image_url] - The path or URL of the product's image.
 * @param {number} props.item.quantity - The quantity of the product.
 * @param {string} props.item.unit - The unit of measurement (e.g., kg, pcs).
 * @param {Object} [props.item.category_obj] - Object representing the category of the product.
 * @param {string} props.item.category_obj.name - Original name of the category.
 * @param {Function} props.onPress - Callback function executed when the card is pressed.
 * @param {Object} [props.style] - Additional style rules to apply to the main container.
 * @returns {React.ReactElement} The rendered ProductCard component.
 */
export default function ProductCard({ item, onPress, style }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();

  const isDark = theme === 'dark';
  // Retrieve the expiration color code based on the remaining days
  const expiryColor = getExpiryColor(item.expiry_date, COLORS);
  const styles = getStyles(COLORS, expiryColor, isDark);

  const originalCategoryName = item.category_obj?.name;
  // Get localized category name based on internationalization translation functions
  const displayCategoryName = getTranslatedCategoryName(originalCategoryName, t);

  /**
   * Helper function that maps Ukrainian/original category names to Ionicons icon names.
   * 
   * @param {string} categoryName - The original category name.
   * @returns {string} The Ionicons icon name.
   */
  const getCategoryIcon = (categoryName) => {
    switch (categoryName) {
      case 'Молочні продукти': return 'water';
      case "М'ясо та риба": return 'fish';
      case 'Овочі': return 'leaf';
      case 'Фрукти': return 'nutrition';
      case 'Напої': return 'cafe';
      case 'Хліб та випічка': return 'pizza';
      default: return 'fast-food';
    }
  };

  /**
   * Renders the product image if an image_url is provided. 
   * Otherwise, renders a placeholder icon based on the product's category.
   * 
   * @returns {React.ReactElement} The rendered image component or icon container.
   */
  const renderIconOrImage = () => {
    if (item.image_url) {
      // Determine if the URL is absolute or a relative path from the API server
      const imageUrl = item.image_url.startsWith('http')
        ? item.image_url
        : `${API_URL}${item.image_url}`;

      return (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      );
    }

    return (
      <View style={styles.iconContainer}>
         <Ionicons name={getCategoryIcon(originalCategoryName)} size={26} color={COLORS.primary} />
      </View>
    );
  };

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.8}>
      {/* Icon or image display section */}
      {renderIconOrImage()}

      {/* Main details containing product name and category */}
      <View style={styles.mainInfo}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.subtext} numberOfLines={1}>
          {displayCategoryName || t('productCard.other')}
        </Text>
      </View>

      {/* Right details section for quantity and expiration date badge */}
      <View style={styles.rightSection}>
        <View style={styles.quantityBadge}>
           <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
        </View>

        {/* Dynamic color representation based on product freshness */}
        <View style={styles.expiryBadge}>
          <Ionicons name="time" size={14} color={expiryColor} />
          <Text style={styles.expiryText} numberOfLines={1}>
            {getExpiryLabel(item.expiry_date) || t('productCard.notSpecified')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Helper to construct the dynamic StyleSheet.
 * 
 * @param {Object} COLORS - Colors object from the theme store.
 * @param {string} expiryColor - Color hash representing the expiration status.
 * @param {boolean} isDark - Flag representing if dark theme is active.
 * @returns {Object} React Native StyleSheet styles object.
 */
const getStyles = (COLORS, expiryColor, isDark) => StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 16,
    marginRight: 16,
  },
  mainInfo: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  quantityBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '800',
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
    fontWeight: '700',
    color: expiryColor,
    flexShrink: 1,
  },
});