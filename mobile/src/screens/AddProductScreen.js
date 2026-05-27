import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Alert, Platform } from 'react-native';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import CustomPicker from '../components/CustomPicker';
import { CATEGORIES, UNITS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

export default function AddProductScreen({ navigation, route }) {
  const { addProduct } = useProductStore();
  const { colors: COLORS } = useThemeStore();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category: CATEGORIES[0],
    quantity: '1',
    unit: UNITS[0],
    expiry_date: new Date(),
    notes: '',
  });

  const styles = getStyles(COLORS);

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

  const unitItems = UNITS.map(u => ({ label: u, value: u }));
  const categoryItems = CATEGORIES.map(c => ({ label: c, value: c }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CustomButton
        title="Сканувати камерою (AI)"
        variant="outline"
        onPress={() => navigation.navigate('Camera')}
        style={styles.aiButton}
        icon={<Ionicons name="camera-outline" size={20} color={COLORS.primary} />}
      />

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
          selectedValue={form.category}
          onValueChange={(val) => setForm({ ...form, category: val })}
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
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  content: { 
    padding: 20,
    paddingBottom: 40,
  },
  aiButton: { 
    marginBottom: 24, 
    borderStyle: 'dashed',
    borderColor: COLORS.outline,
  },
  section: { 
    marginBottom: 20 
  },
  row: { 
    flexDirection: 'row' 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.text, 
    marginBottom: 8 
  },
  input: { 
    backgroundColor: COLORS.surfaceVariant, 
    borderWidth: 1, 
    borderColor: 'transparent', 
    borderRadius: 12, 
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: { 
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: { 
    marginTop: 20,
  },
});