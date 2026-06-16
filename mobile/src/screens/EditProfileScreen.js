/**
 * @file EditProfileScreen.js
 * @description Screen for editing the user's profile information (name, email, and password).
 * Integrates with authentication stores, theme state, safe-area inserts, and localization (i18next).
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

/**
 * EditProfileScreen component.
 * Allows users to update their profile details like full name, email, and change their account password.
 * 
 * @param {Object} props - Component properties.
 * @param {Object} props.navigation - React Navigation navigation object.
 */
export default function EditProfileScreen({ navigation }) {
  // Localization hook for multi-language support
  const { t } = useTranslation();

  // Authentication store for user profile data and updating profile API/action call
  const { user, updateProfile } = useAuthStore();

  // Theme store hooks for managing theme-based colors and mode (light/dark)
  const { colors: COLORS, theme } = useThemeStore();

  // Safe area hook to handle screen padding/insets on devices with notches
  const insets = useSafeAreaInsets();

  // Helper check for dark mode
  const isDark = theme === 'dark';

  // State flag to track ongoing API/service save operations
  const [saving, setSaving] = useState(false);

  // Local state form object representing profile data and optional password change
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirmPassword: '',
  });

  // Local state for tracking form validation errors mapped to field keys
  const [editErrors, setEditErrors] = useState({});

  // Populate form fields with current logged-in user details once the user data is available
  useEffect(() => {
    if (user) {
      setEditForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  /**
   * Validates the profile edit form entries.
   * checks for:
   * - Name length (minimum 2 characters)
   * - Valid email presence and format
   * - Correct password strength and confirmation match if updating password
   * 
   * @returns {boolean} True if the form is valid, false otherwise.
   */
  const validateEditForm = () => {
    const errors = {};
    if (editForm.name.trim().length < 2) errors.name = t('validation.nameShort');
    if (!editForm.email.trim()) errors.email = t('validation.emailEmpty');
    if (!editForm.email.includes('@')) errors.email = t('validation.emailInvalid');
    
    // Check password rules only if user attempts to change the password
    if (editForm.new_password && editForm.new_password.length < 6)
      errors.new_password = t('validation.passShort');
    if (editForm.new_password && !editForm.current_password)
      errors.current_password = t('validation.currentPassReq');
    if (editForm.new_password !== editForm.confirmPassword)
      errors.confirmPassword = t('validation.passMismatch');

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles submitting profile updates to the authentication store/service.
   * If saving succeeds, alerts the user and navigates back. Otherwise displays an error alert.
   */
  const handleSaveProfile = async () => {
    if (!validateEditForm()) return;

    setSaving(true);
    
    // Construct request body, omitting password fields if not being updated
    const updateData = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      ...(editForm.new_password && {
        current_password: editForm.current_password,
        new_password: editForm.new_password,
      }),
    };

    // Perform profile update API call
    const res = await updateProfile(updateData);
    setSaving(false);

    if (res.success) {
      Alert.alert(t('common.success'), t('settings.profileUpdated'));
      navigation.goBack();
    } else {
      Alert.alert(t('common.error'), res.error || t('settings.profileUpdateError'));
    }
  };

  // Determine background and text colors for the top hero section based on active theme
  const heroBg = isDark ? COLORS.primaryContainer : COLORS.primary;
  const heroContentColor = isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary;

  // Retrieve styled component stylesheet dynamically
  const styles = getStyles(COLORS, insets, isDark, heroBg, heroContentColor);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={heroBg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Hero Header Section ────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            {/* Visual background circles for aesthetic styling */}
            <View style={styles.bCircle1} />
            <View style={styles.bCircle2} />

            {/* Back button to dismiss the screen */}
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="close" size={26} color={heroContentColor} />
            </TouchableOpacity>

            {/* Generic user avatar placeholder */}
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={40} color={heroContentColor} />
            </View>

            <Text style={styles.heroTitle}>{t('settings.editProfileTitle')}</Text>
          </View>

          {/* ─── Form Container ──────────────────────────────────────────── */}
          <View style={styles.formContainer}>
            {/* Map over form configuration to generate input fields dynamically */}
            {[
              { key: 'name', label: t('settings.nameLabel'), placeholder: t('settings.namePlaceholder'), secure: false },
              { key: 'email', label: t('settings.emailLabel'), placeholder: t('settings.emailPlaceholder'), secure: false, keyboard: 'email-address' },
              { key: 'current_password', label: t('settings.currentPasswordLabel'), placeholder: t('settings.currentPasswordPlaceholder'), secure: true },
              { key: 'new_password', label: t('settings.newPasswordLabel'), placeholder: t('settings.newPasswordPlaceholder'), secure: true },
            ].map(({ key, label, placeholder, secure, keyboard }) => (
              <View key={key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{label}</Text>
                <TextInput
                  style={[styles.input, editErrors[key] && styles.inputError]}
                  placeholder={placeholder}
                  value={editForm[key]}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, [key]: text }))}
                  secureTextEntry={secure}
                  keyboardType={keyboard ?? 'default'}
                  autoCapitalize="none"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                />
                {editErrors[key] ? <Text style={styles.errorText}>{editErrors[key]}</Text> : null}
              </View>
            ))}

            {/* Render password confirmation field only when user fills the new password input */}
            {editForm.new_password !== '' ? (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('settings.confirmPasswordLabel')}</Text>
                <TextInput
                  style={[styles.input, editErrors.confirmPassword && styles.inputError]}
                  placeholder={t('settings.confirmPasswordPlaceholder')}
                  value={editForm.confirmPassword}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, confirmPassword: text }))}
                  secureTextEntry
                  placeholderTextColor={COLORS.onSurfaceVariant}
                />
                {editErrors.confirmPassword ? (
                  <Text style={styles.errorText}>{editErrors.confirmPassword}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* ─── Actions Section (Save Button) ─────────────────────────────────── */}
        <View style={styles.actionSection}>
          <TouchableOpacity
             style={styles.saveBtn}
             onPress={handleSaveProfile}
             activeOpacity={0.8}
             disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? t('common.save') + "..." : t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * Returns dynamic stylesheet configuration based on active theme colors and device status bar insets.
 */
const getStyles = (COLORS, insets, isDark, heroBg, heroContentColor) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1
  },

  // ─── Hero Section Styling ──────────────────────────────────────────────────
  heroSection: {
    backgroundColor: heroBg,
    paddingTop: insets.top + 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: isDark ? '#000' : heroBg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 32,
  },
  bCircle1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
  bCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -20 },

  closeButton: {
    position: 'absolute',
    top: insets.top + 10,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },

  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: heroContentColor,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // ─── Form Elements Styling ─────────────────────────────────────────────────
  formContainer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  input: {
    height: 52,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: COLORS.error || '#FF3B30',
    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : '#FFECEB',
  },
  errorText: {
    color: COLORS.error || '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },

  // ─── Actions Styling ───────────────────────────────────────────────────────
  actionSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  saveBtnText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});