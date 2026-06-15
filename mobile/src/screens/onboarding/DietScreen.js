import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import useAuthStore from '../../store/authStore';

// Замість жорсткого тексту зберігаємо ключі для перекладу
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
  const [selectedDiet, setSelectedDiet] = useState('none');
  const [loading, setLoading] = useState(false);

  // Підтягуємо збережену дієту з БД, якщо вона є
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
      <Text style={styles.title}>{t('onboarding.dietTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.dietSubtitle')}</Text>

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
        <CustomButton title={t('common.next')} onPress={handleNext} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },
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
  footer: { paddingVertical: 20 },
});