import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert(t('common.error'), t('auth.emptyFields'));
    const res = await login(email, password);
    if (!res.success) Alert.alert(t('common.error'), res.error);
  };

  return (
    <View style={styles.container}>
      {/* Назву додатку зазвичай не перекладають, тому залишаємо Freshify */}
      <Text style={styles.title}>Freshify</Text> 
      <TextInput
        style={styles.input}
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={COLORS.textLight}
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={COLORS.textLight}
      />
      <CustomButton 
        title={t('auth.loginBtn')} 
        onPress={handleLogin} 
        loading={isLoading} 
        style={styles.button} 
      />
      <CustomButton 
        title={t('auth.registerBtn')} 
        variant="outline" 
        onPress={() => navigation.navigate('Register')} 
        disabled={isLoading} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: COLORS.background },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginBottom: 40, textAlign: 'center' },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16, color: COLORS.text },
  button: { marginBottom: 16 },
});