import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useProductStore from '../store/productStore';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';

export default function GroceryListScreen() {
  const { groceryItems, fetchGrocery, addGroceryItem, toggleGroceryItem, deleteGroceryItem, addFromFridge, products } = useProductStore();
  const [newItemName, setNewItemName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchGrocery();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    const res = await addGroceryItem({ name: newItemName.trim(), quantity: 1, unit: 'шт' });
    if (res.success) setNewItemName('');
  };

  const handleAddLowStock = async () => {
    // Знаходимо продукти, яких залишилось мало (менше 2 одиниць)
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

  const renderItem = ({ item }) => (
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
      <TouchableOpacity onPress={() => deleteGroceryItem(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

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
        <CustomButton
          title="Додати те, що закінчується"
          variant="outline"
          onPress={handleAddLowStock}
          style={styles.autoAddBtn}
        />
      </View>

      <FlatList
        data={groceryItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Список покупок порожній</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16, marginRight: 10 },
  addButton: { backgroundColor: COLORS.primary, width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  autoAddBtn: { paddingVertical: 10 },
  list: { padding: 16 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemName: { fontSize: 16, marginLeft: 12, color: COLORS.text, flex: 1 },
  itemPurchased: { textDecorationLine: 'line-through', color: COLORS.textLight },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textLight },
});