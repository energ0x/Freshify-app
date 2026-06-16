import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import { API_URL } from '../utils/constants';
import { getExpiryLabel, getExpiryColor, formatDate } from '../utils/dateHelpers';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

export default function ProductDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { productId } = route.params;
  const { products, deleteProduct, consumeProduct } = useProductStore();
  const { colors: COLORS } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const product = products.find(p => p.id === productId);

  // State for Consume Modal
  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [consumeAmount, setConsumeAmount] = useState('');

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

  const openConsumeModal = () => {
    const defaultAmount = product.quantity >= 1 ? '1' : product.quantity.toString();
    setConsumeAmount(defaultAmount);
    setConsumeModalVisible(true);
  };

  const submitConsume = async () => {
    const amount = Number(consumeAmount.replace(',', '.'));
    if (!amount || isNaN(amount) || amount <= 0) {
      return Alert.alert(t('common.error'), t('home.invalidQty'));
    }
    if (amount > product.quantity) {
      return Alert.alert(t('common.attention'), t('home.qtyExceeds'));
    }

    setLoading(true);
    const res = await consumeProduct(product.id, amount);
    setLoading(false);

    if (res.success) {
      setConsumeModalVisible(false);
      Alert.alert(t('common.success'), t('productDetail.consumeSuccessMsg'));
      if (product.quantity - amount <= 0) {
        navigation.goBack();
      }
    } else {
      Alert.alert(t('common.error'), res.error);
    }
  };

  const categoryName = getTranslatedCategoryName(product.category_obj?.name, t);

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
            {/* Перехід до екрану EditProductScreen */}
            <TouchableOpacity onPress={() => navigation.navigate('EditProduct', { productId: product.id })} style={styles.editIconBtn}>
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
            onPress={openConsumeModal}
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

      {/* Consume Modal */}
      <Modal visible={consumeModalVisible} animationType="fade" transparent={true} onRequestClose={() => setConsumeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.consumeModalOverlay}>
          <View style={styles.consumeModalContent}>
            <Text style={styles.consumeModalTitle}>{t('home.consumeTitle')}</Text>
            <Text style={styles.consumeSubtitle}>{product.name} ({t('home.consumeAvailable', { quantity: product.quantity, unit: product.unit })})</Text>
            
            <TextInput
              style={styles.consumeInput}
              keyboardType="numeric"
              value={consumeAmount}
              onChangeText={setConsumeAmount}
              autoFocus
              placeholderTextColor={COLORS.onSurfaceVariant}
            />
            
            <View style={styles.consumeModalActionsRow}>
              <CustomButton title={t('common.cancel')} variant="outline" onPress={() => setConsumeModalVisible(false)} style={styles.modalButton} disabled={loading} />
              <CustomButton title={t('common.confirm', 'Підтвердити')} onPress={submitConsume} style={styles.modalButton} loading={loading} />
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

  // Consume Modal Styles
  consumeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumeModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: '92%',
    maxWidth: 380,
  },
  consumeModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  consumeSubtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    marginBottom: 16,
    textAlign: 'center',
  },
  consumeInput: {
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 16,
    padding: 16,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  consumeModalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: { flex: 1 },
});