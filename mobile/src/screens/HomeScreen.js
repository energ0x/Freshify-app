import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TextInput,
  TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform,
  StatusBar, LayoutAnimation, UIManager, Animated
} from 'react-native';
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

export default function HomeScreen({ navigation, route }) {
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

  const [pendingDelete, setPendingDelete] = useState(null);
  const deleteTimeoutRef = useRef(null);

  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [productToConsume, setProductToConsume] = useState(null);
  const [consumeAmount, setConsumeAmount] = useState('');

  useEffect(() => {
    if (route?.params?.appliedFilters) {
      const { selectedCategoryId: catId, sortBy: sort, sortDirection: dir } = route.params.appliedFilters;
      setSelectedCategoryId(catId);
      setSortBy(sort);
      setSortDirection(dir);
    }
  }, [route?.params?.appliedFilters]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        containerStyle={styles.swipeableContainer}
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
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterButton, isFilterActive && styles.filterButtonActive]}
            onPress={() => navigation.navigate('ProductFilters', {
              currentFilters: { selectedCategoryId, sortBy, sortDirection },
              presentCategories
            })}
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
              <Ionicons name="refresh-outline" size={14} color={COLORS.danger} />
              <Text style={styles.resetLinkText}>{t('common.resetAll')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {products.length > 0 && (
          <TouchableOpacity style={styles.recipesIdeaButton} onPress={() => navigation.navigate('Recipes')} activeOpacity={0.8}>
            <Ionicons name="restaurant-outline" size={20} color={COLORS.onPrimaryContainer} />
            <Text style={styles.recipesIdeaText}>{t('home.recipesIdea')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredAndSortedProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <SwipeableProductItem item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.consumeSubtitle}>
              {productToConsume?.name} ({t('home.consumeAvailable', { quantity: productToConsume?.quantity || 0, unit: productToConsume?.unit || '' })})
            </Text>

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
    </View>
  );
}

const getStyles = (COLORS, insets, theme, tabBarHeight) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12, // Опустили заголовок трохи нижче
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
  },
  filterButton: {
    width: 52,
    height: 52,
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
    marginTop: 16,
  },
  activeFiltersText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  resetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255, 66, 66, 0.15)' : '#FCE8E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  resetLinkText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
  },
  recipesIdeaButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryContainer,
    marginTop: 16,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    // Додано красиву тінь
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  recipesIdeaText: {
    color: COLORS.onPrimaryContainer,
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    padding: 20,
    paddingBottom: tabBarHeight + 40,
  },
  swipeableContainer: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
  },
  consumeAction: {
    backgroundColor: COLORS.primaryContainer,
  },
  deleteAction: {
    backgroundColor: COLORS.errorContainer,
  },
  swipeText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
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
  snackbar: {
    position: 'absolute',
    bottom: tabBarHeight + 20,
    alignSelf: 'center',
    width: '90%',
    backgroundColor: COLORS.text,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  snackbarText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '600',
  },
  snackbarAction: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consumeModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  consumeSubtitle: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  consumeInput: {
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    borderRadius: 16,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
  },
});