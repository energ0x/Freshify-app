/**
 * @file GroceryListScreen.js
 * @description Screen for managing the user's grocery shopping list.
 * Supports manual entries, checking/unchecking items, swipe-to-delete with Undo snackbars,
 * and automatic synchronization of low-stock items from the fridge/pantry inventory.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  RefreshControl, Alert, StatusBar, Platform, LayoutAnimation,
  UIManager, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';

// Enable layout animations on Android for smooth UI transitions (e.g. checkbox state alterations)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * GroceryListScreen Component.
 * Visualizes shopping lists and handles low stock detection.
 */
export default function GroceryListScreen() {
  const { t } = useTranslation();

  // Pull grocery context actions and items from the product store
  const { 
    groceryItems, 
    fetchGrocery, 
    addGroceryItem, 
    toggleGroceryItem, 
    deleteGroceryItem, 
    addFromFridge, 
    products 
  } = useProductStore();

  // Theme styling helpers
  const { colors: COLORS, theme } = useThemeStore();
  const [newItemName, setNewItemName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = getStyles(COLORS, insets, tabBarHeight);

  // Deletion undo scheduling reference states
  const [pendingDelete, setPendingDelete] = useState(null);
  const deleteTimeoutRef = useRef(null);

  /**
   * Fetches current grocery items from store/API database.
   */
  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchGrocery();
    setRefreshing(false);
  }, [fetchGrocery]);

  // Load groceries list on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Triggers layout animation transitions for list modifications.
   */
  const animateList = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'scaleY' },
      create: { type: 'easeInEaseOut', property: 'scaleY' },
    });
  };

  /**
   * Appends manual text entry to grocery item list.
   */
  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    
    // Add default unit (e.g., pcs) alongside manual entries
    const res = await addGroceryItem({ 
      name: newItemName.trim(), 
      quantity: 1, 
      unit: t('grocery.defaultUnit') 
    });
    if (res.success) setNewItemName('');
  };

  /**
   * Scans current active pantry inventory and adds items that fall below 
   * threshold (quantity < 2) automatically to the shopping list.
   */
  const handleAddLowStock = async () => {
    const lowStockIds = products.filter(p => p.quantity < 2).map(p => p.id);

    if (lowStockIds.length === 0) {
      return Alert.alert(t('common.info'), t('grocery.enoughProducts'));
    }

    const res = await addFromFridge(lowStockIds);
    if (res.success) {
      Alert.alert(t('common.success'), t('grocery.lowStockAdded'));
      loadData();
    }
  };

  /**
   * Schedules deletion with a 4-second timeout during which the user can press "Undo".
   * Finalizes previous deletion instantly if another delete is triggered.
   * 
   * @param {Object} item - Grocery item to delete.
   */
  const handleDeleteTrigger = (item) => {
    if (pendingDelete) {
      deleteGroceryItem(pendingDelete.id);
      clearTimeout(deleteTimeoutRef.current);
    }
    animateList();
    setPendingDelete(item);
    deleteTimeoutRef.current = setTimeout(() => {
      deleteGroceryItem(item.id);
      setPendingDelete(null);
    }, 4000);
  };

  /**
   * Restores scheduled item deletion back to active grocery list.
   */
  const handleUndoDelete = () => {
    clearTimeout(deleteTimeoutRef.current);
    animateList();
    setPendingDelete(null);
  };

  /**
   * Checks items as purchased when swiped left.
   */
  const handleBuyTrigger = (item) => {
    toggleGroceryItem(item.id, true);
  };

  // Exclude pending-delete items from active rendering list
  const visibleGroceryItems = groceryItems.filter(i => i.id !== pendingDelete?.id);

  /**
   * Swipeable wrapper component for each shopping list item.
   * Implements left swipe for "Purchased" toggle, and right swipe for "Delete".
   */
  const SwipeableGroceryItem = ({ item }) => {
    const swipeableRef = useRef(null);

    // Left swipe action rendering (Mark as Purchased)
    const renderLeftActions = (progress, dragX) => {
      const opacity = dragX.interpolate({
        inputRange: [0, 20],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View style={[styles.swipeAction, styles.buyAction, { opacity }]}>
          <Ionicons name="cart" size={24} color={COLORS.onPrimaryContainer} />
          <Text style={[styles.swipeText, { color: COLORS.onPrimaryContainer }]}>{t('grocery.purchased')}</Text>
        </Animated.View>
      );
    };

    // Right swipe action rendering (Remove from list)
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
          handleBuyTrigger(item);
        }}
        onSwipeableRightOpen={() => {
          handleDeleteTrigger(item);
        }}
      >
        <View style={styles.itemContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => toggleGroceryItem(item.id, !item.is_purchased)}
            activeOpacity={0.8}
          >
            {/* Visual checkbox and crossed text depending on purchased status */}
            <Ionicons
              name={item.is_purchased ? "checkmark-circle" : "ellipse-outline"}
              size={28}
              color={item.is_purchased ? COLORS.primary : COLORS.outline}
            />
            <Text style={[styles.itemName, item.is_purchased && styles.itemPurchased]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.surface} />

      {/* Input panel and quick actions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('grocery.title')}</Text>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="add-outline" size={20} color={COLORS.onSurfaceVariant} />
            <TextInput
              style={styles.input}
              placeholder={t('grocery.inputPlaceholder')}
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={newItemName}
              onChangeText={setNewItemName}
              onSubmitEditing={handleAddItem}
            />
            {newItemName !== '' && (
              <TouchableOpacity onPress={() => setNewItemName('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addButton, !newItemName.trim() && styles.addButtonDisabled]}
            onPress={handleAddItem}
            disabled={!newItemName.trim()}
          >
            <Ionicons
              name="add"
              size={24}
              color={!newItemName.trim() ? COLORS.onSurfaceVariant : COLORS.onPrimaryContainer}
            />
          </TouchableOpacity>
        </View>

        {/* Sync low-stock button helper */}
        <TouchableOpacity style={styles.autoAddBtn} onPress={handleAddLowStock} activeOpacity={0.8}>
          <Ionicons name="sync-outline" size={20} color={COLORS.onPrimaryContainer} />
          <Text style={styles.autoAddText}>{t('grocery.addLowStock')}</Text>
        </TouchableOpacity>
      </View>

      {/* Primary FlatList */}
      <FlatList
        data={visibleGroceryItems}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <SwipeableGroceryItem item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="cart-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('grocery.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('grocery.emptyText')}</Text>
          </View>
        }
      />

      {/* Undo deletion alert banner */}
      {pendingDelete && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>{t('grocery.itemDeleted')}</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={styles.snackbarAction}>{t('common.undo')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Creates dynamic styles using active theme tokens, notch inserts, and navigation heights.
 */
const getStyles = (COLORS, insets, tabBarHeight) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ─── Header Styling ────────────────────────────────────────────────────────
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
    marginTop: 12,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
  },
  addButton: {
    backgroundColor: COLORS.primaryContainer,
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.surfaceVariant,
  },
  autoAddBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryContainer,
    marginTop: 16,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  autoAddText: {
    color: COLORS.onPrimaryContainer,
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── List Styling ──────────────────────────────────────────────────────────
  list: {
    padding: 20,
    paddingBottom: tabBarHeight + 40,
  },
  swipeableContainer: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: COLORS.text,
    flex: 1,
  },
  itemPurchased: {
    textDecorationLine: 'line-through',
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
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

  // ─── Swipe Actions Styling ─────────────────────────────────────────────────
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
  },
  buyAction: {
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

  // ─── Snackbar Styling ──────────────────────────────────────────────────────
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
    textTransform: 'uppercase',
  },
});