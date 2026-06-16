import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { useTranslation } from 'react-i18next';

const DIET_KEYS = [
  { id: 'none', titleKey: 'diets.noneTitle', descKey: 'diets.noneDesc' },
  { id: 'vegetarian', titleKey: 'diets.vegetarianTitle', descKey: 'diets.vegetarianDesc' },
  { id: 'vegan', titleKey: 'diets.veganTitle', descKey: 'diets.veganDesc' },
  { id: 'pescatarian', titleKey: 'diets.pescatarianTitle', descKey: 'diets.pescatarianDesc' },
  { id: 'flexitarian', titleKey: 'diets.flexitarianTitle', descKey: 'diets.flexitarianDesc' },
];

export default function DietSettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [selectedDiet, setSelectedDiet] = useState('none');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  useEffect(() => {
    if (user?.dietary_preference) {
      setSelectedDiet(user.dietary_preference);
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updateProfile({ dietary_preference: selectedDiet });
      if (res.success) {
        Alert.alert(t('common.success'), t('settings.dietSaved', 'Ваші налаштування дієти збережено.'), [
          { text: t('common.ok', 'ОК'), onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert(t('common.error'), res.error || t('settings.dietSaveError', 'Не вдалося зберегти налаштування.'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.dietSaveError', 'Не вдалося зберегти налаштування.'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.dietSettings', 'Налаштування дієти')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {t('settings.dietSubtitle', 'Це допоможе нам точніше аналізувати продукти та пропонувати релевантні рецепти.')}
        </Text>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {DIET_KEYS.map((diet) => {
            const isSelected = selectedDiet === diet.id;
            return (
              <TouchableOpacity
                key={diet.id}
                style={[styles.card, isSelected && styles.selectedCard]}
                onPress={() => setSelectedDiet(diet.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.dietTitle, isSelected && styles.selectedDietTitle]}>
                    {t(diet.titleKey)}
                  </Text>
                  <Text style={styles.dietDesc}>{t(diet.descKey)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <CustomButton title={t('common.save', 'Зберегти')} onPress={handleSave} loading={loading} />
      </View>
    </View>
  );
}

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
  scrollContainer: {
    paddingBottom: 20
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
  },
  selectedCard: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
    elevation: 4,
  },
  radioCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary
  },
  textContainer: {
    flex: 1,
    gap: 4
  },
  dietTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectedDietTitle: {
    color: COLORS.primary
  },
  dietDesc: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20
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