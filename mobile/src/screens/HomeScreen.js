import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useProductStore from '../store/productStore';
import ProductCard from '../components/ProductCard';
import { COLORS } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const { products, consumedProducts, fetchProducts, fetchConsumedProducts, isLoading } = useProductStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'history'
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    await fetchConsumedProducts();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredConsumed = consumedProducts.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const renderProductItem = ({ item }) => (
    <ProductCard
      item={item}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    />
  );

  const renderConsumedItem = ({ item }) => (
    <View style={styles.consumedItemContainer}>
      <View style={styles.consumedProductInfo}>
        <Text style={styles.consumedProductName}>{item.product_name}</Text>
        <Text style={styles.consumedProductCategory}>
          {item.category && `Категорія: ${item.category}`}
        </Text>
        <Text style={styles.consumedProductDate}>
          {new Date(item.consumed_at).toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <View style={styles.consumedQuantity}>
        <Text style={styles.quantityValue}>{item.quantity}</Text>
        <Text style={styles.quantityUnit}>{item.unit}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'products' && styles.tabButtonActive]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons
              name="fast-food-outline"
              size={20}
              color={activeTab === 'products' ? COLORS.primary : COLORS.textLight}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
              Продукти
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons
              name="time"
              size={20}
              color={activeTab === 'history' ? COLORS.primary : COLORS.textLight}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Історія
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'products' && (
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Пошук продуктів..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
        )}
        {activeTab === 'history' && (
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Пошук у історії..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
        )}
      </View>

      {activeTab === 'products' ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="fast-food-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>У холодильнику порожньо</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredConsumed}
          keyExtractor={(item) => item.id}
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
      )}

      {activeTab === 'products' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    marginHorizontal: 8,
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
  },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 16 },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textLight },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  consumedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  consumedProductDate: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  consumedQuantity: {
    alignItems: 'center',
    marginLeft: 12,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  quantityUnit: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});