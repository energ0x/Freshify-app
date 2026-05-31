import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';

// Ваш список категорій, доповнений емодзі та коротким описом для гарного вигляду
const PREDEFINED_CATEGORIES = [
  { id: 'dairy', title: 'Молочні продукти 🧀', desc: 'Молоко, сир, йогурт, вершкове масло' },
  { id: 'meat_fish', title: "М'ясо та риба 🥩", desc: 'Свіже м\'ясо, птиця, риба, морепродукти' },
  { id: 'vegetables', title: 'Овочі 🥦', desc: 'Свіжі овочі для салатів та гарнірів' },
  { id: 'fruits', title: 'Фрукти 🍎', desc: 'Яблука, банани, цитрусові, ягоди' },
  { id: 'greens', title: 'Зелень 🌿', desc: 'Кріп, петрушка, шпинат, салат' },
  { id: 'bakery', title: 'Хліб та випічка 🍞', desc: 'Свіжий хліб, булочки, багети' },
  { id: 'drinks', title: 'Напої 🥤', desc: 'Соки, вода, чай, кава, газовані напої' },
  { id: 'canned', title: 'Консерви 🥫', desc: 'Консервовані овочі, тушонка, риба' },
  { id: 'grains', title: 'Крупи та злаки 🍚', desc: 'Рис, гречка, макарони, вівсянка' },
  { id: 'frozen', title: 'Заморожені продукти ❄️', desc: 'Напівфабрикати, заморожені овочі/ягоди' },
  { id: 'sauces', title: 'Соуси та приправи 🌶️', desc: 'Кетчуп, майонез, спеції, олія' },
  { id: 'sweets', title: 'Солодощі 🍫', desc: 'Шоколад, печиво, цукерки, десерти' },
  { id: 'other', title: 'Інше 📦', desc: 'Усе, що не ввійшло в інші категорії' },
];

export default function CategoriesScreen({ navigation }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');

  const toggleCategory = (id) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter(c => c !== id));
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !customCategories.find(c => c.title.toLowerCase() === trimmed.toLowerCase())) {
      const newId = `custom_${Date.now()}`;
      setCustomCategories([...customCategories, { id: newId, title: trimmed, desc: 'Власна категорія' }]);
      setSelectedCategories([...selectedCategories, newId]); 
      setNewCategory('');
    }
  };

  const handleDeleteCustom = (id) => {
    setCustomCategories(customCategories.filter(c => c.id !== id));
    setSelectedCategories(selectedCategories.filter(c => c !== id));
  };

  const handleSave = () => {
    // Тут буде логіка збереження обраних категорій
    Alert.alert('Успіх', 'Ваші налаштування категорій збережено.', [
      { text: 'ОК', onPress: () => navigation.goBack() }
    ]);
  };

  const renderItem = (item, isCustom = false) => {
    const isSelected = selectedCategories.includes(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => toggleCategory(item.id)}
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
        Оберіть категорії продуктів, якими ви найчастіше користуєтесь, або створіть власні для зручнішого сортування.
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Додати власну категорію..."
          value={newCategory}
          onChangeText={setNewCategory}
          onSubmitEditing={handleAddCustom}
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddCustom}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {PREDEFINED_CATEGORIES.map(c => renderItem(c))}
        {customCategories.map(c => renderItem(c, true))}
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