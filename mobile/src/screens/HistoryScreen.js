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

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { consumedProducts, fetchConsumedProducts } = useProductStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, insets, isDark);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    if (fetchConsumedProducts) {
      await fetchConsumedProducts();
    }
    setRefreshing(false);
  }, [fetchConsumedProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredConsumed = (consumedProducts || []).filter(p => {
    const nameToSearch = p.product_name || p.name || '';
    return nameToSearch.toLowerCase().includes(search.toLowerCase());
  });

  const renderConsumedItem = ({ item }) => (
    <View style={styles.consumedItemContainer}>
      <View style={styles.consumedIconContainer}>
        <Ionicons name="restaurant" size={24} color={COLORS.primary} />
      </View>
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
      <View style={styles.consumedQuantityContainer}>
        <Text style={styles.quantityValue}>{item.quantity}</Text>
        <Text style={styles.quantityUnit}>{item.unit || ''}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.surface} />

      {/* ── Обгортка пошуку, що продовжує системний Header ── */}
      <View style={styles.header}>
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

const getStyles = (COLORS, insets, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },

  // ─── Header Extension ──────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
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

  // ─── List & Items ──────────────────────────────────────────────────────────
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

  // ─── Empty State ───────────────────────────────────────────────────────────
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