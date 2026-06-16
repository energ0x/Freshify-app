import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, StyleSheet, Alert,
  Platform, TouchableOpacity, Image, KeyboardAvoidingView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import CustomPicker from '../components/CustomPicker';
import { UNITS, API_URL } from '../utils/constants';
import { useCategories } from '../hooks/useCategories';
import { productsAPI } from '../services/api';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

export default function EditProductScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { productId } = route.params;
  const { products, updateProduct } = useProductStore();
  const { colors: COLORS, theme } = useThemeStore();
  const { categories } = useCategories();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const isDark = theme === 'dark';

  const product = products.find(p => p.id === productId);

  const [form, setForm] = useState({
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

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        category_id: product.category_id || (categories.length > 0 ? categories[0].id : null),
        quantity: product.quantity ? product.quantity.toString() : '1',
        unit: product.unit || UNITS[0],
        expiry_date: product.expiry_date ? new Date(product.expiry_date) : new Date(),
        notes: product.notes || '',
        image_url: product.image_url || null,
        localImageUri: product.image_url ? (product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`) : null,
        calories: product.calories !== null && product.calories !== undefined ? product.calories.toString() : '',
        proteins: product.proteins !== null && product.proteins !== undefined ? product.proteins.toString() : '',
        fats: product.fats !== null && product.fats !== undefined ? product.fats.toString() : '',
        carbohydrates: product.carbohydrates !== null && product.carbohydrates !== undefined ? product.carbohydrates.toString() : '',
      });
    }
  }, [product, categories]);

  const calculateCalories = (proteins, fats, carbohydrates) => {
    const p = parseFloat(proteins) || 0;
    const f = parseFloat(fats) || 0;
    const c = parseFloat(carbohydrates) || 0;
    const totalCalories = (p * 4) + (f * 9) + (c * 4);
    return totalCalories > 0 ? Math.round(totalCalories).toString() : '';
  };

  const updateForm = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (['proteins', 'fats', 'carbohydrates'].includes(field)) {
        updated.calories = calculateCalories(updated.proteins, updated.fats, updated.carbohydrates);
      }
      return updated;
    });
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      updateForm('localImageUri', result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!form.name) return Alert.alert(t('common.error'), t('productDetail.nameRequired'));

    setLoading(true);

    try {
      let finalImageUrl = form.image_url;

      if (form.localImageUri && !form.localImageUri.startsWith('http') && form.localImageUri !== `${API_URL}${form.image_url}`) {
        const uploadRes = await productsAPI.uploadImage(form.localImageUri);
        finalImageUrl = uploadRes.data.image_url;
      }

      const updateData = {
        name: form.name,
        category_id: form.category_id,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        expiry_date: form.expiry_date.toISOString().split('T')[0],
        notes: form.notes,
        image_url: finalImageUrl,
        calories: form.calories ? parseFloat(form.calories) : null,
        proteins: form.proteins ? parseFloat(form.proteins) : null,
        fats: form.fats ? parseFloat(form.fats) : null,
        carbohydrates: form.carbohydrates ? parseFloat(form.carbohydrates) : null,
      };

      const res = await updateProduct(productId, updateData);
      setLoading(false);

      if (res.success) {
        navigation.goBack();
      } else {
        Alert.alert(t('common.error'), res.error || t('productDetail.updateError'));
      }
    } catch (e) {
      setLoading(false);
      Alert.alert(t('common.error'), t('productDetail.updateError'));
    }
  };

  const unitItems = UNITS.map(u => ({ label: t(`units.${u}`, { defaultValue: u }), value: u }));
  const categoryItems = categories.map(c => ({ label: getTranslatedCategoryName(c.name, t), value: c.id }));

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 10);

  const styles = getStyles(COLORS, insets, isDark);

  if (!product) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="close-outline" size={32} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.editProduct', 'Редагувати')}</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <View style={styles.imageSection}>
              <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} activeOpacity={0.8}>
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
                onChangeText={(val) => updateForm('name', val)}
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
                  onChangeText={(val) => updateForm('quantity', val)}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                />
              </View>
              <View style={[styles.section, { flex: 1.5 }]}>
                <CustomPicker
                  label={t('productDetail.unitLabel')}
                  items={unitItems}
                  selectedValue={form.unit}
                  onValueChange={(val) => updateForm('unit', val)}
                />
              </View>
            </View>

            <View style={styles.section}>
              <CustomPicker
                label={t('productDetail.categoryLabel')}
                items={categoryItems}
                selectedValue={form.category_id}
                onValueChange={(val) => updateForm('category_id', val)}
              />
            </View>

            <View style={styles.section}>
              <DatePicker
                label={t('addProduct.expiryLabel', 'Термін придатності')}
                date={form.expiry_date}
                onDateChange={(date) => updateForm('expiry_date', date)}
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
                    onChangeText={(val) => updateForm('proteins', val)}
                    placeholder={t('addProduct.proteins')}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                </View>
                <View style={styles.macroInputContainer}>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    value={form.fats}
                    onChangeText={(val) => updateForm('fats', val)}
                    placeholder={t('addProduct.fats')}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                </View>
                <View style={styles.macroInputContainer}>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    value={form.carbohydrates}
                    onChangeText={(val) => updateForm('carbohydrates', val)}
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
                onChangeText={(val) => updateForm('notes', val)}
                placeholder={t('addProduct.notesPlaceholder2')}
                placeholderTextColor={COLORS.onSurfaceVariant}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <CustomButton
            title={t('common.save')}
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (COLORS, insets, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center title
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  backButton: {
    position: 'absolute',
    left: 10,
    top: 10,
    padding: 8,
  },

  // ─── Content ───────────────────────────────────────────────────────────────
  content: {
    padding: 20,
    paddingBottom: 20,
  },

  // ─── Form Card ─────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 6
  },

  // ─── Image Picker ──────────────────────────────────────────────────────────
  imageSection: {
    marginBottom: 24,
    alignItems: 'center'
  },
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
  imagePlaceholderInner: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  imageText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary
  },

  // ─── Inputs & Sections ─────────────────────────────────────────────────────
  section: { marginBottom: 20 },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4
  },
  input: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    textAlignVertical: 'top'
  },

  // ─── Macros Row ────────────────────────────────────────────────────────────
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  macroInputContainer: {
    flex: 1
  },
  macroInput: {
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500'
  },

  // ─── Footer & Button ───────────────────────────────────────────────────────
  footer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: insets.bottom || 20,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
  },
});