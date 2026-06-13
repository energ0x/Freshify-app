import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import CustomPicker from '../components/CustomPicker';
import { UNITS, API_URL } from '../utils/constants';
import { getExpiryLabel, getExpiryColor, formatDate } from '../utils/dateHelpers';
import { useCategories } from '../hooks/useCategories';
import * as ImagePicker from 'expo-image-picker';
import { productsAPI } from '../services/api';

export default function ProductDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { productId } = route.params;
  const { products, deleteProduct, consumeProduct, updateProduct } = useProductStore();
  const { colors: COLORS } = useThemeStore();
  const { categories } = useCategories();
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localImageUri, setLocalImageUri] = useState(null);
  const insets = useSafeAreaInsets();

  const product = products.find(p => p.id === productId);

  const [editForm, setEditForm] = useState({
    name: '',
    category_id: null,
    quantity: '1',
    unit: UNITS[0],
    expiry_date: new Date(),
    notes: '',
    image_url: null,
  });

  useEffect(() => {
    if (product) {
      setEditForm({
        name: product.name || '',
        category_id: product.category_id || (categories.length > 0 ? categories[0].id : null),
        quantity: product.quantity ? product.quantity.toString() : '1',
        unit: product.unit || UNITS[0],
        expiry_date: product.expiry_date ? new Date(product.expiry_date) : new Date(),
        notes: product.notes || '',
        image_url: product.image_url || null,
      });
      setLocalImageUri(product.image_url ? (product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`) : null);
    }
  }, [product, categories]);

  if (!product) {
    const styles = getStyles(COLORS, insets);
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.text }}>{t('productDetail.notFound')}</Text>
      </View>
    );
  }

  const expiryColor = getExpiryColor(product.expiry_date, COLORS);
  const styles = getStyles(COLORS, insets, expiryColor);

  const handleDelete = () => {
    Alert.alert(t('productDetail.deleteConfirmTitle'), t('productDetail.deleteConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('productDetail.deleteBtn'),
        style: 'destructive',
        onPress: async () => {
          const res = await deleteProduct(product.id);
          if (res.success) navigation.goBack();
          else Alert.alert(t('common.error'), res.error);
        }
      }
    ]);
  };

  const handleConsume = async () => {
    const amountToConsume = product.quantity >= 1 ? 1 : product.quantity;

    Alert.alert(t('productDetail.consumeConfirmTitle'), t('productDetail.consumeConfirmMsg', { amount: amountToConsume, unit: product.unit }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.yes'),
        onPress: async () => {
          setLoading(true);
          const res = await consumeProduct(product.id, amountToConsume);
          setLoading(false);

          if (res.success) {
            Alert.alert(t('common.success'), t('productDetail.consumeSuccessMsg'));
            if (product.quantity - amountToConsume <= 0) {
              navigation.goBack();
            }
          } else {
            Alert.alert(t('common.error'), res.error);
          }
        }
      }
    ]);
  };
  
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name) return Alert.alert(t('common.error'), t('productDetail.nameRequired'));

    setSaving(true);
    let finalImageUrl = editForm.image_url;
    
    try {
      if (localImageUri && localImageUri !== (product.image_url?.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`)) {
        if (!localImageUri.startsWith('http') || localImageUri.startsWith('file://')) {
          const uploadRes = await productsAPI.uploadImage(localImageUri);
          finalImageUrl = uploadRes.data.image_url;
        }
      }

      const updateData = {
        name: editForm.name,
        category_id: editForm.category_id,
        quantity: parseFloat(editForm.quantity),
        unit: editForm.unit,
        expiry_date: editForm.expiry_date.toISOString().split('T')[0],
        notes: editForm.notes,
        image_url: finalImageUrl,
      };

      const res = await updateProduct(product.id, updateData);
      setSaving(false);

      if (res.success) {
        setEditModalVisible(false);
      } else {
        Alert.alert(t('common.error'), res.error || t('productDetail.updateError'));
      }
    } catch (e) {
      setSaving(false);
      Alert.alert(t('common.error'), 'Failed to save changes.');
    }
  };

  const unitItems = UNITS.map(u => ({ label: u, value: u }));
  const categoryItems = categories.map(c => ({ label: c.name, value: c.id }));
  
  const categoryName = product.category_obj?.name;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {product.image_url && (
            <Image 
               source={{ uri: product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}` }} 
               style={styles.detailImage} 
            />
          )}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{product.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.category}>{categoryName || t('productDetail.noCategory')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.editIconBtn}>
              <Ionicons name="pencil" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoGrid}>
             <View style={styles.infoCard}>
                <Ionicons name="scale-outline" size={28} color={COLORS.primary} />
                <Text style={styles.infoCardLabel}>{t('productDetail.quantity')}</Text>
                <Text style={styles.infoCardValue}>{product.quantity} {product.unit}</Text>
             </View>
             
             <View style={[styles.infoCard, { backgroundColor: `${expiryColor}15` }]}>
                <Ionicons name="calendar-outline" size={28} color={expiryColor} />
                <Text style={styles.infoCardLabel}>{t('productDetail.expires')}</Text>
                <Text style={[styles.infoCardValue, { color: expiryColor }]}>{formatDate(product.expiry_date)}</Text>
                <Text style={[styles.expiryLabel, { color: expiryColor }]}>{getExpiryLabel(product.expiry_date)}</Text>
             </View>
          </View>

          {product.notes ? (
            <View style={styles.notesContainer}>
              <View style={styles.notesHeader}>
                 <Ionicons name="document-text" size={20} color={COLORS.primary} />
                 <Text style={styles.notesTitle}>{t('productDetail.notes')}</Text>
              </View>
              <Text style={styles.notesText}>{product.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <CustomButton
            title={t('productDetail.consumeBtn')}
            onPress={handleConsume}
            loading={loading}
            style={styles.consumeButton}
            icon={<Ionicons name="restaurant-outline" size={20} color={COLORS.onPrimary} />}
          />
          <CustomButton
            title={t('productDetail.deleteBtn')}
            variant="outline"
            onPress={handleDelete}
            disabled={loading}
            style={styles.deleteButton}
            textStyle={{ color: COLORS.danger }}
            icon={<Ionicons name="trash-outline" size={20} color={COLORS.danger} />}
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
                <Text style={styles.modalTitle}>{t('productDetail.editTitle')}</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close-circle" size={32} color={COLORS.outline} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                
                <View style={styles.imageSection}>
                  <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
                    {localImageUri ? (
                      <Image source={{ uri: localImageUri }} style={styles.productImage} />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={40} color={COLORS.onSurfaceVariant} />
                        <Text style={styles.imageText}>Додати фото продукту</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('productDetail.nameLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.name}
                    onChangeText={(val) => setEditForm(prev => ({ ...prev, name: val }))}
                    placeholder={t('productDetail.namePlaceholder')}
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.formGroup, { flex: 2, marginRight: 10 }]}>
                    <Text style={styles.formLabel}>{t('productDetail.qtyLabel')}</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.quantity}
                      onChangeText={(val) => setEditForm(prev => ({ ...prev, quantity: val }))}
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.onSurfaceVariant}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 3 }]}>
                    <CustomPicker
                      label={t('productDetail.unitLabel')}
                      items={unitItems}
                      selectedValue={editForm.unit}
                      onValueChange={(val) => setEditForm(prev => ({ ...prev, unit: val }))}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <CustomPicker
                    label={t('productDetail.categoryLabel')}
                    items={categoryItems}
                    selectedValue={editForm.category_id}
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, category_id: val }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <DatePicker
                    date={editForm.expiry_date}
                    onDateChange={(date) => setEditForm(prev => ({ ...prev, expiry_date: date }))}
                  />
                </View>
                
                <View style={[styles.formGroup, {marginBottom: 30}]}>
                  <Text style={styles.formLabel}>{t('productDetail.notesLabel')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editForm.notes}
                    onChangeText={(val) => setEditForm(prev => ({ ...prev, notes: val }))}
                    placeholder={t('productDetail.notesPlaceholder')}
                    placeholderTextColor={COLORS.onSurfaceVariant}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

              </ScrollView>

              <View style={styles.modalActions}>
                <CustomButton
                  title={t('common.cancel')}
                  variant="outline"
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalButton}
                  disabled={saving}
                />
                <CustomButton
                  title={t('common.save')}
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

const getStyles = (COLORS, insets, expiryColor) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: insets?.bottom + 40 || 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, overflow: 'hidden' },
  detailImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 20, resizeMode: 'cover' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  name: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  categoryBadge: { backgroundColor: COLORS.primaryContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, alignSelf: 'flex-start' },
  category: { fontSize: 14, color: COLORS.onPrimaryContainer, fontWeight: '600' },
  editIconBtn: { padding: 12, backgroundColor: COLORS.surfaceVariant, borderRadius: 16 },
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  infoCard: { flex: 1, backgroundColor: COLORS.surfaceVariant, padding: 16, borderRadius: 16, alignItems: 'flex-start' },
  infoCardLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 8, marginBottom: 4 },
  infoCardValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  expiryLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  notesContainer: { backgroundColor: COLORS.background, padding: 16, borderRadius: 16 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  notesTitle: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginLeft: 8 },
  notesText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  actions: { gap: 16 },
  consumeButton: { backgroundColor: COLORS.primary },
  deleteButton: { borderColor: COLORS.danger, borderWidth: 1 },
  modalContainer: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets?.bottom ? insets.bottom + 30 : 30, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  modalForm: { paddingHorizontal: 24, paddingTop: 8 },
  imageSection: { marginBottom: 20, alignItems: 'center' },
  imagePlaceholder: { width: '100%', height: 150, backgroundColor: COLORS.surfaceVariant, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: `${COLORS.primary}20`, borderStyle: 'dashed' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageText: { marginTop: 8, fontSize: 14, color: COLORS.onSurfaceVariant },
  formGroup: { marginBottom: 20 },
  row: { flexDirection: 'row' },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.surfaceVariant, borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 16, color: COLORS.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  modalButton: { flex: 1 },
});