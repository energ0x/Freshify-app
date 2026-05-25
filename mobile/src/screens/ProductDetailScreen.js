import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import useProductStore from '../store/productStore';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import { COLORS, CATEGORIES, UNITS } from '../utils/constants';
import { getExpiryLabel, getExpiryColor, formatDate } from '../utils/dateHelpers';

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const { products, deleteProduct, consumeProduct, updateProduct } = useProductStore();
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const product = products.find(p => p.id === productId);

  const [editForm, setEditForm] = useState({
    name: '',
    category: CATEGORIES[0],
    quantity: '1',
    unit: UNITS[0],
    expiry_date: new Date(),
    notes: '',
  });

  useEffect(() => {
    if (product) {
      setEditForm({
        name: product.name || '',
        category: product.category || CATEGORIES[0],
        quantity: product.quantity ? product.quantity.toString() : '1',
        unit: product.unit || UNITS[0],
        expiry_date: product.expiry_date ? new Date(product.expiry_date) : new Date(),
        notes: product.notes || '',
      });
    }
  }, [product]);

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Продукт не знайдено</Text>
      </View>
    );
  }

  const expiryColor = getExpiryColor(product.expiry_date, COLORS);

  const handleDelete = () => {
    Alert.alert('Видалення', 'Ви впевнені, що хочете видалити цей продукт?', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteProduct(product.id);
          if (res.success) navigation.goBack();
          else Alert.alert('Помилка', res.error);
        }
      }
    ]);
  };

  const handleConsume = async () => {
    const amountToConsume = product.quantity >= 1 ? 1 : product.quantity;

    Alert.alert('Споживання', `Використати ${amountToConsume} ${product.unit}?`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Так',
        onPress: async () => {
          setLoading(true);
          const res = await consumeProduct(product.id, amountToConsume);
          setLoading(false);

          if (res.success) {
            Alert.alert('Успіх', 'Продукт додано до аналітики споживання');
            if (product.quantity - amountToConsume <= 0) {
              navigation.goBack();
            }
          } else {
            Alert.alert('Помилка', res.error);
          }
        }
      }
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name) return Alert.alert('Помилка', 'Введіть назву продукту');

    setSaving(true);
    const updateData = {
      name: editForm.name,
      category: editForm.category,
      quantity: parseFloat(editForm.quantity),
      unit: editForm.unit,
      expiry_date: editForm.expiry_date.toISOString().split('T')[0],
      notes: editForm.notes,
    };

    const res = await updateProduct(product.id, updateData);
    setSaving(false);

    if (res.success) {
      setEditModalVisible(false);
    } else {
      Alert.alert('Помилка', res.error || 'Не вдалося оновити продукт');
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.category}>{product.category || 'Без категорії'}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.editIconBtn}>
              <Ionicons name="pencil" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="scale-outline" size={24} color={COLORS.textLight} />
            <Text style={styles.infoText}>Залишок: <Text style={styles.bold}>{product.quantity} {product.unit}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.textLight} />
            <View>
              <Text style={styles.infoText}>Придатний до: <Text style={styles.bold}>{formatDate(product.expiry_date)}</Text></Text>
              <Text style={[styles.expiryLabel, { color: expiryColor }]}>{getExpiryLabel(product.expiry_date)}</Text>
            </View>
          </View>

          {product.notes ? (
            <View style={styles.notesContainer}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.textLight} style={styles.notesIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notesTitle}>Нотатки:</Text>
                <Text style={styles.notesText}>{product.notes}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <CustomButton
            title="Спожити продукт"
            onPress={handleConsume}
            loading={loading}
            style={styles.consumeButton}
          />
          <CustomButton
            title="Видалити"
            variant="danger"
            onPress={handleDelete}
            disabled={loading}
          />
        </View>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Редагувати продукт</Text>
                <View style={{ width: 28 }} />
              </View>

              <ScrollView style={styles.modalForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Назва продукту</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.name}
                    onChangeText={(val) => setEditForm(prev => ({ ...prev, name: val }))}
                    placeholder="Наприклад: Молоко"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.formGroup, { flex: 2, marginRight: 10 }]}>
                    <Text style={styles.formLabel}>Кількість</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.quantity}
                      onChangeText={(val) => setEditForm(prev => ({ ...prev, quantity: val }))}
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 3 }]}>
                    <Text style={styles.formLabel}>Одиниця</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        selectedValue={editForm.unit}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, unit: val }))}
                      >
                        {UNITS.map(u => <Picker.Item key={u} label={u} value={u} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Категорія</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                      selectedValue={editForm.category}
                      onValueChange={(val) => setEditForm(prev => ({ ...prev, category: val }))}
                    >
                      {CATEGORIES.map(c => <Picker.Item key={c} label={c} value={c} />)}
                    </Picker>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <DatePicker
                    date={editForm.expiry_date}
                    onDateChange={(date) => setEditForm(prev => ({ ...prev, expiry_date: date }))}
                  />
                </View>
                
                <View style={[styles.formGroup, {marginBottom: 30}]}>
                  <Text style={styles.formLabel}>Нотатки</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editForm.notes}
                    onChangeText={(val) => setEditForm(prev => ({ ...prev, notes: val }))}
                    placeholder="Важлива інформація про продукт..."
                    placeholderTextColor={COLORS.textLight}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

              </ScrollView>

              <View style={styles.modalActions}>
                <CustomButton
                  title="Скасувати"
                  variant="outline"
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalButton}
                  disabled={saving}
                />
                <CustomButton
                  title="Зберегти"
                  onPress={handleSaveEdit}
                  loading={saving}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  category: { fontSize: 16, color: COLORS.primary, marginBottom: 20, fontWeight: '500' },
  editIconBtn: { padding: 8, backgroundColor: `${COLORS.primary}15`, borderRadius: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoText: { fontSize: 16, color: COLORS.text, marginLeft: 12 },
  bold: { fontWeight: '600' },
  expiryLabel: { fontSize: 14, fontWeight: '500', marginLeft: 12, marginTop: 4 },
  notesContainer: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  notesIcon: { marginRight: 12, marginTop: 2 },
  notesTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  notesText: { fontSize: 14, color: COLORS.textLight, lineHeight: 20 },
  actions: { gap: 12 },
  consumeButton: { backgroundColor: COLORS.secondary },

  // Modal styles
  modalContainer: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  modalForm: { paddingHorizontal: 20, paddingVertical: 20 },
  formGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  formLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16, color: COLORS.text },
  textArea: { minHeight: 80 },
  pickerContainer: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
  picker: { color: COLORS.text },
  pickerItem: { color: COLORS.text },
  modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  modalButton: { flex: 1 },
});