import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import useAuthStore from '../store/authStore';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Помилка', 'Введіть email та пароль');
    const res = await login(email, password);
    if (!res.success) Alert.alert('Помилка', res.error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Freshify</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <CustomButton title="Увійти" onPress={handleLogin} loading={isLoading} style={styles.button} />
      <CustomButton title="Реєстрація" variant="outline" onPress={() => navigation.navigate('Register')} disabled={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: COLORS.background },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginBottom: 40, textAlign: 'center' },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  button: { marginBottom: 16 },
});