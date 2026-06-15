import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import CustomButton from '../../components/CustomButton';
import useAuthStore from '../../store/authStore';
import { COLORS } from '../../utils/constants';

export default function WelcomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { updateProfile } = useAuthStore();
  const [name, setName] = useState(''); //дуже коряве виправлення багу з реєстрацією
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    if (!name.trim()) {
      return Alert.alert(t('common.error'), t('welcome.emptyNameError'));
    }

    setIsSubmitting(true);
    const res = await updateProfile({ name: name.trim() });
    setIsSubmitting(false);

    if (res.success) {
      navigation.navigate('Diet');
    } else {
      Alert.alert(t('welcome.updateErrorTitle'), res.error || t('welcome.updateErrorMessage'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{t('welcome.subtitle')} 🌱</Text>
      <Text style={styles.title}>{t('welcome.title')}</Text>
      
      <TextInput
        style={styles.input}
        placeholder={t('welcome.placeholder')}
        placeholderTextColor={COLORS.textLight}
        value={name}
        onChangeText={setName}
        autoFocus
        maxLength={30}
      />

      <CustomButton 
        title={isSubmitting ? t('welcome.saving') : t('common.next')} 
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