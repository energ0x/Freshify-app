import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../../components/CustomButton';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

export default function AllergensScreen({ navigation }) {
  const { t } = useTranslation();
  const { updateProfile } = useAuthStore();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  // Мемоїзуємо перекладений список, щоб уникнути зайвих ререндерів
  const initialTranslatedAllergens = useMemo(() => [
    t('allergens.milk', 'Молоко'), t('allergens.nuts', 'Горіхи'), t('allergens.eggs', 'Яйця'),
    t('allergens.gluten', 'Глютен'), t('allergens.fish', 'Риба'), t('allergens.seafood', 'Морепродукти'),
    t('allergens.soy', 'Соя'), t('allergens.citrus', 'Цитрусові'), t('allergens.honey', 'Мед')
  ], [t]);

  const [allergens, setAllergens] = useState(initialTranslatedAllergens);
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);

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

    // Перевірка на довжину
    if (text.length > 100) {
      return Alert.alert(t('common.error'), t('onboarding.allergenTooLong'));
    }

    // Перевірка на дублікати без урахування регістру
    if (allergens.map(a => a.toLowerCase()).includes(text.toLowerCase())) {
      return Alert.alert(t('common.attention'), t('onboarding.allergenExists'));
    }

    setAllergens([...allergens, text]);
    setSelected([...selected, text]);
    setCustomInput('');
    setShowCustomInput(false);
  };

  const handleNext = async () => {
    setLoading(true);
    // Видаляємо емодзі для збереження в БД
    const cleanedAllergens = selected.map(item => item.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim());

    const res = await updateProfile({ allergens: cleanedAllergens });
    setLoading(false);

    if (res.success) {
      navigation.navigate('Guide');
    } else {
      Alert.alert(t('common.error'), res.error || t('onboarding.allergenSaveError'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.allergensTitle', 'Алергії')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.allergensSubtitle', 'Виберіть продукти, на які у вас алергія')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
                {isSelected && (
                  <Ionicons name="close-circle" size={18} color={COLORS.onPrimary} style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.chip, styles.chipAdd]}
            onPress={() => setShowCustomInput(!showCustomInput)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.chipText, { color: COLORS.primary }]}>{t('common.other', 'Інше')}</Text>
          </TouchableOpacity>
        </View>

        {showCustomInput && (
          <View style={styles.inputBlock}>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding.enterOption', 'Введіть свій варіант...')}
              value={customInput}
              onChangeText={setCustomInput}
              maxLength={100}
              onSubmitEditing={addCustomAllergen}
              placeholderTextColor={COLORS.onSurfaceVariant}
              autoFocus
            />
            <TouchableOpacity style={styles.addButton} onPress={addCustomAllergen} activeOpacity={0.8}>
              <Text style={styles.addButtonText}>{t('common.add', 'Додати')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={selected.length > 0 ? t('common.next', 'Далі') : t('onboarding.noAllergies', 'Немає алергій')}
          onPress={handleNext}
          loading={loading}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (COLORS, isDark, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 24,
    paddingTop: Math.max(insets.top + 20, 60),
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },

  // ─── Content ───────────────────────────────────────────────────────────────
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  chipAdd: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text
  },
  chipTextSelected: {
    color: COLORS.onPrimary,
    fontWeight: '700',
  },

  // ─── Input Block ───────────────────────────────────────────────────────────
  inputBlock: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  addButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 24,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    color: COLORS.onPrimary,
    fontWeight: '800',
    fontSize: 16,
  },

  // ─── Footer ────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: (insets.bottom || 20) + 10,
  },
  button: {
    height: 56,
    borderRadius: 16,
  }
});