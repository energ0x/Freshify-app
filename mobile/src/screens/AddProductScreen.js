import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Потрібно встановити: npx expo install @react-native-picker/picker
import useProductStore from '../store/productStore';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import { COLORS, CATEGORIES, UNITS } from '../utils/constants';

export default function AddProductScreen({ navigation, route }) {
  const { addProduct } = useProductStore();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category: CATEGORIES[0],
    quantity: '1',
    unit: UNITS[0],
    expiry_date: new Date(),
    notes: '',
  });

  // Обробка даних від камери (якщо вони прийшли через параметри навігації)
  useEffect(() => {
    if (route.params?.aiResult) {
      const { name, category, estimated_shelf_life_days } = route.params.aiResult;
      const expiry = new Date();
      if (estimated_shelf_life_days) {
        expiry.setDate(expiry.getDate() + estimated_shelf_life_days);
      }
      setForm(prev => ({
        ...prev,
        name: name || prev.name,
        category: category || prev.category,
        expiry_date: expiry
      }));
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CustomButton
        title="Сканувати камерою (AI)"
        variant="outline"
        onPress={() => navigation.navigate('Camera')}
        style={styles.aiButton}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Назва продукту</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(val) => setForm({ ...form, name: val })}
          placeholder="Наприклад: Молоко"
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
          />
        </View>
        <View style={[styles.section, { flex: 3 }]}>
          <Text style={styles.label}>Одиниця</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.unit}
              onValueChange={(val) => setForm({ ...form, unit: val })}
            >
              {UNITS.map(u => <Picker.Item key={u} label={u} value={u} />)}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Категорія</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.category}
            onValueChange={(val) => setForm({ ...form, category: val })}
          >
            {CATEGORIES.map(c => <Picker.Item key={c} label={c} value={c} />)}
          </Picker>
        </View>
      </View>

      <DatePicker
        date={form.expiry_date}
        onDateChange={(date) => setForm({ ...form, expiry_date: date })}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Нотатки</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.notes}
          onChangeText={(val) => setForm({ ...form, notes: val })}
          placeholder="Наприклад: Зберігати в холодильнику..."
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  aiButton: { marginBottom: 24, borderStyle: 'dashed' },
  section: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16 },
  textArea: { minHeight: 80 },
  pickerContainer: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
  saveButton: { marginTop: 10 },
});