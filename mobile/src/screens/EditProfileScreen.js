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
  const styles = getStyles(COLORS, insets, isDark, heroBg);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={heroBg} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.bCircle1} />
            <View style={styles.bCircle2} />
            
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={44} color={isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary} />
            </View>
            
            <Text style={styles.heroTitle}>{t('settings.editProfileTitle')}</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Поля форми */}
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
                  placeholderTextColor={COLORS.textLight}
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
                  placeholderTextColor={COLORS.textLight}
                />
                {editErrors.confirmPassword ? (
                  <Text style={styles.errorText}>{editErrors.confirmPassword}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
        
        {/* Кнопки дій */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
             style={styles.subscribeBtn} 
             onPress={handleSaveProfile} 
             activeOpacity={0.85}
             disabled={saving}
          >
            <Text style={styles.subscribeBtnText}>
              {saving ? t('common.save') + "..." : t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (COLORS, insets, isDark, heroBg) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: { 
    paddingBottom: 40, 
    flexGrow: 1 
  },
  
  heroSection: {
    backgroundColor: heroBg,
    paddingTop: Platform.OS === 'ios' ? 40 : insets.top + 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: isDark ? '#000' : COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 15,
    elevation: 4,
    marginBottom: 24,
  },
  bCircle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
  bCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -20 },
  
  closeButton: { position: 'absolute', top: Platform.OS === 'ios' ? 20 : insets.top + 10, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary, textAlign: 'center' },

  formContainer: {
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.danger ?? '#FF3B30',
    backgroundColor: `${COLORS.danger ?? '#FF3B30'}08`,
  },
  errorText: {
    color: COLORS.danger ?? '#FF3B30',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  
  actionSection: { 
    paddingHorizontal: 20,
    paddingBottom: (insets.bottom || 20) + 10,
    paddingTop: 10,
  },
  subscribeBtn: { 
    backgroundColor: COLORS.primary, 
    borderRadius: 16, 
    height: 56, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: COLORS.primary, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4 
  },
  subscribeBtnText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: 'bold' },
});