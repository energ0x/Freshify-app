import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import CustomButton from '../../components/CustomButton';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

export default function WelcomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { updateProfile } = useAuthStore();
  const { colors: COLORS, theme } = useThemeStore();

  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>

          <View style={styles.header}>
            <Text style={styles.subtitle}>{t('welcome.subtitle')} 🌱</Text>
            <Text style={styles.title}>{t('welcome.title')}</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('welcome.placeholder')}
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={30}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.actions}>
            <CustomButton
              title={isSubmitting ? t('welcome.saving') : t('common.next')}
              onPress={handleNext}
              disabled={isSubmitting}
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
  subtitle: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5
  },

  // ─── Form ──────────────────────────────────────────────────────────────────
  form: {
    marginBottom: 32,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  // ─── Actions ───────────────────────────────────────────────────────────────
  actions: {
    marginTop: 8,
  },
  button: {
    height: 56,
    borderRadius: 16,
  }
});