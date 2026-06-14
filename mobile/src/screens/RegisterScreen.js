import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const [name, setName] = useState('1');  // це костиль!=) бекенд очікує що людина надішле ім'я
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    if (!email || !password) return Alert.alert(t('common.error'), t('register.errorRequired'));
    const res = await register(email, password, name);
    if (!res.success) Alert.alert(t('common.error'), res.error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('register.title')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('register.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder={t('register.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <CustomButton title={t('register.btnRegister')} onPress={handleRegister} loading={isLoading} style={styles.button} />
      <CustomButton title={t('register.btnAlreadyHave')} variant="outline" onPress={() => navigation.goBack()} disabled={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: COLORS.background },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  button: { marginBottom: 16 },
});