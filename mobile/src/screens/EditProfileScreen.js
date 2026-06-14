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
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

export default function EditProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  
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
      navigation.goBack(); // Повертаємося на екран налаштувань після збереження
    } else {
      Alert.alert(t('common.error'), res.error || t('settings.profileUpdateError'));
    }
  };

  const styles = getStyles(COLORS, insets, theme);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.editProfileTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
                placeholderTextColor={COLORS.onSurfaceVariant}
              />
              {editErrors[key] && <Text style={styles.errorText}>{editErrors[key]}</Text>}
            </View>
          ))}

          {editForm.new_password !== '' && (
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
              {editErrors.confirmPassword && (
                <Text style={styles.errorText}>{editErrors.confirmPassword}</Text>
              )}
            </View>
          )}
        </ScrollView>
        
        {/* Кнопки дій */}
        <View style={styles.actionsContainer}>
          <CustomButton 
            title={t('common.save')} 
            onPress={handleSaveProfile} 
            loading={saving} 
            style={styles.saveButton} 
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (COLORS, insets, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
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
    marginTop: 5,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    paddingBottom: (insets.bottom || 20) + 10,
    paddingTop: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: `${COLORS.text}10`,
  },
  saveButton: {
    width: '100%',
  },
});