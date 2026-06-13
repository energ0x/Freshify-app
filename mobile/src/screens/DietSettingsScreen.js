import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';
import useAuthStore from '../store/authStore';

export default function DietSettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const [selectedDiet, setSelectedDiet] = useState('none');
  const [loading, setLoading] = useState(false);

  const DIETS = [
    { id: 'none', title: t('diet.noneTitle'), desc: t('diet.noneDesc') },
    { id: 'vegetarian', title: t('diet.vegetarianTitle'), desc: t('diet.vegetarianDesc') },
    { id: 'vegan', title: t('diet.veganTitle'), desc: t('diet.veganDesc') },
    { id: 'pescatarian', title: t('diet.pescatarianTitle'), desc: t('diet.pescatarianDesc') },
    { id: 'flexitarian', title: t('diet.flexitarianTitle'), desc: t('diet.flexitarianDesc') },
  ];

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
        Alert.alert(t('common.success'), t('diet.savedSuccess'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert(t('common.error'), res.error || t('diet.saveError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('diet.saveError'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{t('diet.subtitle')}</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {DIETS.map((diet) => {
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
                <Text style={[styles.dietTitle, isSelected && styles.selectedDietTitle]}>{diet.title}</Text>
                <Text style={styles.dietDesc}>{diet.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title={t('common.save')} onPress={handleSave} loading={loading} />
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
