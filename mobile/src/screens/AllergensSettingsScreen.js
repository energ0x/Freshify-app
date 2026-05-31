import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';

const PREDEFINED_ALLERGENS = [
  { id: 'lactose', title: 'Лактоза 🥛', desc: 'Молоко, сир, вершкове масло' },
  { id: 'nuts', title: 'Горіхи 🥜', desc: 'Волоські горіхи, мигдаль, фундук, арахіс' },
  { id: 'eggs', title: 'Яйця 🥚', desc: 'Курячі, перепелині яйця' },
  { id: 'soy', title: 'Соя 🌱', desc: 'Соєвий соус, тофу, соєве молоко' },
  { id: 'seafood', title: 'Морепродукти 🦐', desc: 'Риба, креветки, мідії, кальмари' },
];

export default function AllergensScreen({ navigation }) {
  // Тут у майбутньому ви будете підтягувати збережені алергени зі store або API
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [customAllergens, setCustomAllergens] = useState([]);
  const [newAllergen, setNewAllergen] = useState('');

  const toggleAllergen = (id) => {
    if (selectedAllergens.includes(id)) {
      setSelectedAllergens(selectedAllergens.filter(a => a !== id));
    } else {
      setSelectedAllergens([...selectedAllergens, id]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newAllergen.trim();
    if (trimmed && !customAllergens.find(a => a.title.toLowerCase() === trimmed.toLowerCase())) {
      const newId = `custom_${Date.now()}`;
      setCustomAllergens([...customAllergens, { id: newId, title: trimmed, desc: 'Власний алерген' }]);
      setSelectedAllergens([...selectedAllergens, newId]); 
      setNewAllergen('');
    }
  };

  const handleDeleteCustom = (id) => {
    setCustomAllergens(customAllergens.filter(a => a.id !== id));
    setSelectedAllergens(selectedAllergens.filter(a => a !== id));
  };

  const handleSave = () => {
    // Логіка збереження на бекенд або у Zustand
    Alert.alert('Успіх', 'Налаштування алергенів збережено.', [
      { text: 'ОК', onPress: () => navigation.goBack() }
    ]);
  };

  const renderItem = (item, isCustom = false) => {
    const isSelected = selectedAllergens.includes(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => toggleAllergen(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
          size={24} 
          color={isSelected ? (COLORS.danger || '#FF3B30') : (COLORS.border || '#cbd5e1')} 
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
        Додайте продукти, які варто уникати. Наш ШІ автоматично виключатиме їх із ваших рецептів.
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Додати власний алерген..."
          value={newAllergen}
          onChangeText={setNewAllergen}
          onSubmitEditing={handleAddCustom}
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: COLORS.danger || '#FF3B30' }]} onPress={handleAddCustom}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {PREDEFINED_ALLERGENS.map(a => renderItem(a))}
        {customAllergens.map(a => renderItem(a, true))}
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
  addButton: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  scrollContainer: { paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface || '#fff', borderWidth: 1, borderColor: COLORS.border || '#e0e0e0', borderRadius: 16, padding: 16, marginBottom: 12 },
  selectedCard: { borderColor: COLORS.danger || '#FF3B30', backgroundColor: ((COLORS.danger || '#FF3B30') + '10') },
  
  radioIcon: { marginRight: 14 },
  textContainer: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  selectedItemTitle: { color: COLORS.danger || '#FF3B30' },
  itemDesc: { fontSize: 13, color: COLORS.textLight },
  deleteBtn: { padding: 8, marginLeft: 8 },
  
  footer: { paddingVertical: 20, paddingBottom: 40 },
});