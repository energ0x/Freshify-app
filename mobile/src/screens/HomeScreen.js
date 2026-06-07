import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform, StatusBar, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore'; 
import ProductCard from '../components/ProductCard';
import CustomButton from '../components/CustomButton';
import { CATEGORIES } from '../utils/constants'; 
import { getDaysUntilExpiry } from '../utils/dateHelpers'; 

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen({ navigation }) {
  const { products, fetchProducts, deleteProduct, consumeProduct } = useProductStore(); 
  const { colors: COLORS, theme } = useThemeStore(); 
  const insets = useSafeAreaInsets(); 
  
  const styles = getStyles(COLORS, insets, theme); 
  
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('Всі');
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const deleteTimeoutRef = useRef(null);

  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [productToConsume, setProductToConsume] = useState(null);
  const [consumeAmount, setConsumeAmount] = useState('');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts(); 
    setRefreshing(false);
  }, [fetchProducts]);

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

  const animateList = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'scaleY' },
      create: { type: 'easeInEaseOut', property: 'scaleY' },
    });
  };

  const handleDeleteTrigger = (item) => {
    if (pendingDelete) {
      deleteProduct(pendingDelete.id); 
      clearTimeout(deleteTimeoutRef.current);
    }
    animateList(); 
    setPendingDelete(item);
    deleteTimeoutRef.current = setTimeout(() => {
      deleteProduct(item.id); 
      setPendingDelete(null);
    }, 4000);
  };

  const handleUndoDelete = () => {
    clearTimeout(deleteTimeoutRef.current);
    animateList(); 
    setPendingDelete(null);
  };

  const handleConsumeTrigger = async (item) => {
    const qty = Number(item.quantity);
    if (qty <= 1) {
      await consumeProduct(item.id, qty);
    } else {
      setProductToConsume(item);
      setConsumeAmount(qty.toString());
      setConsumeModalVisible(true);
    }
  };

  const submitConsume = async () => {
    const amount = Number(consumeAmount.replace(',', '.'));
    if (!amount || isNaN(amount) || amount <= 0) {
      return Alert.alert('Помилка', 'Введіть коректну кількість');
    }
    if (amount > productToConsume.quantity) {
      return Alert.alert('Увага', 'Ви не можете використати більше, ніж є в наявності');
    }

    await consumeProduct(productToConsume.id, amount); 
    setConsumeModalVisible(false);
    setProductToConsume(null);
    setConsumeAmount('');
  };

  const filteredAndSortedProducts = products
    .filter(p => p.id !== pendingDelete?.id) 
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

  const renderSortArrow = (type) => {
    if (sortBy !== type) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const SwipeableProductItem = ({ item }) => {
    const swipeableRef = useRef(null);

    const renderLeftActions = () => (
      <View style={[styles.swipeAction, styles.consumeAction]}>
        <Ionicons name="restaurant" size={24} color="#fff" />
        <Text style={styles.swipeText}>Використати</Text>
      </View>
    );

    const renderRightActions = () => (
      <View style={[styles.swipeAction, styles.deleteAction]}>
        <Ionicons name="trash" size={24} color="#fff" />
        <Text style={styles.swipeText}>Видалити</Text>
      </View>
    );

    return (
      <Swipeable
        ref={swipeableRef}
        containerStyle={{ marginBottom: 12 }}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableLeftOpen={() => {
          swipeableRef.current?.close();
          handleConsumeTrigger(item);
        }}
        onSwipeableRightOpen={() => {
          handleDeleteTrigger(item);
        }}
      >
        <ProductCard item={item} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} />
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мої продукти</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Пошук продуктів..." 
              placeholderTextColor={COLORS.textLight}
              value={search} 
              onChangeText={setSearch} 
            />
            {search !== '' && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ marginRight: 4 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={[styles.filterButton, (selectedCategory !== 'Всі' || sortBy !== null) && styles.filterButtonActive]} onPress={() => setShowFilterModal(true)}>
            <Ionicons name={selectedCategory !== 'Всі' || sortBy !== null ? "options" : "options-outline"} size={24} color={selectedCategory !== 'Всі' || sortBy !== null ? (COLORS.onPrimary || '#fff') : COLORS.primary} />
          </TouchableOpacity>
        </View>

        {isFilterActive && (
          <View style={styles.activeFiltersRow}>
            <Text style={styles.activeFiltersText}>Застосовано фільтри {sortBy ? `(сортування${renderSortArrow(sortBy)})` : ''}</Text>
            <TouchableOpacity style={styles.resetLink} onPress={resetFilters}>
              <Ionicons name="refresh-outline" size={14} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={styles.resetLinkText}>Скинути все</Text>
            </TouchableOpacity>
          </View>
        )}

        {products.length > 0 && (
          <TouchableOpacity style={styles.recipesIdeaButton} onPress={() => navigation.navigate('Рецепти')} activeOpacity={0.8}>
            <Ionicons name="restaurant-outline" size={18} color={COLORS.onPrimary || '#fff'} style={{ marginRight: 8 }} />
            <Text style={styles.recipesIdeaText}>Що приготувати з цих продуктів?</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredAndSortedProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <SwipeableProductItem item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="fast-food-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Нічого не знайдено</Text>
          </View>
        }
      />

      {pendingDelete && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>Продукт видалено</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={styles.snackbarAction}>СКАСУВАТИ</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={consumeModalVisible} animationType="fade" transparent={true} onRequestClose={() => setConsumeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.consumeModalContent}>
            <Text style={styles.modalTitle}>Скільки використати?</Text>
            <Text style={styles.consumeSubtitle}>{productToConsume?.name} (Доступно: {productToConsume?.quantity} {productToConsume?.unit})</Text>
            
            <TextInput
              style={styles.consumeInput}
              keyboardType="numeric"
              value={consumeAmount}
              onChangeText={setConsumeAmount}
              autoFocus
              placeholderTextColor={COLORS.textLight}
            />
            
            <View style={styles.modalActionsRow}>
              <CustomButton title="Скасувати" variant="outline" onPress={() => setConsumeModalVisible(false)} style={styles.modalButton} />
              <CustomButton title="Підтвердити" onPress={submitConsume} style={styles.modalButton} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={showFilterModal} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.bottomModalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Фільтри та сортування</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Сортувати за</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity style={[styles.optionChip, sortBy === 'expiry' && styles.optionChipActive]} onPress={() => handleSortPress('expiry')}>
                <Text style={[styles.optionChipText, sortBy === 'expiry' && styles.optionChipTextActive]}>Терміном придатності{renderSortArrow('expiry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionChip, sortBy === 'alphabet' && styles.optionChipActive]} onPress={() => handleSortPress('alphabet')}>
                <Text style={[styles.optionChipText, sortBy === 'alphabet' && styles.optionChipTextActive]}>Алфавітом{renderSortArrow('alphabet')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionChip, sortBy === 'quantity' && styles.optionChipActive]} onPress={() => handleSortPress('quantity')}>
                <Text style={[styles.optionChipText, sortBy === 'quantity' && styles.optionChipTextActive]}>Кількістю{renderSortArrow('quantity')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Категорія</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <TouchableOpacity style={[styles.categoryChip, selectedCategory === 'Всі' && styles.categoryChipActive]} onPress={() => setSelectedCategory('Всі')}>
                <Text style={[styles.categoryChipText, selectedCategory === 'Всі' && styles.categoryChipTextActive]}>Всі</Text>
              </TouchableOpacity>
              {CATEGORIES.map(category => ( 
                <TouchableOpacity key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} onPress={() => setSelectedCategory(category)}>
                  <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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

const getStyles = (COLORS, insets, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: (insets.top || 20) + 10, paddingBottom: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 16, paddingHorizontal: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 12 : 8, marginLeft: 8, fontSize: 16, color: COLORS.text },
  filterButton: { padding: 10, backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  activeFiltersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10 },
  activeFiltersText: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic' },
  
  resetLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme === 'dark' ? 'rgba(255, 66, 66, 0.15)' : '#FCE8E6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  resetLinkText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  
  recipesIdeaButton: { flexDirection: 'row', backgroundColor: COLORS.primary, marginHorizontal: 20, marginTop: 12, paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
  recipesIdeaText: { color: COLORS.onPrimary || '#fff', fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textLight, textAlign: 'center' },

  swipeAction: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 100, 
  },
  consumeAction: { 
    backgroundColor: COLORS.success, 
    borderRadius: 20, 
  },
  deleteAction: { 
    backgroundColor: COLORS.danger,  
    borderRadius: 20
  },
  swipeText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },

  // ОНОВЛЕНО: Значення bottom збільшено з 90 до 130, щоб напис був вище нижнього меню навігації (Tab Bar)
  snackbar: { position: 'absolute', bottom: 130, left: 20, right: 20, backgroundColor: COLORS.text, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  snackbarText: { color: COLORS.background, fontSize: 14, fontWeight: '500' },
  snackbarAction: { color: COLORS.background, fontWeight: 'bold', fontSize: 14 },

  consumeModalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, width: '92%', maxWidth: 380 },
  consumeSubtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: 16, textAlign: 'center' },
  consumeInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 16, fontSize: 20, textAlign: 'center', marginBottom: 24, backgroundColor: COLORS.background, color: COLORS.text },
  modalButton: { flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  bottomModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%', width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 10 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  optionChip: { backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionChipText: { color: COLORS.text, fontSize: 13 },
  optionChipTextActive: { color: COLORS.onPrimary || '#fff', fontWeight: '600' },
  categoriesScroll: { flexDirection: 'row', marginBottom: 24 },
  categoryChip: { backgroundColor: COLORS.background, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, height: 36, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { color: COLORS.text, fontSize: 13 },
  categoryChipTextActive: { color: COLORS.onPrimary || '#fff', fontWeight: '600' },
  modalActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  modalResetButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  modalResetButtonText: { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
  applyButton: { flex: 2, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { color: COLORS.onPrimary || '#fff', fontSize: 16, fontWeight: 'bold' }
});