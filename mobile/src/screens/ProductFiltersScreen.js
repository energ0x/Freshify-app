import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';

export default function ProductFiltersScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors: COLORS } = useThemeStore();
  const insets = useSafeAreaInsets();

  const { currentFilters, presentCategories = [] } = route.params || {};

  const [selectedCategoryId, setSelectedCategoryId] = useState(currentFilters?.selectedCategoryId ?? null);
  const [sortBy, setSortBy] = useState(currentFilters?.sortBy ?? null);
  const [sortDirection, setSortDirection] = useState(currentFilters?.sortDirection ?? 'asc');

  const handleSortPress = (type) => {
    if (sortBy === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortDirection('asc');
    }
  };

  const renderSortArrow = (type) => {
    if (sortBy !== type) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const handleApply = () => {
    // Повертаємося назад і передаємо нові фільтри через params. 
    // Замість "Home" вкажи назву твого роуту головного екрана, якщо вона інша
    navigation.navigate({
      name: 'Продукти', // Переконайся, що це правильне ім'я екрана
      params: { appliedFilters: { selectedCategoryId, sortBy, sortDirection } },
      merge: true,
    });
  };

  const resetFilters = () => {
    setSelectedCategoryId(null);
    setSortBy(null);
    setSortDirection('asc');
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top || 20, backgroundColor: COLORS.surface }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>{t('home.filtersTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 2 Колонки */}
      <View style={styles.columnsContainer}>
        {/* Ліва колонка: Категорії */}
        <View style={styles.column}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{t('home.filterCategory')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity 
              style={[
                styles.chip, 
                { backgroundColor: selectedCategoryId === null ? COLORS.primary : COLORS.surfaceVariant }
              ]} 
              onPress={() => setSelectedCategoryId(null)}
            >
              <Text style={[styles.chipText, { color: selectedCategoryId === null ? COLORS.onPrimary : COLORS.text }]}>
                {t('home.all')}
              </Text>
            </TouchableOpacity>
            
            {presentCategories.map(category => (
              <TouchableOpacity 
                key={category.id} 
                style={[
                  styles.chip, 
                  { backgroundColor: selectedCategoryId === category.id ? COLORS.primary : COLORS.surfaceVariant }
                ]} 
                onPress={() => setSelectedCategoryId(category.id)}
              >
                <Text style={[styles.chipText, { color: selectedCategoryId === category.id ? COLORS.onPrimary : COLORS.text }]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Вертикальний розділювач */}
        <View style={[styles.divider, { backgroundColor: COLORS.outline }]} />

        {/* Права колонка: Сортування */}
        <View style={styles.column}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{t('home.sortBy')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity 
              style={[
                styles.chip, 
                { backgroundColor: sortBy === 'expiry' ? COLORS.primary : COLORS.surfaceVariant }
              ]} 
              onPress={() => handleSortPress('expiry')}
            >
              <Text style={[styles.chipText, { color: sortBy === 'expiry' ? COLORS.onPrimary : COLORS.text }]}>
                {t('home.sortExpiry')}{renderSortArrow('expiry')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.chip, 
                { backgroundColor: sortBy === 'alphabet' ? COLORS.primary : COLORS.surfaceVariant }
              ]} 
              onPress={() => handleSortPress('alphabet')}
            >
              <Text style={[styles.chipText, { color: sortBy === 'alphabet' ? COLORS.onPrimary : COLORS.text }]}>
                {t('home.sortAlphabet')}{renderSortArrow('alphabet')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.chip, 
                { backgroundColor: sortBy === 'quantity' ? COLORS.primary : COLORS.surfaceVariant }
              ]} 
              onPress={() => handleSortPress('quantity')}
            >
              <Text style={[styles.chipText, { color: sortBy === 'quantity' ? COLORS.onPrimary : COLORS.text }]}>
                {t('home.sortQuantity')}{renderSortArrow('quantity')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Кнопки дій */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 20, backgroundColor: COLORS.surface }]}>
        <TouchableOpacity 
          style={[styles.resetButton, { borderColor: COLORS.outline, backgroundColor: COLORS.background }]} 
          onPress={resetFilters}
        >
          <Text style={[styles.resetButtonText, { color: COLORS.danger }]}>{t('common.resetAll')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.applyButton, { backgroundColor: COLORS.primary }]} 
          onPress={handleApply}
        >
          <Text style={[styles.applyButtonText, { color: COLORS.onPrimary }]}>{t('common.apply')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  column: {
    flex: 1,
  },
  divider: {
    width: 1,
    marginHorizontal: 16,
    opacity: 0.2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});