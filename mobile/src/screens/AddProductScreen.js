import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, StyleSheet, Alert,
  Platform, TouchableOpacity, Image, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import CustomPicker from '../components/CustomPicker';
import { UNITS } from '../utils/constants';
import { useCategories } from '../hooks/useCategories';
import { productsAPI } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

export default function AddProductScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const { addProduct } = useProductStore();
  const { colors: COLORS, theme } = useThemeStore();
  const { categories, createCategory } = useCategories();
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const lang = i18n.language?.startsWith('uk') ? 'uk' : 'en';
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  const getInitialForm = () => ({
    name: '',
    category_id: null,
    quantity: '1',
    unit: UNITS[0],
    expiry_date: new Date(),
    notes: '',
    image_url: null,
    localImageUri: null,
    calories: '',
    proteins: '',
    fats: '',
    carbohydrates: '',
  });

  const [forms, setForms] = useState([getInitialForm()]);

  useEffect(() => {
    if (categories.length > 0) {
      setForms(prev => prev.map(f => f.category_id ? f : { ...f, category_id: categories[0].id }));
    }
  }, [categories]);

  const calculateCalories = (proteins, fats, carbohydrates) => {
    const p = parseFloat(proteins) || 0;
    const f = parseFloat(fats) || 0;
    const c = parseFloat(carbohydrates) || 0;

    const totalCalories = (p * 4) + (f * 9) + (c * 4);
    return totalCalories > 0 ? Math.round(totalCalories).toString() : '';
  };

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

      const p = data.proteins !== undefined && data.proteins !== null ? String(data.proteins) : '';
      const f = data.fats !== undefined && data.fats !== null ? String(data.fats) : '';
      const c = data.carbohydrates !== undefined && data.carbohydrates !== null ? String(data.carbohydrates) : '';

      newForms.push({
        name: data.name || '',
        category_id: catId,
        quantity: '1',
        unit: UNITS[0],
        expiry_date: expiry,
        notes: '',
        image_url: data.image_url || null,
        localImageUri: (i === 0 && imageUriFromCamera && !data.image_url) ? imageUriFromCamera : (data.image_url || null),
        calories: calculateCalories(p, f, c),
        proteins: p,
        fats: f,
        carbohydrates: c,
      });

      if (data.has_allergen) {
        Alert.alert(
          t('addProduct.attentionAllergenTitle'),
          t('addProduct.attentionAllergenMsg', { name: data.name })
        );
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

    if (['proteins', 'fats', 'carbohydrates'].includes(field)) {
       updatedForms[index].calories = calculateCalories(
           updatedForms[index].proteins,
           updatedForms[index].fats,
           updatedForms[index].carbohydrates
       );
    }

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
      if (!forms[i].name) return Alert.alert(t('common.error'), t('addProduct.nameRequired', { index: i + 1 }));
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
          expiry_date: form.expiry_date.toISOString().split('T')[0],
          calories: form.calories ? parseFloat(form.calories) : null,
          proteins: form.proteins ? parseFloat(form.proteins) : null,
          fats: form.fats ? parseFloat(form.fats) : null,
          carbohydrates: form.carbohydrates ? parseFloat(form.carbohydrates) : null,
        });

        if (res.success) savedCount++;
      }

      setLoading(false);

      if (savedCount === forms.length) {
        navigation.goBack();
      } else {
        Alert.alert(t('common.error'), t('addProduct.savePartialError'));
      }
    } catch (e) {
      setLoading(false);
      Alert.alert(t('common.error'), t('addProduct.saveError'));
    }
  };

  const unitItems = UNITS.map(u => ({
    label: t(`units.${u}`, { defaultValue: u }),
    value: u
  }));
  const categoryItems = categories.map(c => ({ label: getTranslatedCategoryName(c.name, t), value: c.id }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 10);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.addProduct', 'Додати продукт')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{t('addProduct.addWithAI')}</Text>
        <View style={styles.scanRow}>
          <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'product', lang })} activeOpacity={0.8}>
            <Ionicons name="camera" size={26} color={COLORS.primary} />
            <Text style={styles.scanBtnText}>{t('addProduct.photo')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'barcode', lang })} activeOpacity={0.8}>
            <Ionicons name="barcode" size={26} color={COLORS.primary} />
            <Text style={styles.scanBtnText}>{t('addProduct.barcode')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Camera', { mode: 'receipt', lang })} activeOpacity={0.8}>
            <Ionicons name="receipt" size={26} color={COLORS.primary} />
            <Text style={styles.scanBtnText}>{t('addProduct.receipt')}</Text>
          </TouchableOpacity>
        </View>

        {forms.map((form, index) => (
          <View key={index} style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{t('addProduct.productIndex', { index: index + 1 })}</Text>
              {forms.length > 1 && (
                <TouchableOpacity onPress={() => removeForm(index)} style={styles.deleteFormBtn}>
                  <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.imageSection}>
              <TouchableOpacity style={styles.imagePlaceholder} onPress={() => pickImage(index)} activeOpacity={0.8}>
                {form.localImageUri ? (
                  <Image source={{ uri: form.localImageUri }} style={styles.productImage} />
                ) : (
                  <View style={styles.imagePlaceholderInner}>
                    <Ionicons name="image-outline" size={32} color={COLORS.primary} />
                    <Text style={styles.imageText}>{t('addProduct.addPhoto')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('productDetail.nameLabel')}</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(val) => updateForm(index, 'name', val)}
                placeholder={t('productDetail.namePlaceholder')}
                placeholderTextColor={COLORS.onSurfaceVariant}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.label}>{t('productDetail.qtyLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={form.quantity}
                  onChangeText={(val) => updateForm(index, 'quantity', val)}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                />
              </View>
              <View style={[styles.section, { flex: 1.5 }]}>
                <CustomPicker
                  label={t('productDetail.unitLabel')}
                  items={unitItems}
                  selectedValue={form.unit}
                  onValueChange={(val) => updateForm(index, 'unit', val)}
                />
              </View>
            </View>

            <View style={styles.section}>
              <CustomPicker
                label={t('productDetail.categoryLabel')}
                items={categoryItems}
                selectedValue={form.category_id}
                onValueChange={(val) => updateForm(index, 'category_id', val)}
              />
            </View>

            <View style={styles.section}>
              <DatePicker
                label={t('addProduct.expiryLabel', 'Термін придатності')}
                date={form.expiry_date}
                onDateChange={(date) => updateForm(index, 'expiry_date', date)}
                minimumDate={today}
                maximumDate={maxDate}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('addProduct.macrosLabel')}</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroInputContainer}>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    value={form.proteins}
                    onChangeText={(val) => updateForm(index, 'proteins', val)}
                    placeholder={t('addProduct.proteins')}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                </View>
                <View style={styles.macroInputContainer}>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    value={form.fats}
                    onChangeText={(val) => updateForm(index, 'fats', val)}
                    placeholder={t('addProduct.fats')}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                </View>
                <View style={styles.macroInputContainer}>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    value={form.carbohydrates}
                    onChangeText={(val) => updateForm(index, 'carbohydrates', val)}
                    placeholder={t('addProduct.carbs')}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                </View>
                <View style={styles.macroInputContainer}>
                  <TextInput
                    style={[styles.input, styles.macroInput, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', opacity: 0.8 }]}
                    value={form.calories}
                    placeholder={t('addProduct.calories')}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                    editable={false}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('addProduct.notesOptional')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.notes}
                onChangeText={(val) => updateForm(index, 'notes', val)}
                placeholder={t('addProduct.notesPlaceholder2')}
                placeholderTextColor={COLORS.onSurfaceVariant}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addMoreBtn} onPress={addEmptyForm} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          <Text style={styles.addMoreText}>{t('addProduct.addMore')}</Text>
        </TouchableOpacity>

        <CustomButton
          title={`${t('common.save')} (${forms.length})`}
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
}

const getStyles = (COLORS, isDark, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
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
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  backButton: {
      marginTop: 16,
      marginBottom: 12,
      alignSelf: 'flex-start',
  },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4
  },

  // ─── Scan Row ──────────────────────────────────────────────────────────────
  scanRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, gap: 12 },
  scanBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryContainer,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.15 : 0.05,
    shadowRadius: 4
  },
  scanBtnText: { marginTop: 8, fontSize: 13, fontWeight: '700', color: COLORS.onPrimaryContainer },

  // ─── Form Card ─────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 6
  },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  deleteFormBtn: { padding: 6, backgroundColor: COLORS.errorContainer || '#FF3B3012', borderRadius: 12 },

  // ─── Image Picker ──────────────────────────────────────────────────────────
  imageSection: { marginBottom: 24 },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}40`,
    borderStyle: 'dashed'
  },
  imagePlaceholderInner: { alignItems: 'center', justifyContent: 'center' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // ─── Inputs & Sections ─────────────────────────────────────────────────────
  section: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: COLORS.text
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    textAlignVertical: 'top'
  },

  // ─── Macros Row ────────────────────────────────────────────────────────────
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  macroInputContainer: { flex: 1 },
  macroInput: { paddingHorizontal: 4, textAlign: 'center', fontSize: 15, fontWeight: '500' },

  // ─── Buttons ───────────────────────────────────────────────────────────────
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primaryContainer,
    marginBottom: 24,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.15 : 0.05,
    shadowRadius: 4
  },
  addMoreText: { fontSize: 16, fontWeight: '700', color: COLORS.onPrimaryContainer },

  saveButton: {
    height: 52,
    borderRadius: 16,
    marginBottom: 20
  },
});