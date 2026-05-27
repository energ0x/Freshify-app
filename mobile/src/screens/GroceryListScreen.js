import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Alert, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

export default function GroceryListScreen() {
  const { groceryItems, fetchGrocery, addGroceryItem, toggleGroceryItem, deleteGroceryItem, addFromFridge, products } = useProductStore();
  const { colors: COLORS, theme } = useThemeStore();
  const [newItemName, setNewItemName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const styles = getStyles(COLORS, insets);

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

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    const res = await addGroceryItem({ name: newItemName.trim(), quantity: 1, unit: 'шт' });
    if (res.success) setNewItemName('');
  };

  const handleAddLowStock = async () => {
    const lowStockIds = products.filter(p => p.quantity < 2).map(p => p.id);

    if (lowStockIds.length === 0) {
      return Alert.alert('Інформація', 'У вас достатньо всіх продуктів.');
    }

    const res = await addFromFridge(lowStockIds);
    if (res.success) {
      Alert.alert('Успіх', 'Продукти, що закінчуються, додано до списку.');
      loadData();
    }
  };

  const handleDeleteTrigger = (item) => {
    if (pendingDelete) {
      deleteGroceryItem(pendingDelete.id);
      clearTimeout(deleteTimeoutRef.current);
    }
    setPendingDelete(item);
    deleteTimeoutRef.current = setTimeout(() => {
      deleteGroceryItem(item.id);
      setPendingDelete(null);
    }, 4000);
  };

  const handleUndoDelete = () => {
    clearTimeout(deleteTimeoutRef.current);
    setPendingDelete(null);
  };

  const handleBuyTrigger = (item) => {
    toggleGroceryItem(item.id, true);
  };

  const visibleGroceryItems = groceryItems.filter(i => i.id !== pendingDelete?.id);

  const SwipeableGroceryItem = ({ item }) => {
    const swipeableRef = useRef(null);

    const renderLeftActions = () => (
      <View style={[styles.swipeAction, styles.buyAction]}>
        <Ionicons name="cart" size={24} color={COLORS.onPrimaryContainer} />
        <Text style={[styles.swipeText, { color: COLORS.onPrimaryContainer }]}>Куплено</Text>
      </View>
    );

    const renderRightActions = () => (
      <View style={[styles.swipeAction, styles.deleteAction]}>
        <Ionicons name="trash" size={24} color={COLORS.onErrorContainer} />
        <Text style={[styles.swipeText, { color: COLORS.onErrorContainer }]}>Видалити</Text>
      </View>
    );

    return (
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableLeftOpen={() => {
          swipeableRef.current?.close();
          handleBuyTrigger(item);
        }}
        onSwipeableRightOpen={() => {
          swipeableRef.current?.close();
          handleDeleteTrigger(item);
        }}
      >
        <View style={styles.itemContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => toggleGroceryItem(item.id, !item.is_purchased)}
            activeOpacity={0.7}
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
         <Text style={styles.headerTitle}>Список покупок</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Що потрібно купити?"
            placeholderTextColor={COLORS.onSurfaceVariant}
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAddItem}
          />
          <TouchableOpacity 
            style={[styles.addButton, !newItemName.trim() && styles.addButtonDisabled]} 
            onPress={handleAddItem}
            disabled={!newItemName.trim()}
          >
            <Ionicons name="add" size={28} color={!newItemName.trim() ? COLORS.onSurfaceVariant : COLORS.onPrimaryContainer} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.autoAddBtn} onPress={handleAddLowStock}>
          <Ionicons name="sync-outline" size={18} color={COLORS.onPrimaryContainer} style={{ marginRight: 8 }} />
          <Text style={styles.autoAddText}>Додати те, що закінчується</Text>
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
            <Text style={styles.emptyTitle}>Список порожній</Text>
            <Text style={styles.emptyText}>Додайте продукти, які потрібно купити у магазині</Text>
          </View>
        }
      />

      {pendingDelete && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>Елемент видалено</Text>
          <TouchableOpacity onPress={handleUndoDelete}>
            <Text style={styles.snackbarAction}>СКАСУВАТИ</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getStyles = (COLORS, insets) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 20, 
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
    marginBottom: 20,
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  input: { 
    flex: 1, 
    backgroundColor: COLORS.surfaceVariant, 
    borderRadius: 100, 
    paddingHorizontal: 20,
    paddingVertical: 14, 
    fontSize: 16, 
    color: COLORS.text,
    marginRight: 12,
  },
  addButton: { 
    backgroundColor: COLORS.primaryContainer, 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  addButtonDisabled: {
    backgroundColor: COLORS.surfaceVariant,
  },
  autoAddBtn: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.primaryContainer, 
    marginTop: 16, 
    paddingVertical: 12, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  autoAddText: {
    color: COLORS.onPrimaryContainer, 
    fontSize: 14, 
    fontWeight: '600'
  },
  list: { 
    padding: 16,
    paddingBottom: insets.bottom + 40,
  },
  itemContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: COLORS.surface, 
    paddingHorizontal: 16,
    paddingVertical: 14, 
    borderRadius: 16, 
    marginBottom: 10, 
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  checkboxContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  itemName: { 
    fontSize: 16, 
    fontWeight: '500',
    marginLeft: 12, 
    color: COLORS.text, 
    flex: 1 
  },
  itemPurchased: { 
    textDecorationLine: 'line-through', 
    color: COLORS.textLight 
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
  swipeAction: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 90, 
    marginBottom: 10, 
    borderRadius: 16,
    height: '90%'
  },
  buyAction: { 
    backgroundColor: COLORS.primaryContainer, 
    paddingRight: 10 
  },
  deleteAction: { 
    backgroundColor: COLORS.errorContainer, 
    paddingLeft: 10 
  },
  swipeText: { 
    fontSize: 12, 
    fontWeight: '600', 
    marginTop: 4 
  },
  snackbar: { 
    position: 'absolute', 
    left: 20, 
    right: 20, 
    bottom: insets.bottom + 80,
    backgroundColor: COLORS.onSurfaceVariant, 
    borderRadius: 8, 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4 
  },
  snackbarText: { 
    color: COLORS.surface, 
    fontSize: 14 
  },
  snackbarAction: { 
    color: COLORS.primaryContainer, 
    fontWeight: 'bold', 
    fontSize: 14 
  },
});