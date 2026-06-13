import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';
import useAuthStore from '../store/authStore';

const ALLERGEN_DEFS = [
  { labelKey: 'allergens.milk',    emoji: '🥛' },
  { labelKey: 'allergens.nuts',    emoji: '🥜' },
  { labelKey: 'allergens.eggs',    emoji: '🥚' },
  { labelKey: 'allergens.gluten',  emoji: '🌾' },
  { labelKey: 'allergens.fish',    emoji: '🐟' },
  { labelKey: 'allergens.seafood', emoji: '🦀' },
  { labelKey: 'allergens.soy',     emoji: '🌱' },
  { labelKey: 'allergens.citrus',  emoji: '🍊' },
  { labelKey: 'allergens.honey',   emoji: '🍯' },
];

export default function AllergensSettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const initList = ALLERGEN_DEFS.map(a => `${t(a.labelKey)}${a.emoji}`);
  const [allergens, setAllergens] = useState(initList);
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.allergens) {
      const mappedSelected = user.allergens.map(backendAllergen => {
        const found = initList.find(
          ia => ia.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim().toLowerCase() === backendAllergen.toLowerCase()
        );
        return found || backendAllergen;
      });

      const remoteAllergens = mappedSelected.filter(a => !initList.includes(a));
      setAllergens([...initList, ...remoteAllergens]);
      setSelected(mappedSelected);
    }
  }, [user]);

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
    if (allergens.map(a => a.toLowerCase()).includes(text.toLowerCase())) {
      return Alert.alert(t('common.attention'), t('allergens.allergenExists'));
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
        Alert.alert(t('common.success'), t('allergens.allergensSaved'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert(t('common.error'), res.error || t('allergens.allergensSaveError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('allergens.allergensSaveError'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Text style={styles.subtitle}>
        {t('allergens.subtitle')}
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('allergens.addCustomPlaceholder')}
          value={customInput}
          onChangeText={setCustomInput}
          onSubmitEditing={addCustomAllergen}
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity style={styles.addButton} onPress={addCustomAllergen}>
          <Ionicons name="add" size={24} color="#fff" />
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
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item}</Text>
                {isSelected && <Ionicons name="close-circle" size={16} color="#fff" style={{marginLeft: 6}} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title={t('common.save')} onPress={handleSave} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 20 },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: 20, lineHeight: 20, textAlign: 'center' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: { flex: 1, backgroundColor: COLORS.surface || '#fff', borderWidth: 1, borderColor: COLORS.border || '#e0e0e0', borderRadius: 12, padding: 14, fontSize: 15, marginRight: 10, color: COLORS.text },
  addButton: { backgroundColor: COLORS.primary, width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

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
  chipText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  chipTextSelected: { color: '#fff' },
  
  footer: { paddingVertical: 20, paddingBottom: 40 },
});