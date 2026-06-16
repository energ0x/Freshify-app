import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

export default function AllergensSettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const { colors: COLORS, theme } = useThemeStore();

  const initialTranslatedAllergens = useMemo(() => [
    t('allergens.milk'), t('allergens.nuts'), t('allergens.eggs'),
    t('allergens.gluten'), t('allergens.fish'), t('allergens.seafood'),
    t('allergens.soy'), t('allergens.citrus'), t('allergens.honey')
  ], [t]);

  const [allergens, setAllergens] = useState(initialTranslatedAllergens);
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

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

  const toggleAllergen = (item) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(i => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

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
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {t('allergens.description')}
        </Text>

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
                  {isSelected && <Ionicons name="close-circle" size={18} color={COLORS.onPrimary} style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <CustomButton title={t('common.save')} onPress={handleSave} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
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
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
});