import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

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

  const renderSortIcon = (type) => {
    if (sortBy !== type) return null;
    return (
      <Ionicons
        name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
        size={16}
        color={COLORS.primary}
        style={{ marginLeft: 6 }}
      />
    );
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('home.filtersTitle', 'Фільтри')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {t('home.filtersSubtitle', 'Налаштуйте відображення ваших продуктів')}
        </Text>

        {/* ─── Категорії ────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="folder" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t('home.filterCategory', 'Категорія')}</Text>
          </View>

          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, selectedCategoryId === null ? styles.chipSelected : styles.chipUnselected]}
              onPress={() => setSelectedCategoryId(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, selectedCategoryId === null ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {t('home.all', 'Всі')}
              </Text>
              {selectedCategoryId === null && <Ionicons name="checkmark" size={16} color={COLORS.primary} style={{ marginLeft: 6 }} />}
            </TouchableOpacity>

            {presentCategories.map(category => {
              const isSelected = selectedCategoryId === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                  onPress={() => setSelectedCategoryId(category.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                    {getTranslatedCategoryName(category.name, t)}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.primary} style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Сортування ───────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="swap-vertical" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t('home.sortBy', 'Сортування')}</Text>
          </View>

          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, sortBy === 'expiry' ? styles.chipSelected : styles.chipUnselected]}
              onPress={() => handleSortPress('expiry')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, sortBy === 'expiry' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {t('home.sortExpiry', 'За терміном')}
              </Text>
              {renderSortIcon('expiry')}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, sortBy === 'alphabet' ? styles.chipSelected : styles.chipUnselected]}
              onPress={() => handleSortPress('alphabet')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, sortBy === 'alphabet' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {t('home.sortAlphabet', 'За алфавітом')}
              </Text>
              {renderSortIcon('alphabet')}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, sortBy === 'quantity' ? styles.chipSelected : styles.chipUnselected]}
              onPress={() => handleSortPress('quantity')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, sortBy === 'quantity' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {t('home.sortQuantity', 'За кількістю')}
              </Text>
              {renderSortIcon('quantity')}
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <CustomButton
          title={t('common.resetAll', 'Скинути')}
          variant="outline"
          onPress={resetFilters}
          style={styles.resetButton}
          textStyle={{ color: COLORS.danger ?? '#FF3B30' }}
        />
        <CustomButton
          title={t('common.apply', 'Застосувати')}
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

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 20 : insets.top || 20,
    paddingHorizontal: 16,
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
  closeButton: {
    padding: 8,
    width: 44,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },

  // ─── Content ───────────────────────────────────────────────────────────────
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
    fontWeight: '500',
  },

  // ─── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ─── Chips ─────────────────────────────────────────────────────────────────
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipUnselected: {
    backgroundColor: COLORS.surfaceVariant,
  },
  chipSelected: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextUnselected: {
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ─── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: (insets.bottom || 20) + 16,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    gap: 16,
  },
  resetButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderColor: COLORS.danger ?? '#FF3B30',
    borderWidth: 1.5,
  },
  applyButton: {
    flex: 2,
    height: 52,
    borderRadius: 16,
  },
});