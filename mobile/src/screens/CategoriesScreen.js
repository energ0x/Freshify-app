/**
 * @file CategoriesScreen.js
 * @description Screen for managing product categories. Allows users to view the list of existing categories,
 * add custom categories, delete unused ones, and restore default categories.
 * Validates whether categories are currently in use by active or consumed products before permitting deletion.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeStore from '../store/themeStore';
import useProductStore from '../store/productStore';
import { useCategories } from '../hooks/useCategories';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

/**
 * CategoriesScreen component.
 * Provides category management actions.
 * 
 * @param {object} props.navigation - React Navigation handle.
 */
export default function CategoriesScreen({ navigation }) {
  // Localization hook.
  const { t } = useTranslation();
  // Dynamic application styling.
  const { colors: COLORS, theme } = useThemeStore();
  // Safe area helper for dynamic status bars.
  const insets = useSafeAreaInsets();
  
  // Destructure categories, state, and operation endpoints from custom React hook.
  const { categories, loading, error, createCategory, deleteCategory, restoreDefaultCategories } = useCategories();
  // Component local state for typing a new category name.
  const [newCategoryName, setNewCategoryName] = useState('');

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  /**
   * Dispatches create request to the backend for a new custom category.
   * Clears text input upon success or alerts user of API error.
   */
  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      try {
        await createCategory({ name: trimmed });
        setNewCategoryName('');
      } catch (e) {
        const detail = e.response?.data?.detail || t('errors.createCategory');
        Alert.alert(t('common.error'), detail);
      }
    }
  };

  /**
   * Handles deletion of a category.
   * Performs validation against the product store state:
   * Checks both active products and consumed history. If the category ID matches any product,
   * deletion is disallowed. Otherwise, prompts user with confirmation before API call.
   * 
   * @param {string|number} id - Target category ID to delete.
   */
  const handleDeleteCategory = async (id) => {
    const ps = useProductStore.getState();
    
    // Check if category is used in active products list
    const usedInProducts = (ps.products || []).some(p => p.category_id === id || (p.category_obj && p.category_obj.id === id));
    // Check if category is used in consumed products list
    const usedInConsumed = (ps.consumedProducts || []).some(p => p.category_id === id || (p.category_obj && p.category_obj.id === id));

    // Show validation alert if category is currently referenced
    if (usedInProducts || usedInConsumed) {
      Alert.alert(
        t('categories.deleteInUseTitle') || t('common.attention'),
        t('categories.deleteInUseMessage') || t('errors.deleteCategory'),
        [{ text: t('common.ok'), style: 'default' }]
      );
      return;
    }

    // Confirmation dialog before deleting an unused category
    Alert.alert(
      t('categories.deleteTitle'),
      t('categories.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(id);
            } catch (e) {
              const detail = e.response?.data?.detail || t('errors.deleteCategory');
              Alert.alert(t('common.error'), detail);
            }
          },
        },
      ]
    );
  };

  /**
   * Prompts user and invokes API endpoint to restore system-default categories.
   */
  const handleRestoreDefaults = async () => {
    Alert.alert(
      t('categories.restoreTitle'),
      t('categories.restoreMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.restore'),
          style: 'default',
          onPress: async () => {
            try {
              await restoreDefaultCategories();
            } catch (e) {
              Alert.alert(t('common.error'), t('errors.restoreCategories'));
            }
          },
        },
      ]
    );
  };

  /**
   * Helper to render individual category cards.
   * 
   * @param {object} item - Category object containing id and name.
   */
  const renderItem = (item) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.itemTitle}>{getTranslatedCategoryName(item.name, t)}</Text>
      {/* Delete button linked to safety check */}
      <TouchableOpacity onPress={() => handleDeleteCategory(item.id)} style={styles.deleteBtn} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={20} color={COLORS.danger ?? '#FF3B30'} />
      </TouchableOpacity>
    </View>
  );

  // Full-screen loading state layout
  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" color={COLORS.primary} />;
  }

  // Full-screen error state layout
  if (error) {
    return <View style={styles.center}><Text style={{ color: COLORS.danger }}>{t('errors.loadingCategories')}</Text></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* Header section with back navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.categories', 'Категорії')}</Text>
      </View>

      {/* Main Body */}
      <View style={styles.content}>
        {/* Container for entering and submitting new categories */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('categories.addPlaceholder')}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            onSubmitEditing={handleAddCategory}
            placeholderTextColor={COLORS.onSurfaceVariant}
          />
          {newCategoryName.trim().length > 0 && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddCategory} activeOpacity={0.8}>
              <Ionicons name="add" size={26} color={COLORS.onPrimaryContainer} />
            </TouchableOpacity>
          )}
        </View>

        {/* Scrollable list of categories */}
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {categories.map(c => renderItem(c))}
        </ScrollView>

        {/* Footer with restore action button */}
        <View style={styles.footer}>
          <CustomButton
            title={t('categories.restoreDefaults')}
            onPress={handleRestoreDefaults}
            variant="outline"
            icon={<Ionicons name="refresh-outline" size={20} color={COLORS.primary} />}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Computes component stylesheet dynamically.
 * 
 * @param {object} COLORS - App colors.
 * @param {boolean} isDark - Flag representing dark mode status.
 * @param {object} insets - Safe area details.
 * @returns {object} StyleSheet layout.
 */
const getStyles = (COLORS, isDark, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
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
    fontSize: 32,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text
  },
  addButton: {
    backgroundColor: COLORS.primaryContainer,
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.1,
    shadowRadius: 4,
  },
  scrollContainer: {
    paddingBottom: 20
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: COLORS.errorContainer || '#FF3B3012',
    borderRadius: 12,
    marginLeft: 12,
  },
  footer: {
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  }
});