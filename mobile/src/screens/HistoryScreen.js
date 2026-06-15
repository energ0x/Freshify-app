import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const styles = getStyles(COLORS, insets);

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
        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.consumedProductInfo}>
        <Text style={styles.consumedProductName}>{item.product_name || item.name}</Text>
        {item.category && <Text style={styles.consumedProductCategory}>{item.category}</Text>}
        {item.consumed_at && (
          <Text style={styles.consumedProductDate}>
            {new Date(item.consumed_at).toLocaleDateString('uk-UA', {
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
      
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Пошук у історії..."
            placeholderTextColor={COLORS.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
               <Ionicons name="time-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Історія порожня</Text>
            <Text style={styles.emptyText}>Тут з'являться продукти, які ви спожили</Text>
          </View>
        }
      />
    </View>
  );
}

const getStyles = (COLORS, insets) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    paddingHorizontal: 20,
    paddingVertical: 16, 
    backgroundColor: COLORS.surface, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.surfaceVariant, 
    borderRadius: 100, 
    paddingHorizontal: 16, 
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16,
    color: COLORS.text,
  },
  list: { 
    padding: 16, 
    paddingBottom: insets.bottom + 40,
  },
  empty: { 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 16, 
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  consumedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  consumedIconContainer: {
    marginRight: 16,
    backgroundColor: COLORS.primaryContainer,
    padding: 8,
    borderRadius: 12,
  },
  consumedProductInfo: {
    flex: 1,
  },
  consumedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  consumedProductCategory: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
  },
  consumedProductDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  consumedQuantityContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  quantityUnit: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});