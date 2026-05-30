import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import useProductStore from '../store/productStore';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants'; 

export default function GroceryListScreen() {
  const { groceryItems, fetchGrocery, addGroceryItem, toggleGroceryItem, deleteGroceryItem, addFromFridge, products } = useProductStore(); 
  const [newItemName, setNewItemName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  const handleClearAll = () => {
    Alert.alert(
      'Очистити список', 
      'Ви впевнені, що хочете видалити всі продукти зі списку покупок?', 
      [
        { text: 'Скасувати', style: 'cancel' },
        { 
          text: 'Видалити всі', 
          style: 'destructive', 
          onPress: () => {
            groceryItems.forEach(item => deleteGroceryItem(item.id));
          } 
        }
      ]
    );
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
        <Ionicons name="cart" size={24} color="#fff" />
        <Text style={styles.swipeText}>Купив</Text>
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
        containerStyle={{ marginBottom: 10 }}
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
          >
            <Ionicons
              name={item.is_purchased ? "checkmark-circle" : "ellipse-outline"}
              size={28}
              color={item.is_purchased ? COLORS.success : COLORS.border}
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
      <View style={styles.header}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Що потрібно купити?"
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAddItem}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerButtonsRow}>
          <CustomButton
            title="Додати те, що закінчується"
            variant="outline"
            onPress={handleAddLowStock}
            style={styles.autoAddBtn}
          />
          
          {groceryItems.length > 0 && (
            <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
              <Ionicons name="trash" size={22} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={visibleGroceryItems}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <SwipeableGroceryItem item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Список покупок порожній</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16, marginRight: 10 },
  addButton: { backgroundColor: COLORS.primary, width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  headerButtonsRow: { flexDirection: 'row', alignItems: 'center' },
  autoAddBtn: { flex: 1, paddingVertical: 10 },
  clearAllBtn: { marginLeft: 12, height: 48, width: 48, borderRadius: 10, borderWidth: 1, borderColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCE8E6' },

  list: { padding: 16 },
  
  itemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemName: { fontSize: 16, marginLeft: 12, color: COLORS.text, flex: 1 },
  itemPurchased: { textDecorationLine: 'line-through', color: COLORS.textLight },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textLight },

  swipeAction: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 100, 
    borderRadius: 12 
  },
  buyAction: { 
    backgroundColor: COLORS.success, 
    marginRight: -20,
    paddingRight: 20,
  },
  deleteAction: { 
    backgroundColor: COLORS.danger, 
    marginLeft: -20,
    paddingLeft: 20,
  },
  swipeText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },

  snackbar: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#333', borderRadius: 8, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  snackbarText: { color: '#fff', fontSize: 14 },
  snackbarAction: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
});