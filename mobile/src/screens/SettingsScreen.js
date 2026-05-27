import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, Alert, Linking, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { settingsAPI } from '../services/api';
import CustomButton from '../components/CustomButton';
import { CHARITY } from '../utils/constants';

const AVAILABLE_CHARITIES = [
  CHARITY,
  { name: 'Фонд Сергія Притули', url: 'https://prytulafoundation.org' },
  { name: 'United24', url: 'https://u24.gov.ua' },
  { name: 'Госпітальєри', url: 'https://www.hospitallers.life/' }
];

export default function SettingsScreen({ navigation }) {
  const { user, logout, updateProfile } = useAuthStore();
  const { theme, toggleTheme, colors: COLORS, isSystemTheme, setSystemTheme } = useThemeStore();
  
  const [donationSettings, setDonationSettings] = useState({ auto_donate: false });
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', current_password: '', new_password: '', confirmPassword: '' });
  const [editErrors, setEditErrors] = useState({});

  const [selectedCharity, setSelectedCharity] = useState(AVAILABLE_CHARITIES[0]);
  const [charityModalVisible, setCharityModalVisible] = useState(false);

  useEffect(() => {
    loadSettings();
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        current_password: '',
        new_password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.getDonation();
      if (res.data) {
        setDonationSettings(res.data);
      }
    } catch (error) {
      console.log('Помилка завантаження налаштувань', error);
    }
  };

  const handleToggleDonation = async (value) => {
    setDonationSettings(prev => ({ ...prev, auto_donate: value }));
    try {
      await settingsAPI.updateDonation({ auto_donate: value });
    } catch (error) {
      setDonationSettings(prev => ({ ...prev, auto_donate: !value }));
      Alert.alert('Помилка', 'Не вдалося зберегти налаштування');
    }
  };

  const validateEditForm = () => {
    const errors = {};
    if (editForm.name.trim().length < 2) errors.name = 'Ім\'я повинно мати мінімум 2 символи';
    if (editForm.email.trim().length === 0) errors.email = 'Email не може бути пустим';
    if (!editForm.email.includes('@')) errors.email = 'Невалідний email';
    if (editForm.new_password && editForm.new_password.length < 6) errors.new_password = 'Пароль повинен мати мінімум 6 символів';
    if (editForm.new_password && !editForm.current_password) errors.current_password = 'Введіть поточний пароль';
    if (editForm.new_password !== editForm.confirmPassword) errors.confirmPassword = 'Паролі не збігаються';
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
        new_password: editForm.new_password 
      })
    };

    const res = await updateProfile(updateData);
    setSaving(false);

    if (res.success) {
      Alert.alert('Успіх', 'Профіль оновлено');
      setEditForm(prev => ({ ...prev, current_password: '', new_password: '', confirmPassword: '' }));
      setEditModalVisible(false);
    } else {
      Alert.alert('Помилка', res.error || 'Не вдалося оновити профіль');
    }
  };

  const handleLogout = () => {
    Alert.alert('Вихід', 'Ви впевнені, що хочете вийти з акаунту?', [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Вийти', style: 'destructive', onPress: logout }
    ]);
  };

  const handleThemeChange = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    toggleTheme(newTheme);
  };

  const styles = getStyles(COLORS, insets);

  const SettingItem = ({ icon, title, value, onPress, iconColor = COLORS.primary, rightComponent }) => (
    <TouchableOpacity style={styles.settingRowItem} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon} size={24} color={iconColor} />
        <Text style={styles.settingItemTitle}>{title}</Text>
      </View>
      <View style={styles.settingItemRight}>
        {rightComponent ? rightComponent : (
          <>
            {value && <Text style={styles.settingItemValue}>{value}</Text>}
            {onPress && <Ionicons name="chevron-forward" size={20} color={COLORS.outline} />}
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Налаштування</Text>
        
        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Користувач'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <CustomButton
            title="Редагувати профіль"
            variant="text"
            onPress={() => setEditModalVisible(true)}
            style={styles.editProfileButton}
            textStyle={styles.editProfileText}
            icon={<Ionicons name="pencil" size={16} color={COLORS.primary} />}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Персоналізація</Text>
          <View style={styles.card}>
            <SettingItem 
              icon={theme === 'light' ? 'sunny' : 'moon'} 
              title="Темна тема" 
              rightComponent={
                <Switch
                  value={theme === 'dark'}
                  onValueChange={handleThemeChange}
                  trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
                  thumbColor={COLORS.onPrimary}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem 
              icon="phone-portrait-outline" 
              title="Системна тема" 
              rightComponent={
                <Switch
                  value={isSystemTheme}
                  onValueChange={setSystemTheme}
                  trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
                  thumbColor={COLORS.onPrimary}
                />
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Харчування</Text>
          <View style={styles.card}>
            <SettingItem 
              icon="time-outline"
              title="Історія споживання"
              onPress={() => navigation.navigate('History')}
            />
            <View style={styles.divider} />
            <SettingItem 
              icon="restaurant-outline" 
              title="Моя дієта" 
              value="Обрати" 
              onPress={() => Alert.alert("Незабаром", "Ця функція з'явиться у наступних оновленнях.")} 
            />
            <View style={styles.divider} />
            <SettingItem 
              icon="warning-outline" 
              title="Мої алергени" 
              value="Налаштувати" 
              onPress={() => Alert.alert("Незабаром", "Ця функція з'явиться у наступних оновленнях.")}
              iconColor={COLORS.warning}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Відповідальне споживання</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="heart-circle-outline" size={32} color={COLORS.danger} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Авто-донат</Text>
                  <Text style={styles.settingDesc}>
                    Автоматично пропонувати донат, якщо продукт зіпсовано.
                  </Text>
                </View>
              </View>
              <Switch
                value={donationSettings.auto_donate}
                onValueChange={handleToggleDonation}
                trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
                thumbColor={COLORS.onPrimary}
              />
            </View>

            {donationSettings.auto_donate && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.charityRow} 
                  onPress={() => setCharityModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingInfo}>
                    <Ionicons name="globe-outline" size={28} color={COLORS.secondary} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>Фонд за замовчуванням</Text>
                      <Text style={[styles.settingDesc, { color: COLORS.secondary, fontWeight: '500' }]}>
                        {selectedCharity.name}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={COLORS.outline} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Акаунт</Text>
          <CustomButton
            title="Вийти з акаунту"
            variant="outline"
            onPress={handleLogout}
            style={styles.logoutButton}
            textStyle={{ color: COLORS.danger }}
            icon={<Ionicons name="log-out-outline" size={20} color={COLORS.danger} />}
          />
        </View>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Редагувати профіль</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close-circle" size={32} color={COLORS.outline} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Ім'я</Text>
                  <TextInput
                    style={[styles.input, editErrors.name && styles.inputError]}
                    placeholder="Введіть ім'я"
                    value={editForm.name}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                  {editErrors.name && <Text style={styles.errorText}>{editErrors.name}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={[styles.input, editErrors.email && styles.inputError]}
                    placeholder="Введіть email"
                    value={editForm.email}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                  {editErrors.email && <Text style={styles.errorText}>{editErrors.email}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Поточний пароль</Text>
                  <TextInput
                    style={[styles.input, editErrors.current_password && styles.inputError]}
                    placeholder="Введіть поточний пароль"
                    value={editForm.current_password}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, current_password: text }))}
                    secureTextEntry={true}
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                  {editErrors.current_password && <Text style={styles.errorText}>{editErrors.current_password}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Новий пароль (опціонально)</Text>
                  <TextInput
                    style={[styles.input, editErrors.new_password && styles.inputError]}
                    placeholder="Залишите пустим, щоб не змінювати"
                    value={editForm.new_password}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, new_password: text }))}
                    secureTextEntry={true}
                    placeholderTextColor={COLORS.onSurfaceVariant}
                  />
                  {editErrors.new_password && <Text style={styles.errorText}>{editErrors.new_password}</Text>}
                </View>

                {editForm.new_password !== '' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Підтвердіть пароль</Text>
                    <TextInput
                      style={[styles.input, editErrors.confirmPassword && styles.inputError]}
                      placeholder="Повторіть пароль"
                      value={editForm.confirmPassword}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, confirmPassword: text }))}
                      secureTextEntry={true}
                      placeholderTextColor={COLORS.onSurfaceVariant}
                    />
                    {editErrors.confirmPassword && <Text style={styles.errorText}>{editErrors.confirmPassword}</Text>}
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <CustomButton
                  title="Скасувати"
                  variant="outline"
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalButton}
                  disabled={saving}
                />
                <CustomButton
                  title="Зберегти"
                  onPress={handleSaveProfile}
                  loading={saving}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={charityModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCharityModalVisible(false)}
      >
        <TouchableOpacity style={styles.charityModalOverlay} activeOpacity={1} onPress={() => setCharityModalVisible(false)}>
          <View style={styles.charityModalContent}>
            <View style={styles.charityModalHeader}>
              <Text style={styles.modalTitle}>Оберіть фонд</Text>
              <TouchableOpacity onPress={() => setCharityModalVisible(false)}>
                <Ionicons name="close-circle" size={32} color={COLORS.outline} />
              </TouchableOpacity>
            </View>
            
            {AVAILABLE_CHARITIES.map((charity, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.charityOption}
                onPress={() => {
                  setSelectedCharity(charity);
                  setCharityModalVisible(false);
                }}
              >
                <View style={styles.charityOptionLeft}>
                  <Ionicons 
                    name={selectedCharity.name === charity.name ? "radio-button-on" : "radio-button-off"} 
                    size={28} 
                    color={selectedCharity.name === charity.name ? COLORS.primary : COLORS.outline} 
                  />
                  <Text style={[styles.charityOptionText, selectedCharity.name === charity.name && { color: COLORS.primary, fontWeight: '700' }]}>
                    {charity.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(charity.url)}>
                  <Ionicons name="open-outline" size={24} color={COLORS.secondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const getStyles = (COLORS, insets) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  content: { 
    paddingHorizontal: 20,
    paddingTop: insets.top || 20,
    paddingBottom: insets.bottom + 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  profileSection: { 
    alignItems: 'center', 
    marginBottom: 30, 
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 28,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatarPlaceholder: { 
    width: 96, 
    height: 96, 
    borderRadius: 48, 
    backgroundColor: COLORS.primaryContainer, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  avatarText: { 
    fontSize: 48, 
    color: COLORS.onPrimaryContainer, 
    fontWeight: '600' 
  },
  userName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.text, 
    marginBottom: 4 
  },
  userEmail: { 
    fontSize: 16, 
    color: COLORS.textLight, 
    marginBottom: 16 
  },
  editProfileButton: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  editProfileText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  section: { 
    marginBottom: 24 
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.textLight, 
    textTransform: 'uppercase', 
    marginBottom: 12, 
    paddingLeft: 4 
  },
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 24, 
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    padding: 8,
  },
  settingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16,
  },
  charityRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16,
  },
  settingInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    paddingRight: 16 
  },
  settingTextContainer: { 
    marginLeft: 16, 
    flex: 1 
  },
  settingTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text, 
    marginBottom: 4 
  },
  settingDesc: { 
    fontSize: 14, 
    color: COLORS.textLight, 
    lineHeight: 20 
  },
  divider: { 
    height: 1, 
    backgroundColor: COLORS.border, 
    marginHorizontal: 16 
  },
  settingRowItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16,
  },
  settingItemLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  settingItemTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text, 
    marginLeft: 16 
  },
  settingItemRight: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  settingItemValue: { 
    fontSize: 16, 
    color: COLORS.textLight, 
    marginRight: 12 
  },
  logoutButton: { 
    borderColor: COLORS.danger,
    backgroundColor: 'transparent',
    borderWidth: 1,
  },

  modalContainer: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: insets.bottom + 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalForm: {
    paddingHorizontal: 24,
    paddingTop: 8,
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
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalButton: {
    flex: 1,
  },
  charityModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end', 
  },
  charityModalContent: { 
    backgroundColor: COLORS.surface, 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    width: '100%', 
    padding: 24,
    paddingBottom: insets.bottom + 20,
  },
  charityModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  charityOption: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  charityOptionLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  charityOptionText: { 
    fontSize: 16, 
    color: COLORS.text, 
    marginLeft: 16,
    fontWeight: '500',
  }
});