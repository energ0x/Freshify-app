import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';
import useProductStore from '../store/productStore';
import { useCategories } from '../hooks/useCategories';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';

export default function CategoriesScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS } = useThemeStore();
  const { categories, loading, error, createCategory, deleteCategory, restoreDefaultCategories } = useCategories();
  const [newCategoryName, setNewCategoryName] = useState('');

  const styles = getStyles(COLORS);

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

  const handleDeleteCategory = async (id) => {
    // Перевіряємо локально чи категорія використовується у продуктах або в історії споживання
    const ps = useProductStore.getState();
    const usedInProducts = (ps.products || []).some(p => p.category_id === id || (p.category_obj && p.category_obj.id === id));
    const usedInConsumed = (ps.consumedProducts || []).some(p => p.category_id === id || (p.category_obj && p.category_obj.id === id));

    if (usedInProducts || usedInConsumed) {
      // Показуємо пояснювальне вікно — категорію не можна видалити
      Alert.alert(
        t('categories.deleteInUseTitle') || t('common.attention'),
        t('categories.deleteInUseMessage') || t('errors.deleteCategory'),
        [{ text: t('common.ok'), style: 'default' }]
      );
      return;
    }

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

  const renderItem = (item) => (
    <View key={item.id} style={styles.card}>
      <Text style={styles.itemTitle}>{getTranslatedCategoryName(item.name, t)}</Text>
      <TouchableOpacity onPress={() => handleDeleteCategory(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" color={COLORS.primary} />;
  }

  if (error) {
    return <View style={styles.center}><Text style={{ color: 'red' }}>{t('errors.loadingCategories')}</Text></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('categories.addPlaceholder')}
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          onSubmitEditing={handleAddCategory}
          placeholderTextColor={COLORS.textLight}
        />
        {newCategoryName.trim().length > 0 && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
            <Ionicons name="add" size={24} color={COLORS.onPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {categories.map(c => renderItem(c))}
      </ScrollView>
      
      <View style={styles.footer}>
        <CustomButton
          title={t('categories.restoreDefaults')}
          onPress={handleRestoreDefaults}
          variant="outline"
          icon={<Ionicons name="refresh-outline" size={20} color={COLORS.primary} />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (COLORS) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
    paddingHorizontal: 20, 
    paddingTop: 20 
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
    marginBottom: 20 
  },
  input: { 
    flex: 1, 
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    color: COLORS.text 
  },
  addButton: { 
    backgroundColor: COLORS.primary, 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 10,
  },
  scrollContainer: { 
    paddingBottom: 20 
  },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12 
  },
  itemTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text,
    flex: 1,
  },
  deleteBtn: { 
    padding: 8,
    marginLeft: 12,
  },
  footer: {
    paddingVertical: 10,
    paddingBottom: 30,
  }
});