import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useProductStore from '../store/productStore';
import { COLORS } from '../utils/constants';

export default function HistoryScreen() {
  const { consumedProducts, fetchConsumedProducts } = useProductStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
      <View style={styles.consumedProductInfo}>
        <Text style={styles.consumedProductName}>{item.product_name || item.name}</Text>
        <Text style={styles.consumedProductCategory}>
          {item.category && `Категорія: ${item.category}`}
        </Text>
        {item.consumed_at && (
          <Text style={styles.consumedProductDate}>
            {new Date(item.consumed_at).toLocaleDateString('uk-UA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        )}
      </View>
      <View style={styles.consumedQuantity}>
        <Text style={styles.quantityValue}>{item.quantity}</Text>
        <Text style={styles.quantityUnit}>{item.unit || ''}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Пошук у історії..."
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ marginRight: 4 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
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
            <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Історія порожня</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 16 },
  list: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textLight },
  consumedItemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  consumedProductInfo: { flex: 1 },
  consumedProductName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  consumedProductCategory: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  consumedProductDate: { fontSize: 11, color: COLORS.textLight },
  consumedQuantity: { alignItems: 'center', marginLeft: 12 },
  quantityValue: { fontSize: 18, fontWeight: '700', color: COLORS.success },
  quantityUnit: { fontSize: 12, color: COLORS.textLight },
});