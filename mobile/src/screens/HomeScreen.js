import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useProductStore from '../store/productStore';
import ProductCard from '../components/ProductCard';
import { COLORS, CATEGORIES } from '../utils/constants';
import { getDaysUntilExpiry } from '../utils/dateHelpers';

export default function HomeScreen({ navigation }) {
  const { products, consumedProducts, fetchProducts, fetchConsumedProducts, isLoading } = useProductStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('Всі');
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    if (fetchConsumedProducts) {
      await fetchConsumedProducts();
    }
    setRefreshing(false);
  }, [fetchProducts, fetchConsumedProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSortPress = (type) => {
    if (sortBy === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setSelectedCategory('Всі');
    setSortBy(null);
    setSortDirection('asc');
    setSearch('');
  };

  const isFilterActive = selectedCategory !== 'Всі' || sortBy !== null || search !== '';

  const filteredAndSortedProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'Всі' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      let comparison = 0;

      if (sortBy === 'alphabet') {
        comparison = a.name.localeCompare(b.name, 'uk-UA');
      } else if (sortBy === 'expiry') {
        const daysA = getDaysUntilExpiry(a.expiry_date || a.expiry) ?? 9999;
        const daysB = getDaysUntilExpiry(b.expiry_date || b.expiry) ?? 9999;
        comparison = daysA - daysB;
      } else if (sortBy === 'quantity') {
        comparison = (a.quantity || 0) - (b.quantity || 0);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const filteredConsumed = (consumedProducts || []).filter(p => {
    const nameToSearch = p.product_name || p.name || '';
    return nameToSearch.toLowerCase().includes(search.toLowerCase());
  });

  const renderSortArrow = (type) => {
    if (sortBy !== type) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const renderProductItem = ({ item }) => (
    <ProductCard
      item={item}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    />
  );

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
        {/* Вкладки: Продукти / Історія */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'products' && styles.tabButtonActive]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons name="fast-food-outline" size={20} color={activeTab === 'products' ? COLORS.primary : COLORS.textLight} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Продукти</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons name="time" size={20} color={activeTab === 'history' ? COLORS.primary : COLORS.textLight} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Історія</Text>
          </TouchableOpacity>
        </View>

        {/* Панель пошуку та кнопка модалки */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeTab === 'products' ? "Пошук продуктів..." : "Пошук у історії..."}
              value={search}
              onChangeText={setSearch}
            />
            {search !== '' && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ marginRight: 4 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
          
          {activeTab === 'products' && (
            <TouchableOpacity 
              style={[styles.filterButton, (selectedCategory !== 'Всі' || sortBy !== null) && styles.filterButtonActive]} 
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons 
                name={selectedCategory !== 'Всі' || sortBy !== null ? "options" : "options-outline"} 
                size={24} 
                color={selectedCategory !== 'Всі' || sortBy !== null ? '#fff' : COLORS.primary} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Швидке скасування фільтрів під пошуком */}
        {activeTab === 'products' && isFilterActive && (
          <View style={styles.activeFiltersRow}>
            <Text style={styles.activeFiltersText}>
              Застосовано фільтри {sortBy ? `(сортування${renderSortArrow(sortBy)})` : ''}
            </Text>
            <TouchableOpacity style={styles.resetLink} onPress={resetFilters}>
              <Ionicons name="refresh-outline" size={14} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={styles.resetLinkText}>Скинути все</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Кнопка "Ідеї для рецептів" */}
        {activeTab === 'products' && products.length > 0 && (
          <TouchableOpacity style={styles.recipesIdeaButton} onPress={() => navigation.navigate('Рецепти')}>
            <Ionicons name="restaurant-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.recipesIdeaText}>Що приготувати з цих продуктів?</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Список контенту */}
      <FlatList
        data={activeTab === 'products' ? filteredAndSortedProducts : filteredConsumed}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'products' ? renderProductItem : renderConsumedItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons 
              name={activeTab === 'products' ? "fast-food-outline" : "checkmark-circle-outline"} 
              size={64} 
              color={COLORS.border} 
            />
            <Text style={styles.emptyText}>Нічого не знайдено</Text>
            {isFilterActive && activeTab === 'products' && (
              <TouchableOpacity style={styles.emptyResetButton} onPress={resetFilters}>
                <Text style={styles.emptyResetButtonText}>Скасувати фільтри</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* FAB Кнопка створення */}
      {activeTab === 'products' && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddProduct')}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Нижня модалка конфігурації фільтрів */}
      <Modal animationType="slide" transparent={true} visible={showFilterModal} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Фільтри та сортування</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Блок зміни сортування */}
            <Text style={styles.sectionTitle}>Сортувати за</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity 
                style={[styles.optionChip, sortBy === 'expiry' && styles.optionChipActive]} 
                onPress={() => handleSortPress('expiry')}
              >
                <Text style={[styles.optionChipText, sortBy === 'expiry' && styles.optionChipTextActive]}>
                  Терміном придатності{renderSortArrow('expiry')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.optionChip, sortBy === 'alphabet' && styles.optionChipActive]} 
                onPress={() => handleSortPress('alphabet')}
              >
                <Text style={[styles.optionChipText, sortBy === 'alphabet' && styles.optionChipTextActive]}>
                  Алфавітом{renderSortArrow('alphabet')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.optionChip, sortBy === 'quantity' && styles.optionChipActive]} 
                onPress={() => handleSortPress('quantity')}
              >
                <Text style={[styles.optionChipText, sortBy === 'quantity' && styles.optionChipTextActive]}>
                  Кількістю{renderSortArrow('quantity')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Блок вибору категорій */}
            <Text style={styles.sectionTitle}>Категорія</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <TouchableOpacity 
                style={[styles.categoryChip, selectedCategory === 'Всі' && styles.categoryChipActive]} 
                onPress={() => setSelectedCategory('Всі')}
              >
                <Text style={[styles.categoryChipText, selectedCategory === 'Всі' && styles.categoryChipTextActive]}>Всі</Text>
              </TouchableOpacity>
              
              {CATEGORIES.map(category => (
                <TouchableOpacity 
                  key={category} 
                  style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} 
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Системні кнопки модалки */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalResetButton} onPress={resetFilters}>
                <Text style={styles.modalResetButtonText}>Скинути все</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyButtonText}>Застосувати</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabContainer: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, marginBottom: 12,
    borderBottomWidth: 2, borderBottomColor: COLORS.border,
  },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 12, marginHorizontal: 8 },
  tabButtonActive: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabIcon: { marginRight: 6 },
  tabText: { fontSize: 14, color: COLORS.textLight, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 10, paddingHorizontal: 12, marginLeft: 16, marginRight: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 16 },
  filterButton: {
    padding: 10, backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  
  activeFiltersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 10 },
  activeFiltersText: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic' },
  resetLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FCE8E6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  resetLinkText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },

  recipesIdeaButton: {
    flexDirection: 'row', backgroundColor: COLORS.primary, marginHorizontal: 16,
    marginTop: 12, paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41,
  },
  recipesIdeaText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textLight, textAlign: 'center' },
  emptyResetButton: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  emptyResetButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  
  fab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: COLORS.primary,
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3,
  },
  consumedItemContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  consumedProductInfo: { flex: 1 },
  consumedProductName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  consumedProductCategory: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  consumedProductDate: { fontSize: 11, color: COLORS.textLight },
  consumedQuantity: { alignItems: 'center', marginLeft: 12 },
  quantityValue: { fontSize: 18, fontWeight: '700', color: COLORS.success },
  quantityUnit: { fontSize: 12, color: COLORS.textLight },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 10 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  optionChip: { backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionChipText: { color: COLORS.text, fontSize: 13 },
  optionChipTextActive: { color: '#fff', fontWeight: '600' },
  categoriesScroll: { flexDirection: 'row', marginBottom: 24 },
  categoryChip: { backgroundColor: COLORS.background, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, height: 36, borderWidth: 1, borderColor: COLORS.border },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { color: COLORS.text, fontSize: 13 },
  categoryChipTextActive: { color: '#fff', fontWeight: '600' },
  
  modalActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalResetButton: { flex: 1, paddingVertical: 14, marginRight: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  modalResetButtonText: { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
  applyButton: { flex: 2, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});