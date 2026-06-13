import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform, StatusBar, LayoutAnimation, UIManager, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import ProductCard from '../components/ProductCard';
import CustomButton from '../components/CustomButton';
import { useTranslation } from 'react-i18next';
import { getDaysUntilExpiry } from '../utils/dateHelpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { products, fetchProducts, deleteProduct, consumeProduct } = useProductStore();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  const styles = getStyles(COLORS, insets, theme, tabBarHeight);
  
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
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
    setSelectedCategoryId(null);
    setSortBy(null);
    setSortDirection('asc');
    setSearch('');
  };

  const isFilterActive = selectedCategoryId !== null || sortBy !== null || search !== '';

  const presentCategories = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const p of products) {
      if (p.category_obj && !seen.has(p.category_obj.id)) {
        seen.add(p.category_obj.id);
        result.push(p.category_obj);
      }
    }
    return result;
  }, [products]);

  useEffect(() => {
    if (selectedCategoryId && !presentCategories.some(c => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [presentCategories, selectedCategoryId]);

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
      return Alert.alert(t('common.error'), t('home.invalidQty'));
    }
    if (amount > productToConsume.quantity) {
      return Alert.alert(t('common.attention'), t('home.qtyExceeds'));
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
      const matchesCategory = selectedCategoryId === null || p.category_id === selectedCategoryId;
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

    const renderLeftActions = (progress, dragX) => {
      const opacity = dragX.interpolate({
        inputRange: [0, 20],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View style={[styles.swipeAction, styles.consumeAction, { opacity }]}>
          <Ionicons name="restaurant" size={24} color={COLORS.onPrimaryContainer} />
          <Text style={[styles.swipeText, { color: COLORS.onPrimaryContainer }]}>{t('home.consume')}</Text>
        </Animated.View>
      );
    };

    const renderRightActions = (progress, dragX) => {
      const opacity = dragX.interpolate({
        inputRange: [-20, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View style={[styles.swipeAction, styles.deleteAction, { opacity }]}>
          <Ionicons name="trash" size={24} color={COLORS.onErrorContainer} />
          <Text style={[styles.swipeText, { color: COLORS.onErrorContainer }]}>{t('common.delete')}</Text>
        </Animated.View>
      );
    };

    return (
      <Swipeable
        ref={swipeableRef}
        containerStyle={{ marginBottom: 12, overflow: 'visible' }}
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
        <Text style={styles.headerTitle}>{t('home.title')}</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.onSurfaceVariant} />
            <TextInput 
              style={styles.searchInput} 
              placeholder={t('home.search')}
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={search} 
              onChangeText={setSearch} 
            />
            {search !== '' && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ marginRight: 4 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, isFilterActive && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name={isFilterActive ? "options" : "options-outline"}
              size={24}
              color={isFilterActive ? COLORS.onPrimary : COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {isFilterActive && (
          <View style={styles.activeFiltersRow}>
            <Text style={styles.activeFiltersText}>
              {t('home.filtersApplied')}{sortBy ? ` (${t('home.sorting')}${renderSortArrow(sortBy)})` : ''}
            </Text>
            <TouchableOpacity style={styles.resetLink} onPress={resetFilters}>
              <Ionicons name="refresh-outline" size={14} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={styles.resetLinkText}>{t('common.resetAll')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {products.length > 0 && (
          <TouchableOpacity style={styles.recipesIdeaButton} onPress={() => navigation.navigate('Recipes')} activeOpacity={0.8}>
            <Ionicons name="restaurant-outline" size={18} color={COLORS.onPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.recipesIdeaText}>{t('home.recipesIdea')}</Text>
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
            <View style={styles.emptyIconContainer}>
              <Ionicons name="fast-food-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('home.empty')}</Text>
            <Text style={styles.emptyText}>{t('home.emptyText')}</Text>
          </View>
        }
      />

      {pendingDelete && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>{t('home.productDeleted')}</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={styles.snackbarAction}>{t('common.undo')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={consumeModalVisible} animationType="fade" transparent={true} onRequestClose={() => setConsumeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.consumeModalContent}>
            <Text style={styles.modalTitle}>{t('home.consumeTitle')}</Text>
            <Text style={styles.consumeSubtitle}>{productToConsume?.name} ({t('home.consumeAvailable', { quantity: productToConsume?.quantity, unit: productToConsume?.unit })})</Text>
            
            <TextInput
              style={styles.consumeInput}
              keyboardType="numeric"
              value={consumeAmount}
              onChangeText={setConsumeAmount}
              autoFocus
              placeholderTextColor={COLORS.onSurfaceVariant}
            />
            
            <View style={styles.modalActionsRow}>
              <CustomButton title={t('common.cancel')} variant="outline" onPress={() => setConsumeModalVisible(false)} style={styles.modalButton} />
              <CustomButton title={t('common.confirm')} onPress={submitConsume} style={styles.modalButton} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={showFilterModal} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.bottomModalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('home.filtersTitle')}</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{t('home.sortBy')}</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity style={[styles.optionChip, sortBy === 'expiry' && styles.optionChipActive]} onPress={() => handleSortPress('expiry')}>
                <Text style={[styles.optionChipText, sortBy === 'expiry' && styles.optionChipTextActive]}>{t('home.sortExpiry')}{renderSortArrow('expiry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionChip, sortBy === 'alphabet' && styles.optionChipActive]} onPress={() => handleSortPress('alphabet')}>
                <Text style={[styles.optionChipText, sortBy === 'alphabet' && styles.optionChipTextActive]}>{t('home.sortAlphabet')}{renderSortArrow('alphabet')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionChip, sortBy === 'quantity' && styles.optionChipActive]} onPress={() => handleSortPress('quantity')}>
                <Text style={[styles.optionChipText, sortBy === 'quantity' && styles.optionChipTextActive]}>{t('home.sortQuantity')}{renderSortArrow('quantity')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{t('home.filterCategory')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <TouchableOpacity style={[styles.categoryChip, selectedCategoryId === null && styles.categoryChipActive]} onPress={() => setSelectedCategoryId(null)}>
                <Text style={[styles.categoryChipText, selectedCategoryId === null && styles.categoryChipTextActive]}>{t('home.all')}</Text>
              </TouchableOpacity>
              {presentCategories.map(category => (
                <TouchableOpacity key={category.id} style={[styles.categoryChip, selectedCategoryId === category.id && styles.categoryChipActive]} onPress={() => setSelectedCategoryId(category.id)}>
                  <Text style={[styles.categoryChipText, selectedCategoryId === category.id && styles.categoryChipTextActive]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalResetButton} onPress={resetFilters}>
                <Text style={styles.modalResetButtonText}>{t('common.resetAll')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyButtonText}>{t('common.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (COLORS, insets, theme, tabBarHeight) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 100,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  activeFiltersText: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
  },
  resetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255, 66, 66, 0.15)' : '#FCE8E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resetLinkText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },
  recipesIdeaButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipesIdeaText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── List ──────────────────────────────────────────────────────────────────
  list: {
    padding: 20,
    paddingBottom: tabBarHeight + 40,
  },

  // ─── Empty state ───────────────────────────────────────────────────────────
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
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },

  // ─── Swipe actions ─────────────────────────────────────────────────────────
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: 16,
  },
  consumeAction: {
    backgroundColor: COLORS.primaryContainer,
    marginRight: -20,
    paddingRight: 20,
  },
  deleteAction: {
    backgroundColor: COLORS.errorContainer,
    marginLeft: -20,
    paddingLeft: 20,
  },
  swipeText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  // ─── Snackbar ──────────────────────────────────────────────────────────────
  snackbar: {
    position: 'absolute',
    bottom: tabBarHeight + 80,
    left: 20,
    right: 20,
    backgroundColor: COLORS.text,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  snackbarText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '500',
  },
  snackbarAction: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },

  // ─── Consume modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumeModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: '92%',
    maxWidth: 380,
  },
  consumeSubtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    marginBottom: 16,
    textAlign: 'center',
  },
  consumeInput: {
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 16,
    padding: 16,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  modalButton: {
    flex: 1,
  },

  // ─── Filter modal ──────────────────────────────────────────────────────────
  bottomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  optionChip: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary,
  },
  optionChipText: {
    color: COLORS.text,
    fontSize: 13,
  },
  optionChipTextActive: {
    color: COLORS.onPrimary,
    fontWeight: '600',
  },
  categoriesScroll: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  categoryChip: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.text,
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: COLORS.onPrimary,
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalResetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.background,
  },
  modalResetButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});