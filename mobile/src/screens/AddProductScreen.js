import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Alert, Platform, TouchableOpacity, Image } from 'react-native';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import CustomPicker from '../components/CustomPicker';
import { UNITS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '../hooks/useCategories';
import { productsAPI } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

export default function AddProductScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { addProduct } = useProductStore();
  const { colors: COLORS } = useThemeStore();
  const { categories, createCategory } = useCategories();
  const [loading, setLoading] = useState(false);

  const getInitialForm = () => ({
    name: '',
    category_id: null,
    quantity: '1',
    unit: UNITS[0],
    expiry_date: new Date(),
    notes: '',
    image_url: null,
    localImageUri: null,
  });

  const [forms, setForms] = useState([getInitialForm()]);

  const styles = getStyles(COLORS);

  // Update header title dynamically when language changes
  useEffect(() => {
    navigation.setOptions({ title: t('addProduct.screenTitle') });
  }, [navigation, t]);

  useEffect(() => {
    if (categories.length > 0) {
      setForms(prev => prev.map(f => f.category_id ? f : { ...f, category_id: categories[0].id }));
    }
  }, [categories]);

  const processAiResultList = async (dataList, imageUriFromCamera) => {
    const newForms = [];
    
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      const expiry = new Date();
      if (data.estimated_shelf_life_days) {
        expiry.setDate(expiry.getDate() + data.estimated_shelf_life_days);
      }
      
      let catId = data.category_id || (categories.length > 0 ? categories[0].id : null);
      if (data.category_suggestion && !catId) {
        try {
          const newCat = await createCategory({ name: data.category_suggestion });
          catId = newCat.id;
        } catch (e) {}
      }

      newForms.push({
        name: data.name || '',
        category_id: catId,
        quantity: '1',
        unit: UNITS[0],
        expiry_date: expiry,
        notes: '',
        image_url: data.image_url || null,
        localImageUri: (i === 0 && imageUriFromCamera && !data.image_url) ? imageUriFromCamera : (data.image_url || null),
      });

      if (data.has_allergen) {
        Alert.alert('Увага, алерген!', `Продукт "${data.name}" може містити алерген!`);
      }
    }
    
    if (newForms.length > 0) {
      setForms(newForms);
    }
  };

  useEffect(() => {
    if (route.params?.aiResult) {
      const data = route.params.aiResult;
      let dataList = [];
      
      if (data.products && Array.isArray(data.products)) {
        dataList = data.products;
      } else if (Array.isArray(data)) {
        dataList = data;
      } else {
        dataList = [data];
      }
      
      processAiResultList(dataList, route.params.imageUri);
    }
  }, [route.params?.aiResult]);

  const pickImage = async (index) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      const updatedForms = [...forms];
      updatedForms[index].localImageUri = result.assets[0].uri;
      setForms(updatedForms);
    }
  };

  const updateForm = (index, field, value) => {
    const updatedForms = [...forms];
    updatedForms[index][field] = value;
    setForms(updatedForms);
  };

  const removeForm = (index) => {
    if (forms.length > 1) {
      setForms(forms.filter((_, i) => i !== index));
    }
  };

  const addEmptyForm = () => {
    setForms([...forms, { ...getInitialForm(), category_id: categories.length > 0 ? categories[0].id : null }]);
  };

  const handleSave = async () => {
    for (let i = 0; i < forms.length; i++) {
      if (!forms[i].name) return Alert.alert('Помилка', `Введіть назву для продукту #${i + 1}`);
    }

    setLoading(true);
    
    try {
      let savedCount = 0;
      for (const form of forms) {
        let finalImageUrl = form.image_url;

        if (form.localImageUri && !form.localImageUri.startsWith('http')) {
          const uploadRes = await productsAPI.uploadImage(form.localImageUri);
          finalImageUrl = uploadRes.data.image_url;
        }

        const res = await addProduct({
          ...form,
          image_url: finalImageUrl,
          quantity: parseFloat(form.quantity),
          expiry_date: form.expiry_date.toISOString().split('T')[0]
        });

        if (res.success) savedCount++;
      }

      setLoading(false);

      if (savedCount === forms.length) {
        navigation.goBack();
      } else {
        Alert.alert('Помилка', 'Деякі продукти не вдалося зберегти.');
      }
    } catch (e) {
      setLoading(false);
      Alert.alert('Помилка', 'Не вдалося зберегти продукти.');
    }
  };

  // Dynamically map unit text to localizations (e.g., 'шт' -> 'pcs')
  const unitItems = UNITS.map(u => ({ 
    label: t(`units.${u}`, { defaultValue: u }), 
    value: u 
  }));
  const categoryItems = categories.map(c => ({ label: c.name, value: c.id }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      <Text style={styles.scanLabel}>Додати за допомогою ШІ / Штрихкоду</Text>
      <View style={styles.scanRow}>
        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'product' })} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
          <Text style={styles.scanBtnText}>{t('addProduct.photo')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'barcode' })} activeOpacity={0.7}>
          <Ionicons name="barcode-outline" size={28} color={COLORS.primary} />
          <Text style={styles.scanBtnText}>{t('addProduct.barcode')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'receipt' })} activeOpacity={0.7}>
          <Ionicons name="receipt-outline" size={28} color={COLORS.primary} />
          <Text style={styles.scanBtnText}>{t('addProduct.receipt')}</Text>
        </TouchableOpacity>
      </View>

      {forms.map((form, index) => (
        <View key={index} style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Продукт {index + 1}</Text>
            {forms.length > 1 && (
              <TouchableOpacity onPress={() => removeForm(index)}>
                <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imagePlaceholder} onPress={() => pickImage(index)}>
              {form.localImageUri ? (
                <Image source={{ uri: form.localImageUri }} style={styles.productImage} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={40} color={COLORS.onSurfaceVariant} />
                  <Text style={styles.imageText}>Додати фото продукту</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Назва продукту</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(val) => updateForm(index, 'name', val)}
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
                onChangeText={(val) => updateForm(index, 'quantity', val)}
                keyboardType="numeric"
                placeholderTextColor={COLORS.onSurfaceVariant}
              />
            </View>
            <View style={[styles.section, { flex: 3 }]}>
              <CustomPicker
                label="Одиниця"
                items={unitItems}
                selectedValue={form.unit}
                onValueChange={(val) => updateForm(index, 'unit', val)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <CustomPicker
              label="Категорія"
              items={categoryItems}
              selectedValue={form.category_id}
              onValueChange={(val) => updateForm(index, 'category_id', val)}
            />
          </View>

          <View style={styles.section}>
            <DatePicker
              date={form.expiry_date}
              onDateChange={(date) => updateForm(index, 'expiry_date', date)}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Нотатки (опціонально)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.notes}
              onChangeText={(val) => updateForm(index, 'notes', val)}
              placeholder="Наприклад: Зберігати в холодильнику..."
              placeholderTextColor={COLORS.onSurfaceVariant}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addMoreBtn} onPress={addEmptyForm}>
        <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        <Text style={[styles.addMoreText, { color: COLORS.primary }]}>Додати ще один продукт</Text>
      </TouchableOpacity>

      <CustomButton
        title={`Зберегти (${forms.length})`}
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
  
  formCard: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 24, marginBottom: 24, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, marginBottom: 24 },
  addMoreText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },

  imageSection: { marginBottom: 20, alignItems: 'center' },
  imagePlaceholder: { width: '100%', height: 150, backgroundColor: COLORS.surfaceVariant, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: `${COLORS.primary}20`, borderStyle: 'dashed' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageText: { marginTop: 8, fontSize: 14, color: COLORS.onSurfaceVariant },

  section: { marginBottom: 20 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.surfaceVariant, borderWidth: 1, borderColor: 'transparent', borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 16, color: COLORS.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  saveButton: { marginTop: 10 },
});