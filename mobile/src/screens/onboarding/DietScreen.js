import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../../components/CustomButton';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

const DIET_KEYS = [
  { id: 'none', titleKey: 'diets.noneTitle', descKey: 'diets.noneDesc' },
  { id: 'vegetarian', titleKey: 'diets.vegetarianTitle', descKey: 'diets.vegetarianDesc' },
  { id: 'vegan', titleKey: 'diets.veganTitle', descKey: 'diets.veganDesc' },
  { id: 'pescatarian', titleKey: 'diets.pescatarianTitle', descKey: 'diets.pescatarianDesc' },
  { id: 'flexitarian', titleKey: 'diets.flexitarianTitle', descKey: 'diets.flexitarianDesc' },
];

export default function DietScreen({ navigation }) {
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

  const handleNext = async () => {
    setLoading(true);
    const res = await updateProfile({ dietary_preference: selectedDiet });
    setLoading(false);

    if (res.success) {
      navigation.navigate('Allergens');
    } else {
      Alert.alert(t('common.error'), res.error || t('onboarding.dietSaveError'));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.dietTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.dietSubtitle')}</Text>
      </View>

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

      <View style={styles.footer}>
        <CustomButton
          title={t('common.next')}
          onPress={handleNext}
          loading={loading}
          style={styles.button}
        />
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
    paddingHorizontal: 24,
    paddingTop: Math.max(insets.top + 20, 60), // Гарантований відступ від верху
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

  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
    gap: 16,
  },
  selectedCard: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
    elevation: 4,
    shadowOpacity: isDark ? 0.3 : 0.1,
  },

  radioCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 4,
  },
  dietTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectedDietTitle: {
    color: COLORS.primary
  },
  dietDesc: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
    fontWeight: '500',
  },

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