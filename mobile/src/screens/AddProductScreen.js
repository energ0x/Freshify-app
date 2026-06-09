import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import CustomPicker from '../components/CustomPicker';
import { UNITS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '../hooks/useCategories';

export default function AddProductScreen({ navigation, route }) {
  const { addProduct } = useProductStore();
  const { colors: COLORS } = useThemeStore();
  const { categories, createCategory } = useCategories();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category_id: null,
    quantity: '1',
    unit: UNITS[0],
    expiry_date: new Date(),
    notes: '',
  });

  const styles = getStyles(COLORS);

  useEffect(() => {
    if (categories.length > 0 && !form.category_id) {
        setForm(prev => ({...prev, category_id: categories[0].id}));
    }
  }, [categories]);

  const processAiResult = (data) => {
    const { name, category_id, estimated_shelf_life_days, category_suggestion, has_allergen } = data;
    const expiry = new Date();
    if (estimated_shelf_life_days) {
      expiry.setDate(expiry.getDate() + estimated_shelf_life_days);
    }

    const updateForm = (newCategoryId) => {
      setForm(prev => ({
        ...prev,
        name: name || prev.name,
        category_id: newCategoryId || prev.category_id,
        expiry_date: expiry
      }));
    };

    const handleAllergenWarning = (onConfirm) => {
      if (has_allergen) {
        Alert.alert(
          'Увага, алерген!',
          'У вас може бути алергія на цей продукт. Все одно додати?',
          [
            { text: 'Ні', style: 'cancel' },
            { text: 'Так', onPress: onConfirm }
          ]
        );
      } else {
        onConfirm();
      }
    };

    if (category_suggestion) {
      Alert.alert(
        'Категорію не знайдено',
        `Цієї категорії продуктів ("${category_suggestion}") у вас немає. Відновити її?`,
        [
          { 
            text: 'Ні', 
            style: 'cancel',
            onPress: () => Alert.alert('Помилка', 'Не вдалося повністю розпізнати продукт без категорії.')
          },
          {
            text: 'Так',
            onPress: () => handleAllergenWarning(async () => {
              setLoading(true);
              try {
                const newCat = await createCategory({ name: category_suggestion });
                updateForm(newCat.id);
              } catch (e) {
                 Alert.alert('Помилка', 'Не вдалося створити категорію');
              } finally {
                 setLoading(false);
              }
            })
          }
        ]
      );
    } else {
      handleAllergenWarning(() => updateForm(category_id));
    }
  };

  useEffect(() => {
    if (route.params?.aiResult) {
      let data = route.params.aiResult;
      
      if (Array.isArray(data)) {
        if (data.length > 1) {
          Alert.alert('Чек розпізнано', `Знайдено ${data.length} продуктів. Поки що заповнено перший, інші ви зможете додати згодом.`);
        }
        data = data[0] || {};
      }
      processAiResult(data);
    }
  }, [route.params?.aiResult]);

  const handleSave = async () => {
    if (!form.name) return Alert.alert('Помилка', 'Введіть назву продукту');

    setLoading(true);
    const res = await addProduct({
      ...form,
      quantity: parseFloat(form.quantity),
      expiry_date: form.expiry_date.toISOString().split('T')[0]
    });
    setLoading(false);

    if (res.success) navigation.goBack();
    else Alert.alert('Помилка', res.error);
  };

  const unitItems = UNITS.map(u => ({ label: u, value: u }));
  const categoryItems = categories.map(c => ({ label: c.name, value: c.id }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      <Text style={styles.scanLabel}>Додати за допомогою ШІ</Text>
      <View style={styles.scanRow}>
        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'product' })} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
          <Text style={styles.scanBtnText}>Фото</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'barcode' })} activeOpacity={0.7}>
          <Ionicons name="barcode-outline" size={28} color={COLORS.primary} />
          <Text style={styles.scanBtnText}>Штрихкод</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'receipt' })} activeOpacity={0.7}>
          <Ionicons name="receipt-outline" size={28} color={COLORS.primary} />
          <Text style={styles.scanBtnText}>Чек</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.label}>Назва продукту</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(val) => setForm({ ...form, name: val })}
          placeholder="Наприклад: Молоко"
          placeholderTextColor={COLORS.onSurfaceVariant}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.section, { flex: 2, marginRight: 10 }]}>
          <Text style={styles.label}>Кількість</Text>
          <TextInput
            style={styles.input}
            value={form.quantity}
            onChangeText={(val) => setForm({ ...form, quantity: val })}
            keyboardType="numeric"
            placeholderTextColor={COLORS.onSurfaceVariant}
          />
        </View>
        <View style={[styles.section, { flex: 3 }]}>
          <CustomPicker
            label="Одиниця"
            items={unitItems}
            selectedValue={form.unit}
            onValueChange={(val) => setForm({ ...form, unit: val })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <CustomPicker
          label="Категорія"
          items={categoryItems}
          selectedValue={form.category_id}
          onValueChange={(val) => setForm({ ...form, category_id: val })}
        />
      </View>

      <View style={styles.section}>
        <DatePicker
          date={form.expiry_date}
          onDateChange={(date) => setForm({ ...form, expiry_date: date })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Нотатки (опціонально)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.notes}
          onChangeText={(val) => setForm({ ...form, notes: val })}
          placeholder="Наприклад: Зберігати в холодильнику..."
          placeholderTextColor={COLORS.onSurfaceVariant}
          multiline={true}
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <CustomButton
        title="Зберегти"
        onPress={handleSave}
        loading={loading}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const getStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  
  scanLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  scanRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  scanBtn: { flex: 1, backgroundColor: COLORS.surfaceVariant, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${COLORS.primary}30` },
  scanBtnText: { marginTop: 8, fontSize: 13, fontWeight: '600', color: COLORS.text },
  
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 24, opacity: 0.5 },
  
  section: { marginBottom: 20 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.surfaceVariant, borderWidth: 1, borderColor: 'transparent', borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 16, color: COLORS.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  saveButton: { marginTop: 20 },
});