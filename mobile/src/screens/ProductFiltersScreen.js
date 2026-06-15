import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

export default function ProductFiltersScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  
  const isDark = theme === 'dark';

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
    navigation.navigate({
      name: 'Products', 
      params: { appliedFilters: { selectedCategoryId, sortBy, sortDirection } },
      merge: true,
    });
  };

  const resetFilters = () => {
    setSelectedCategoryId(null);
    setSortBy(null);
    setSortDirection('asc');
  };

  const styles = getStyles(COLORS, insets, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('home.filtersTitle')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Налаштуйте відображення продуктів для зручного пошуку та аналізу.
        </Text>
        <View style={styles.columnsContainer}>
          <View style={styles.column}>
            <View style={styles.sectionHeader}>
              <Ionicons name="folder-outline" size={20} color={COLORS.text} />
              <Text style={styles.sectionTitle}>{t('home.filterCategory')}</Text>
            </View>
            
            <View style={styles.chipContainer}>
              <TouchableOpacity 
                style={[
                  styles.chip, 
                  selectedCategoryId === null ? styles.chipSelected : styles.chipUnselected
                ]} 
                onPress={() => setSelectedCategoryId(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selectedCategoryId === null ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {t('home.all')}
                </Text>
              </TouchableOpacity>
              
              {presentCategories.map(category => (
                <TouchableOpacity 
                  key={category.id} 
                  style={[
                    styles.chip, 
                    selectedCategoryId === category.id ? styles.chipSelected : styles.chipUnselected
                  ]} 
                  onPress={() => setSelectedCategoryId(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selectedCategoryId === category.id ? styles.chipTextSelected : styles.chipTextUnselected]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.column}>
            <View style={styles.sectionHeader}>
              <Ionicons name="swap-vertical-outline" size={20} color={COLORS.text} />
              <Text style={styles.sectionTitle}>{t('home.sortBy')}</Text>
            </View>

            <View style={styles.chipContainer}>
              <TouchableOpacity 
                style={[
                  styles.chip, 
                  sortBy === 'expiry' ? styles.chipSelected : styles.chipUnselected
                ]} 
                onPress={() => handleSortPress('expiry')}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, sortBy === 'expiry' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {t('home.sortExpiry')}{renderSortArrow('expiry')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.chip, 
                  sortBy === 'alphabet' ? styles.chipSelected : styles.chipUnselected
                ]} 
                onPress={() => handleSortPress('alphabet')}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, sortBy === 'alphabet' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {t('home.sortAlphabet')}{renderSortArrow('alphabet')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.chip, 
                  sortBy === 'quantity' ? styles.chipSelected : styles.chipUnselected
                ]} 
                onPress={() => handleSortPress('quantity')}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, sortBy === 'quantity' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {t('home.sortQuantity')}{renderSortArrow('quantity')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={t('common.resetAll')}
          variant="outline"
          onPress={resetFilters}
          style={styles.resetButton}
          textStyle={{ color: COLORS.danger }}
        />
        
        <CustomButton
          title={t('common.apply')}
          onPress={handleApply}
          style={styles.applyButton}
        />
      </View>
    </View>
  );
}

const getStyles = (COLORS, insets, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 20 : insets.top || 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    width: 44,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 28,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  chip: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipUnselected: {
    backgroundColor: COLORS.surfaceVariant,
  },
  chipSelected: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  chipTextUnselected: {
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: (insets.bottom || 20) + 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    borderColor: COLORS.danger,
  },
  applyButton: {
    flex: 2,
  },
});