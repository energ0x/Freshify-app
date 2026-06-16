/**
 * @file ProductDetailScreen.js
 * @description Detailed view screen for a specific food product.
 * Displays expiration alerts, notes, and quantities.
 * Enables editing details, consuming a specific amount, or deleting the item.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, Modal,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Image, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useProductStore from '../store/productStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import { API_URL } from '../utils/constants';
import { getExpiryLabel, getExpiryColor, formatDate } from '../utils/dateHelpers';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

/**
 * ProductDetailScreen Component.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.route - Route holding targeted productId param.
 * @param {Object} props.navigation - Navigation handler.
 */
export default function ProductDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { productId } = route.params;

  // Retrieve products list and operation functions from Zustand store
  const { products, deleteProduct, consumeProduct } = useProductStore();

  // Retrieve theme parameters
  const { colors: COLORS, theme } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  
  // Find targeted product details from active store lists
  const product = products.find(p => p.id === productId);

  // Consume dialog overlay states
  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [consumeAmount, setConsumeAmount] = useState('');

  // Fallback screen configuration if the targeted product is not found
  if (!product) {
    const styles = getStyles(COLORS, insets, null, isDark);
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('productDetail.title', 'Деталі продукту')}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>{t('productDetail.notFound')}</Text>
        </View>
      </View>
    );
  }

  // Calculate dynamic colors based on date urgency limits
  const expiryColor = getExpiryColor(product.expiry_date, COLORS);
  const styles = getStyles(COLORS, insets, expiryColor, isDark);

  /**
   * Prompts user with delete confirmation warning alert.
   * On confirmation, deletes the item and routes back to inventory list.
   */
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

  /**
   * Opens the consume modal dialog.
   * Auto-populates standard values (defaults to 1 or total remaining quantity).
   */
  const openConsumeModal = () => {
    const defaultAmount = product.quantity >= 1 ? '1' : product.quantity.toString();
    setConsumeAmount(defaultAmount);
    setConsumeModalVisible(true);
  };

  /**
   * Submits chosen consumption quantities.
   * Verifies remaining stock availability and redirects to list if fully consumed.
   */
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
      // Route user back if no stock is left
      if (product.quantity - amount <= 0) {
        navigation.goBack();
      }
    } else {
      Alert.alert(t('common.error'), res.error);
    }
  };

  const categoryName = getTranslatedCategoryName(product.category_obj?.name, t);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* Screen Title Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('productDetail.title', 'Деталі продукту')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Display product photo if available */}
          {product.image_url && (
            <Image
               source={{ uri: product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}` }}
               style={styles.detailImage}
            />
          )}

          {/* Name and CategoryBadge row */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.name}>{product.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.category}>{categoryName || t('productDetail.noCategory')}</Text>
              </View>
            </View>
            
            {/* Edit button */}
            <TouchableOpacity onPress={() => navigation.navigate('EditProduct', { productId: product.id })} style={styles.editIconBtn} activeOpacity={0.8}>
              <Ionicons name="pencil" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Information widgets grid (quantity vs expiry alerts) */}
          <View style={styles.infoGrid}>
             <View style={styles.infoCard}>
                <Ionicons name="scale" size={32} color={COLORS.primary} />
                <Text style={styles.infoCardLabel}>{t('productDetail.quantity')}</Text>
                <Text style={styles.infoCardValue}>{product.quantity} <Text style={styles.infoCardUnit}>{product.unit}</Text></Text>
             </View>

             <View style={[styles.infoCard, { backgroundColor: `${expiryColor}15` }]}>
                <Ionicons name="calendar" size={32} color={expiryColor} />
                <Text style={styles.infoCardLabel}>{t('productDetail.expires')}</Text>
                <Text style={[styles.infoCardValue, { color: expiryColor }]}>{formatDate(product.expiry_date)}</Text>
                <Text style={[styles.expiryLabel, { color: expiryColor }]}>{getExpiryLabel(product.expiry_date)}</Text>
             </View>
          </View>

          {/* Render notes if added */}
          {product.notes ? (
            <View style={styles.notesContainer}>
              <View style={styles.notesHeader}>
                 <Ionicons name="document-text" size={20} color={COLORS.onSurfaceVariant} />
                 <Text style={styles.notesTitle}>{t('productDetail.notes')}</Text>
              </View>
              <Text style={styles.notesText}>{product.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Action button triggers */}
        <View style={styles.actions}>
          <CustomButton
            title={t('productDetail.consumeBtn')}
            onPress={openConsumeModal}
            loading={loading}
            style={styles.actionBtn}
            icon={<Ionicons name="restaurant" size={22} color={COLORS.onPrimary} />}
          />
          <CustomButton
            title={t('productDetail.deleteBtn')}
            variant="outline"
            onPress={handleDelete}
            disabled={loading}
            style={styles.deleteButton}
            textStyle={{ color: COLORS.danger ?? '#FF3B30' }}
            icon={<Ionicons name="trash" size={22} color={COLORS.danger ?? '#FF3B30'} />}
          />
        </View>
      </ScrollView>

      {/* Consume Modal overlay configuration */}
      <Modal visible={consumeModalVisible} animationType="fade" transparent={true} onRequestClose={() => setConsumeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.consumeModalOverlay}>
          <View style={styles.consumeModalContent}>
            <Text style={styles.consumeModalTitle}>{t('home.consumeTitle')}</Text>
            <Text style={styles.consumeSubtitle}>
              {product.name} ({t('home.consumeAvailable', { quantity: product.quantity, unit: product.unit })})
            </Text>

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
    </View>
  );
}

/**
 * Creates dynamic styles using active theme tokens, notch inserts, and navigation heights.
 */
const getStyles = (COLORS, insets, expiryColor, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notFoundText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ─── Header Styling ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: insets.top + 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    letterSpacing: 0.5,
  },
  backButton: {
  },

  // ─── Content Styling ───────────────────────────────────────────────────────
  content: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: (insets?.bottom || 20) + 40
  },

  // ─── Main Card Styling ─────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 8,
  },
  detailImage: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    marginBottom: 20,
    resizeMode: 'cover'
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  category: {
    fontSize: 13,
    color: COLORS.onPrimaryContainer,
    fontWeight: '700'
  },
  editIconBtn: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Info Grid Styling ─────────────────────────────────────────────────────
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceVariant,
    padding: 20,
    borderRadius: 20,
    alignItems: 'flex-start'
  },
  infoCardLabel: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4
  },
  infoCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text
  },
  infoCardUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant
  },
  expiryLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },

  // ─── Notes Styling ─────────────────────────────────────────────────────────
  notesContainer: {
    backgroundColor: COLORS.surfaceVariant,
    padding: 20,
    borderRadius: 20
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  notesText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    fontWeight: '500'
  },

  // ─── Actions Styling ───────────────────────────────────────────────────────
  actions: {
    gap: 16
  },
  actionBtn: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.1,
    shadowRadius: 4,
  },
  deleteButton: {
    borderRadius: 16,
    borderColor: COLORS.danger ?? '#FF3B30',
    borderWidth: 1.5
  },

  // ─── Consume Modal Styling ─────────────────────────────────────────────────
  consumeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consumeModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  consumeModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  consumeSubtitle: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500'
  },
  consumeInput: {
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    borderRadius: 16,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  consumeModalActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 16
  },
});