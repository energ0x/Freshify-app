import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert(t('common.error'), t('auth.emptyFields'));
    const res = await login(email, password);
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
            <Text style={styles.title}>Freshify</Text>
            <Text style={styles.subtitle}>{t('auth.loginSubtitle', 'Увійдіть, щоб продовжити')}</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.onSurfaceVariant}
            />

            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.onSurfaceVariant}
            />
          </View>

          <View style={styles.actions}>
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
    marginBottom: 48,
    alignItems: 'center'
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
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