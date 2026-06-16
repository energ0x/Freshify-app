/**
 * @file AllergensSettingsScreen.js
 * @description Screen for configuring food allergens (e.g. Milk, Nuts, Gluten).
 * Allows toggling predefined allergen chips and adding custom items.
 * Cleans emojis before saving to backend profiles to enable accurate AI analysis.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Alert, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

/**
 * AllergensSettingsScreen Component.
 * Enables setting up allergen alerts.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation router.
 */
export default function AllergensSettingsScreen({ navigation }) {
  const { t } = useTranslation();

  // Load user details and profile updater from auth store
  const { user, updateProfile } = useAuthStore();

  // Color tokens and active theme configuration
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  // memoize translated versions of standard allergen names
  const initialTranslatedAllergens = useMemo(() => [
    t('allergens.milk'), t('allergens.nuts'), t('allergens.eggs'),
    t('allergens.gluten'), t('allergens.fish'), t('allergens.seafood'),
    t('allergens.soy'), t('allergens.citrus'), t('allergens.honey')
  ], [t]);

  // Local state for list of available allergens, selected ones, input field, and loader
  const [allergens, setAllergens] = useState(initialTranslatedAllergens);
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  // Parse existing profile's allergens on component load.
  // Emojis/unicodes are stripped when comparing local localized text to backend data.
  useEffect(() => {
    if (user?.allergens) {
      const mappedSelected = user.allergens.map(backendAllergen => {
        const found = initialTranslatedAllergens.find(
          ia => ia.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() === backendAllergen
        );
        return found || backendAllergen;
      });

      const remoteAllergens = mappedSelected.filter(a => !initialTranslatedAllergens.includes(a));
      setAllergens([...initialTranslatedAllergens, ...remoteAllergens]);
      setSelected(mappedSelected);
    } else {
      setAllergens(initialTranslatedAllergens);
    }
  }, [user, initialTranslatedAllergens]);

  /**
   * Toggles selection state of allergen chip.
   * 
   * @param {string} item - Allergen text.
   */
  const toggleAllergen = (item) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(i => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  /**
   * Validates and appends custom text allergen to active selections list.
   */
  const addCustomAllergen = () => {
    const text = customInput.trim();
    if (!text) return;
    if (text.length > 100) {
      return Alert.alert(t('common.error'), t('onboarding.allergenTooLong') || 'Назва алергену не може бути такою довгою.');
    }
    if (allergens.map(a => a.toLowerCase()).includes(text.toLowerCase())) {
      return Alert.alert(t('common.attention'), t('allergens.alreadyInList'));
    }
    setAllergens([...allergens, text]);
    setSelected([...selected, text]);
    setCustomInput('');
  };

  /**
   * Submits cleaned allergen lists to backend API.
   * Unicode emojis are regex stripped so backend AI models can parse texts.
   */
  const handleSave = async () => {
    setLoading(true);
    try {
      const cleanedAllergens = selected.map(item => item.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim());
      const res = await updateProfile({ allergens: cleanedAllergens });
      if (res.success) {
        Alert.alert(t('common.success'), t('allergens.saveSuccess'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert(t('common.error'), res.error || t('allergens.saveError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('allergens.saveError'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* Screen Title Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.allergensSettings', 'Налаштування алергенів')}</Text>
      </View>

      <View style={styles.content}>
        {/* Instructive subtitle */}
        <Text style={styles.subtitle}>
          {t('allergens.description')}
        </Text>

        {/* Custom allergen input row */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('allergens.addCustomPlaceholder')}
            value={customInput}
            onChangeText={setCustomInput}
            onSubmitEditing={addCustomAllergen}
            placeholderTextColor={COLORS.onSurfaceVariant}
            maxLength={255}
          />
          <TouchableOpacity style={styles.addButton} onPress={addCustomAllergen} activeOpacity={0.8}>
            <Ionicons name="add" size={26} color={COLORS.onPrimaryContainer} />
          </TouchableOpacity>
        </View>

        {/* Scrollable grid of allergen chips */}
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {allergens.map((item) => {
              const isSelected = selected.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleAllergen(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item}</Text>
                  {/* Selected checkmark indicator */}
                  {isSelected && <Ionicons name="close-circle" size={18} color={COLORS.onPrimary} style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Footer holding the save button */}
      <View style={styles.footer}>
        <CustomButton title={t('common.save')} onPress={handleSave} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Returns dynamic stylesheet configuration based on active theme colors and safe-area notch heights.
 */
const getStyles = (COLORS, isDark, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
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
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500'
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 4,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    shadowOpacity: isDark ? 0.3 : 0.15,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  chipTextSelected: {
    color: COLORS.onPrimary
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: insets.bottom || 24,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
});