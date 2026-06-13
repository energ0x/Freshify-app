import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Alert, StatusBar, Platform, LayoutAnimation, UIManager, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function GroceryListScreen() {
  const { t } = useTranslation();
  const { groceryItems, fetchGrocery, addGroceryItem, toggleGroceryItem, deleteGroceryItem, addFromFridge, products } = useProductStore();
  const { colors: COLORS, theme } = useThemeStore();
  const [newItemName, setNewItemName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = getStyles(COLORS, insets, tabBarHeight);

  const [pendingDelete, setPendingDelete] = useState(null);
  const deleteTimeoutRef = useRef(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchGrocery();
    setRefreshing(false);
  }, [fetchGrocery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const animateList = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'scaleY' },
      create: { type: 'easeInEaseOut', property: 'scaleY' },
    });
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    const res = await addGroceryItem({ name: newItemName.trim(), quantity: 1, unit: 'шт' });
    if (res.success) setNewItemName('');
  };

  const handleAddLowStock = async () => {
    const lowStockIds = products.filter(p => p.quantity < 2).map(p => p.id);

    if (lowStockIds.length === 0) {
      return Alert.alert(t('common.info'), t('grocery.allSufficient'));
    }

    const res = await addFromFridge(lowStockIds);
    if (res.success) {
      Alert.alert(t('common.success'), t('grocery.addedLowStock'));
      loadData();
    }
  };

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

  const handleUndoDelete = () => {
    clearTimeout(deleteTimeoutRef.current);
    animateList();
    setPendingDelete(null);
  };

  const handleBuyTrigger = (item) => {
    toggleGroceryItem(item.id, true);
  };

  const visibleGroceryItems = groceryItems.filter(i => i.id !== pendingDelete?.id);

  const SwipeableGroceryItem = ({ item }) => {
    const swipeableRef = useRef(null);

    const renderLeftActions = (progress, dragX) => {
      const opacity = dragX.interpolate({
        inputRange: [0, 20],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View style={[styles.swipeAction, styles.buyAction, { opacity }]}>
          <Ionicons name="cart" size={24} color={COLORS.onPrimaryContainer} />
          <Text style={[styles.swipeText, { color: COLORS.onPrimaryContainer }]}>{t('grocery.swipeBought')}</Text>
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
            activeOpacity={1}
          >
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
                <TouchableOpacity onPress={() => setNewItemName('')} style={{ marginRight: 4 }}>
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
                size={28}
                color={!newItemName.trim() ? COLORS.onSurfaceVariant : COLORS.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>

        <TouchableOpacity style={styles.autoAddBtn} onPress={handleAddLowStock}>
          <Ionicons name="sync-outline" size={18} color={COLORS.onPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.autoAddText}>{t('grocery.addRunningOut')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleGroceryItems}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <SwipeableGroceryItem item={item} />}
        contentContainerStyle={styles.list}
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

const getStyles = (COLORS, insets, tabBarHeight) => StyleSheet.create({
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
    borderRadius: 100,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primaryContainer,
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.surfaceVariant,
  },
  autoAddBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoAddText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── List ──────────────────────────────────────────────────────────────────
  list: {
    padding: 20,
    paddingBottom: tabBarHeight + 40,
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
    shadowColor: '#000000',
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
    fontWeight: '500',
    marginLeft: 12,
    color: COLORS.text,
    flex: 1,
  },
  itemPurchased: {
    textDecorationLine: 'line-through',
    color: COLORS.onSurfaceVariant,
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
  buyAction: {
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
});