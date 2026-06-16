import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();

  const [name] = useState('1'); // Повертаємо костиль =)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { register, isLoading } = useAuthStore();
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

  const handleRegister = async () => {
    if (!email || !password) {
      return Alert.alert(t('common.error'), t('register.errorRequired', 'Усі поля є обов\'язковими'));
    }
    const res = await register(email, password, name);
    if (!res.success) Alert.alert(t('common.error'), res.error);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>

          <View style={styles.header}>
            <Text style={styles.title}>{t('register.title', 'Реєстрація')}</Text>
            <Text style={styles.subtitle}>{t('register.subtitle', 'Створіть акаунт, щоб почати')}</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('register.emailPlaceholder', 'Електронна пошта')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.onSurfaceVariant}
            />

            <TextInput
              style={styles.input}
              placeholder={t('register.passwordPlaceholder', 'Пароль')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.onSurfaceVariant}
            />
          </View>

          <View style={styles.actions}>
            <CustomButton
              title={t('register.btnRegister', 'Зареєструватися')}
              onPress={handleRegister}
              loading={isLoading}
              style={styles.button}
            />

            <CustomButton
              title={t('register.btnAlreadyHave', 'Вже є акаунт? Увійти')}
              variant="outline"
              onPress={() => navigation.goBack()}
              disabled={isLoading}
              style={styles.button}
            />
          </View>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    marginBottom: 40,
    alignItems: 'center'
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ─── Form ──────────────────────────────────────────────────────────────────
  form: {
    gap: 16,
    marginBottom: 32,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  // ─── Actions ───────────────────────────────────────────────────────────────
  actions: {
    gap: 16,
  },
  button: {
    height: 56,
    borderRadius: 16,
  },
});