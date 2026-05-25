import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';

const DIETS = [
  { id: 'none', title: 'Всеїдний (Ніяких дієт)', desc: 'Харчуюся без виключення категорій їжі' },
  { id: 'vegetarian', title: 'Вегетаріанець 🥦', desc: 'Без м\'яса та риби, але з молочними продуктами' },
  { id: 'vegan', title: 'Веган 🍃', desc: 'Суворо рослинна дієта, жодних тваринних продуктів' },
  { id: 'pescatarian', title: 'Пескетаріанець 🐟', desc: 'Рослинна їжа + риба та морепродукти (без м\'яса)' },
  { id: 'flexitarian', title: 'Флекситаріанець 🌾', desc: 'Переважно рослинна їжа, зрідка м\'ясо/риба' },
];

export default function DietScreen({ navigation }) {
  const [selectedDiet, setSelectedDiet] = useState('none');

  const handleNext = () => {
    // Тут в майбутньому можна зберігати обрану дієту в базу або стейт:
    // console.log('Обрана дієта:', selectedDiet);
    navigation.navigate('Allergens');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Чи дотримуєтесь ви якихось дієт?</Text>
      <Text style={styles.subtitle}>Це допоможе нам точніше аналізувати продукти у вашому холодильнику.</Text>

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
        <CustomButton title="Далі" onPress={handleNext} />
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