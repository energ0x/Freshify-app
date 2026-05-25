import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomButton from '../../components/CustomButton';
import useAuthStore from '../../store/authStore';
import { COLORS } from '../../utils/constants';

export default function WelcomeScreen({ navigation }) {
  const { user, updateProfile } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    if (!name.trim()) {
      return Alert.alert('Помилка', 'Будь ласка, введіть ваше ім\'я');
    }

    setIsSubmitting(true);
    const res = await updateProfile({ name: name.trim() });
    setIsSubmitting(false);

    if (res.success) {
      navigation.navigate('Diet');
    } else {
      Alert.alert('Помилка оновлення', res.error || 'Не вдалося зберегти ім\'я');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Вітаємо у Freshify! 🌱</Text>
      <Text style={styles.title}>Як до вас звертатися?</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Ваше ім'я"
        placeholderTextColor={COLORS.textLight}
        value={name}
        onChangeText={setName}
        autoFocus
        maxLength={30}
      />

      <CustomButton 
        title={isSubmitting ? "Зберігаємо..." : "Далі"} 
        onPress={handleNext} 
        disabled={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  subtitle: { fontSize: 18, color: COLORS.primary, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 32, textAlign: 'center' },
  input: {
    backgroundColor: COLORS.surface || '#fff',
    borderWidth: 1,
    borderColor: COLORS.border || '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});