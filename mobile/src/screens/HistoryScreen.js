/**
 * @file HistoryScreen.js
 * @description Screen displaying the log history of consumed food products.
 * Includes search filtering, pull-to-refresh to fetch updated data from the store,
 * and detailed listings showing consumption quantity, units, category, and date.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TextInput, TouchableOpacity, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

/**
 * HistoryScreen Component.
 * Visualizes previously consumed items.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation router.
 */
export default function HistoryScreen({ navigation }) {
  const { t } = useTranslation();

  // Load consumed list and fetch actions from product inventory store
  const { consumedProducts, fetchConsumedProducts } = useProductStore();

  // Local state for search queries and loading flags
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Theme configuration details
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, insets, isDark);

  /**
   * Refreshes history entries list from backend database.
   */
  const loadData = useCallback(async () => {
    setRefreshing(true);
    if (fetchConsumedProducts) {
      await fetchConsumedProducts();
    }
    setRefreshing(false);
  }, [fetchConsumedProducts]);

  // Initial load on component focus
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter consumed history entries dynamically by name matching
  const filteredConsumed = (consumedProducts || []).filter(p => {
    const nameToSearch = p.product_name || p.name || '';
    return nameToSearch.toLowerCase().includes(search.toLowerCase());
  });

  /**
   * Custom list cell renderer for a consumed product item.
   * Format dates using local timezone/language parameters.
   */
  const renderConsumedItem = ({ item }) => (
    <View style={styles.consumedItemContainer}>
      {/* Visual left icon */}
      <View style={styles.consumedIconContainer}>
        <Ionicons name="restaurant" size={24} color={COLORS.primary} />
      </View>
      
      {/* Information details */}
      <View style={styles.consumedProductInfo}>
        <Text style={styles.consumedProductName}>{item.product_name || item.name}</Text>
        {item.category && (
          <Text style={styles.consumedProductCategory}>
            {getTranslatedCategoryName(item.category, t)}
          </Text>
        )}
        {item.consumed_at && (
          <Text style={styles.consumedProductDate}>
            {new Date(item.consumed_at).toLocaleDateString(t('common.locale', 'uk-UA'), {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        )}
      </View>
      
      {/* Quantity badge */}
      <View style={styles.consumedQuantityContainer}>
        <Text style={styles.quantityValue}>{item.quantity}</Text>
        <Text style={styles.quantityUnit}>{item.unit || ''}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.surface} />

      {/* Screen Title Header containing Search panel */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.history', 'Історія')}</Text>
        </View>

        {/* Input search box */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('history.searchPlaceholder', 'Пошук у історії...')}
            placeholderTextColor={COLORS.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Primary History FlatList */}
      <FlatList
        data={filteredConsumed}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderConsumedItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
               <Ionicons name="time-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('history.emptyTitle', 'Історія порожня')}</Text>
            <Text style={styles.emptyText}>{t('history.emptyText', "Тут з'являться продукти, які ви спожили")}</Text>
          </View>
        }
      />
    </View>
  );
}

/**
 * Creates dynamic styles using active theme tokens, notch inserts, and navigation heights.
 */
const getStyles = (COLORS, insets, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  backButton: {
    marginTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
  },

  // ─── List & Items Styling ──────────────────────────────────────────────────
  list: {
    padding: 20,
    paddingBottom: insets.bottom + 40,
  },
  consumedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
  },
  consumedIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 16,
  },
  consumedProductInfo: {
    flex: 1,
    gap: 2,
  },
  consumedProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  consumedProductCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  consumedProductDate: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  consumedQuantityContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  quantityUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },

  // ─── Empty State Styling ───────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '20%',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
});