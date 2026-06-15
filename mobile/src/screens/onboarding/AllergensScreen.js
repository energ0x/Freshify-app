import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import useAuthStore from '../../store/authStore';

export default function AllergensScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  
  // Мемоїзуємо перекладений список, щоб уникнути зайвих ререндерів
  const initialTranslatedAllergens = useMemo(() => [
    t('allergens.milk'), t('allergens.nuts'), t('allergens.eggs'), 
    t('allergens.gluten'), t('allergens.fish'), t('allergens.seafood'), 
    t('allergens.soy'), t('allergens.citrus'), t('allergens.honey')
  ], [t]);

  const [allergens, setAllergens] = useState(initialTranslatedAllergens);
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);

  // Підтягуємо алергени з БД
  useEffect(() => {
    if (user?.allergens) {
      const mappedSelected = user.allergens.map(backendAllergen => {
        // Знаходимо алерген зі списку (ігноруючи емодзі), щоб відобразити його локалізованим
        const found = initialTranslatedAllergens.find(
          ia => ia.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() === backendAllergen
        );
        return found || backendAllergen; // Якщо кастомний — залишаємо як є
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
    // Перевірка на дублікати без урахування регістру
    if (text.length > 100) {
      return Alert.alert('Помилка', 'Назва алергену не може бути такою довгою.');
    }
    if (allergens.map(a => a.toLowerCase()).includes(text.toLowerCase())) {
      return Alert.alert(t('common.attention'), t('onboarding.allergenExists'));
    }
    if (allergens.includes(text)) {
      return Alert.alert('Увага', 'Цей алерген уже є у списку');
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
    <View style={styles.container}>
      <Text style={styles.title}>{t('onboarding.allergensTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.allergensSubtitle')}</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {allergens.map((item) => {
            const isSelected = selected.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleAllergen(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item}</Text>
                {isSelected && <Ionicons name="close-circle" size={16} color="#fff" style={{marginLeft: 6}} />}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity 
            style={[styles.chip, styles.chipAdd]} 
            onPress={() => setShowCustomInput(!showCustomInput)}
          >
            <Ionicons name="add" size={16} color={COLORS.primary} style={{marginRight: 4}} />
            <Text style={[styles.chipText, {color: COLORS.primary}]}>{t('common.other')}</Text>
          </TouchableOpacity>
        </View>

        {showCustomInput && (
          <View style={styles.inputBlock}>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding.enterOption')}
              value={customInput}
              onChangeText={setCustomInput}
              maxLength={20}
              onSubmitEditing={addCustomAllergen}
              maxLength={256}
            />
            <TouchableOpacity style={styles.addButton} onPress={addCustomAllergen}>
              <Text style={styles.addButtonText}>{t('common.add')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={selected.length > 0 ? t('common.continue') : t('onboarding.noAllergies')}
          onPress={handleNext}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 28 },
  scrollContainer: { paddingBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface || '#fff',
    borderWidth: 1,
    borderColor: COLORS.border || '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 6,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipAdd: { borderStyle: 'dashed', borderColor: COLORS.primary },
  chipText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  chipTextSelected: { color: '#fff' },
  inputBlock: { flexDirection: 'row', marginTop: 20, paddingHorizontal: 6 },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface || '#fff',
    borderWidth: 1,
    borderColor: COLORS.border || '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  footer: { paddingVertical: 20 },
});