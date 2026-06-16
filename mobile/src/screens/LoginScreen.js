/**
 * @file LoginScreen.js
 * @description Screen for user authentication.
 * Integrates email and password input fields, validation check,
 * and calls Auth Store methods to authenticate the user.
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
 * LoginScreen component.
 * Allows registered users to access their pantry inventory profile.
 * Provides inputs for email and password, and buttons for Login/Register.
 * 
 * @param {Object} props - Component properties.
 * @param {Object} props.navigation - React Navigation navigation object.
 */
export default function LoginScreen({ navigation }) {
  // Translation hook for multi-language localizations
  const { t } = useTranslation();

  // Color tokens and active theme configuration
  const { colors: COLORS, theme } = useThemeStore();

  // Local state for credentials input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Authentication store for login API and loading indicators
  const { login, isLoading } = useAuthStore();

  // Helper check for dark mode
  const isDark = theme === 'dark';

  // Dynamic stylesheet compilation
  const styles = getStyles(COLORS, isDark);

  /**
   * Submits user credentials to the auth store login helper.
   * Performs client side validation before executing request.
   */
  const handleLogin = async () => {
    // Alert user if email or password fields are empty
    if (!email || !password) return Alert.alert(t('common.error'), t('auth.emptyFields'));
    
    // Call API auth action from Zustand store
    const res = await login(email, password);
    
    // Display error message from backend if login operation failed
    if (!res.success) Alert.alert(t('common.error'), res.error);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      {/* Dismisses keybaord when user taps outside text inputs */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>

          {/* Title Header with Logo */}
          <View style={styles.header}>
            <Text style={styles.title}>Freshify</Text>
            <Text style={styles.subtitle}>{t('auth.loginSubtitle', 'Увійдіть, щоб продовжити')}</Text>
          </View>

          {/* Form input fields */}
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

          {/* Actions section with submit buttons */}
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

/**
 * Returns dynamic stylesheet configuration based on active theme colors.
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

  // ─── Header Styling ────────────────────────────────────────────────────────
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

  // ─── Form Styling ──────────────────────────────────────────────────────────
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

  // ─── Actions Styling ───────────────────────────────────────────────────────
  actions: {
    gap: 16,
  },
  button: {
    height: 56,
    borderRadius: 16,
  },
});