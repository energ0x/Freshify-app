/**
 * @file RegisterScreen.js
 * @description Screen component that handles user registration. It allows new users to create
 * an account using an email and password. It supports localization, dynamic themes, and form validation.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

/**
 * RegisterScreen component.
 * Renders registration fields and invokes register handler from auth store.
 * 
 * @param {object} props.navigation - React Navigation object for screen transitions.
 */
export default function RegisterScreen({ navigation }) {
  // Localization hook for multi-language support.
  const { t } = useTranslation();
  // Theme hook for responsive design colors.
  const { colors: COLORS, theme } = useThemeStore();

  // Temporary name state (preset to keep consistency with backend expectations).
  const [name] = useState('1'); 
  // User input states for email and password.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register function and loading state from Auth zustand store.
  const { register, isLoading } = useAuthStore();
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

  /**
   * Validates form fields and dispatches registration request to the backend.
   * Displays an alert in case of empty fields or server errors.
   */
  const handleRegister = async () => {
    // Check if required fields are provided
    if (!email || !password) {
      return Alert.alert(t('common.error'), t('register.errorRequired', 'Усі поля є обов\'язковими'));
    }
    
    // Call registration method in auth store
    const res = await register(email, password, name);
    
    // Alert the user if the registration fails
    if (!res.success) {
      Alert.alert(t('common.error'), res.error);
    }
  };

  return (
    // KeyboardAvoidingView prevents keyboard from overlapping text inputs
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Set status bar style dynamically matching theme background */}
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      {/* Dismiss keyboard when clicking outside form fields */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>

          {/* Header section presenting registration title */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('register.title', 'Реєстрація')}</Text>
            <Text style={styles.subtitle}>{t('register.subtitle', 'Створіть акаунт, щоб почати')}</Text>
          </View>

          {/* Registration Form inputs */}
          <View style={styles.form}>
            {/* Email Input Field */}
            <TextInput
              style={styles.input}
              placeholder={t('register.emailPlaceholder', 'Електронна пошта')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.onSurfaceVariant}
            />

            {/* Password Input Field */}
            <TextInput
              style={styles.input}
              placeholder={t('register.passwordPlaceholder', 'Пароль')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={COLORS.onSurfaceVariant}
            />
          </View>

          {/* Action buttons section */}
          <View style={styles.actions}>
            {/* Submit Registration Button */}
            <CustomButton
              title={t('register.btnRegister', 'Зареєструватися')}
              onPress={handleRegister}
              loading={isLoading}
              style={styles.button}
            />

            {/* Navigation back to Login Screen */}
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

/**
 * Generates Stylesheet dynamically based on active theme colors.
 * 
 * @param {object} COLORS - Active theme color palette.
 * @param {boolean} isDark - Flag representing dark theme mode.
 * @returns {object} StyleSheet object.
 */
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