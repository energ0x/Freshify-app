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

export default function EditProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';

  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirmPassword: '',
  });
  const [editErrors, setEditErrors] = useState({});

  useEffect(() => {
    if (user) {
      setEditForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const validateEditForm = () => {
    const errors = {};
    if (editForm.name.trim().length < 2) errors.name = t('validation.nameShort');
    if (!editForm.email.trim()) errors.email = t('validation.emailEmpty');
    if (!editForm.email.includes('@')) errors.email = t('validation.emailInvalid');
    if (editForm.new_password && editForm.new_password.length < 6)
      errors.new_password = t('validation.passShort');
    if (editForm.new_password && !editForm.current_password)
      errors.current_password = t('validation.currentPassReq');
    if (editForm.new_password !== editForm.confirmPassword)
      errors.confirmPassword = t('validation.passMismatch');

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateEditForm()) return;

    setSaving(true);
    const updateData = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      ...(editForm.new_password && {
        current_password: editForm.current_password,
        new_password: editForm.new_password,
      }),
    };

    const res = await updateProfile(updateData);
    setSaving(false);

    if (res.success) {
      Alert.alert(t('common.success'), t('settings.profileUpdated'));
      navigation.goBack();
    } else {
      Alert.alert(t('common.error'), res.error || t('settings.profileUpdateError'));
    }
  };

  const heroBg = isDark ? COLORS.primaryContainer : COLORS.primary;
  const heroContentColor = isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary;

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
          {/* ─── Hero Section ────────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            <View style={styles.bCircle1} />
            <View style={styles.bCircle2} />

            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="close" size={26} color={heroContentColor} />
            </TouchableOpacity>

            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={40} color={heroContentColor} />
            </View>

            <Text style={styles.heroTitle}>{t('settings.editProfileTitle')}</Text>
          </View>

          {/* ─── Form Container ──────────────────────────────────────────── */}
          <View style={styles.formContainer}>
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

        {/* ─── Actions ─────────────────────────────────────────────────── */}
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

const getStyles = (COLORS, insets, isDark, heroBg, heroContentColor) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1
  },

  // ─── Hero Section ──────────────────────────────────────────────────────────
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

  // ─── Form Elements ─────────────────────────────────────────────────────────
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

  // ─── Actions ───────────────────────────────────────────────────────────────
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