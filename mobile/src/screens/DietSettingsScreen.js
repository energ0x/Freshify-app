import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';
import useAuthStore from '../store/authStore';
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
  const [selectedDiet, setSelectedDiet] = useState('none');
  const [loading, setLoading] = useState(false);

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
              activeOpacity={0.7}
            >
              <View style={styles.radioCircle}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.dietTitle, isSelected && styles.selectedDietTitle]}>{t(diet.titleKey)}</Text>
                <Text style={styles.dietDesc}>{t(diet.descKey)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title={t('common.save', 'Зберегти')} onPress={handleSave} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 20 },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: 20, lineHeight: 20, textAlign: 'center' },
  scrollContainer: { paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface || '#fff',
    borderWidth: 1,
    borderColor: COLORS.border || '#e0e0e0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  selectedCard: { borderColor: COLORS.primary, backgroundColor: (COLORS.primary + '08') || '#edf7ed' },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border || '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioDot: { height: 10, width: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  textContainer: { flex: 1 },
  dietTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  selectedDietTitle: { color: COLORS.primary },
  dietDesc: { fontSize: 13, color: COLORS.textLight },
  footer: { paddingVertical: 20, paddingBottom: 40 },
});