import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';

const PREDEFINED_DIETS = [
  { id: 'vegetarian', title: 'Вегетаріанець 🥦', desc: 'Без м\'яса та риби' },
  { id: 'vegan', title: 'Веган 🍃', desc: 'Жодних тваринних продуктів' },
  { id: 'pescatarian', title: 'Пескетаріанець 🐟', desc: 'Рослинна їжа + риба' },
  { id: 'gluten_free', title: 'Без глютену 🌾', desc: 'Виключення пшениці та злаків' },
  { id: 'keto', title: 'Кето 🥩', desc: 'Мінімум вуглеводів, більше жирів' },
];

export default function DietScreen({ navigation }) {
  // Тут у майбутньому ви будете підтягувати збережені дієти зі store або API
  const [selectedDiets, setSelectedDiets] = useState([]);
  const [customDiets, setCustomDiets] = useState([]);
  const [newDiet, setNewDiet] = useState('');

  const toggleDiet = (id) => {
    if (selectedDiets.includes(id)) {
      setSelectedDiets(selectedDiets.filter(d => d !== id));
    } else {
      setSelectedDiets([...selectedDiets, id]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newDiet.trim();
    if (trimmed && !customDiets.find(d => d.title.toLowerCase() === trimmed.toLowerCase())) {
      const newId = `custom_${Date.now()}`;
      setCustomDiets([...customDiets, { id: newId, title: trimmed, desc: 'Власна дієта' }]);
      setSelectedDiets([...selectedDiets, newId]); 
      setNewDiet('');
    }
  };

  const handleDeleteCustom = (id) => {
    setCustomDiets(customDiets.filter(d => d.id !== id));
    setSelectedDiets(selectedDiets.filter(d => d !== id));
  };

  const handleSave = () => {
    // Логіка збереження на бекенд або у Zustand
    Alert.alert('Успіх', 'Ваші налаштування дієти збережено.', [
      { text: 'ОК', onPress: () => navigation.goBack() }
    ]);
  };

  const renderItem = (item, isCustom = false) => {
    const isSelected = selectedDiets.includes(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => toggleDiet(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
          size={24} 
          color={isSelected ? COLORS.primary : (COLORS.border || '#cbd5e1')} 
          style={styles.radioIcon}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.itemTitle, isSelected && styles.selectedItemTitle]}>{item.title}</Text>
          <Text style={styles.itemDesc}>{item.desc}</Text>
        </View>
        {isCustom && (
          <TouchableOpacity onPress={() => handleDeleteCustom(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={22} color={COLORS.danger || '#FF3B30'} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Text style={styles.subtitle}>
        Оберіть або додайте власні дієти, щоб ШІ міг адаптувати рецепти саме для вас.
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Додати власну дієту..."
          value={newDiet}
          onChangeText={setNewDiet}
          onSubmitEditing={handleAddCustom}
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddCustom}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {PREDEFINED_DIETS.map(d => renderItem(d))}
        {customDiets.map(d => renderItem(d, true))}
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title="Зберегти" onPress={handleSave} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 20 },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: 20, lineHeight: 20 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: { flex: 1, backgroundColor: COLORS.surface || '#fff', borderWidth: 1, borderColor: COLORS.border || '#e0e0e0', borderRadius: 12, padding: 14, fontSize: 15, marginRight: 10, color: COLORS.text },
  addButton: { backgroundColor: COLORS.primary, width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  scrollContainer: { paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface || '#fff', borderWidth: 1, borderColor: COLORS.border || '#e0e0e0', borderRadius: 16, padding: 16, marginBottom: 12 },
  selectedCard: { borderColor: COLORS.primary, backgroundColor: (COLORS.primary + '10') || '#edf7ed' },
  
  radioIcon: { marginRight: 14 },
  textContainer: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  selectedItemTitle: { color: COLORS.primary },
  itemDesc: { fontSize: 13, color: COLORS.textLight },
  deleteBtn: { padding: 8, marginLeft: 8 },
  
  footer: { paddingVertical: 20, paddingBottom: 40 },
});