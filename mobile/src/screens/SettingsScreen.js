import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, Alert, Linking, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import { settingsAPI } from '../services/api';
import CustomButton from '../components/CustomButton';
import { COLORS, CHARITY } from '../utils/constants';

// Список доступних фондів для вибору
const AVAILABLE_CHARITIES = [
  CHARITY, // З ваших constants.js
  { name: 'Фонд Сергія Притули', url: 'https://prytulafoundation.org' },
  { name: 'United24', url: 'https://u24.gov.ua' },
  { name: 'Госпітальєри', url: 'https://www.hospitallers.life/' }
];

export default function SettingsScreen({ navigation }) {
  const { user, logout, updateProfile } = useAuthStore();
  const [donationSettings, setDonationSettings] = useState({ auto_donate: false });
  const [saving, setSaving] = useState(false);
  
  // Стани для модалки редагування профілю
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', current_password: '', new_password: '', confirmPassword: '' });
  const [editErrors, setEditErrors] = useState({});

  // Стани для вибору фонду та персоналізації
  const [selectedCharity, setSelectedCharity] = useState(AVAILABLE_CHARITIES[0]);
  const [charityModalVisible, setCharityModalVisible] = useState(false);
  const [theme, setTheme] = useState('Світла'); // Локальний стан для теми

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

  const toggleTheme = () => {
    setTheme(prev => prev === 'Світла' ? 'Темна' : 'Світла');
    // Тут в майбутньому можна додати логіку зміни теми у всьому застосунку
  };

  // Допоміжний компонент для клікабельних рядків
  const SettingItem = ({ icon, title, value, onPress, iconColor = COLORS.primary }) => (
    <TouchableOpacity style={styles.settingRowItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text style={styles.settingItemTitle}>{title}</Text>
      </View>
      <View style={styles.settingItemRight}>
        {value && <Text style={styles.settingItemValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Секція Профілю */}
        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Користувач'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
            <Text style={styles.editProfileText}>Редагувати профіль</Text>
          </TouchableOpacity>
        </View>

        {/* НОВА СЕКЦІЯ: Персоналізація */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Персоналізація</Text>
          <View style={styles.card}>
            <SettingItem 
              icon={theme === 'Світла' ? 'sunny' : 'moon'} 
              title="Тема оформлення" 
              value={theme} 
              onPress={toggleTheme} 
            />
            <View style={styles.divider} />
            <SettingItem 
              icon="restaurant-outline" 
              title="Моя дієта" 
              value="Обрати" 
              onPress={() => navigation.navigate('Diet')} 
            />
            <View style={styles.divider} />
            <SettingItem 
              icon="warning-outline" 
              title="Мої алергени" 
              value="Налаштувати" 
              onPress={() => navigation.navigate('Allergens')} 
              iconColor={COLORS.warning}
            />
          </View>
        </View>

        {/* Секція Відповідального споживання */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Відповідальне споживання</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="heart" size={24} color={COLORS.danger} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Авто-донат за зіпсовані продукти</Text>
                  <Text style={styles.settingDesc}>
                    Якщо ви не встигли спожити продукт, застосунок запропонує перерахувати його вартість на ЗСУ.
                  </Text>
                </View>
              </View>
              <Switch
                value={donationSettings.auto_donate}
                onValueChange={handleToggleDonation}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            {/* ВІДОБРАЖАЄМО ФОНД ТІЛЬКИ ЯКЩО АВТО-ДОНАТ УВІМКНЕНО */}
            {donationSettings.auto_donate && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.charityRow} 
                  onPress={() => setCharityModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingInfo}>
                    <Ionicons name="globe-outline" size={24} color={COLORS.secondary} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>Фонд за замовчуванням</Text>
                      <Text style={[styles.settingDesc, { color: COLORS.secondary, fontWeight: '500' }]}>
                        {selectedCharity.name}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Секція Акаунту */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Акаунт</Text>
          <CustomButton
            title="Вийти з акаунту"
            variant="outline"
            onPress={handleLogout}
            style={styles.logoutButton}
            textStyle={{ color: COLORS.danger }}
          />
        </View>
      </ScrollView>

      {/* МОДАЛКА: Редагування профілю (ваша існуюча) */}
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
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Редагувати профіль</Text>
                <View style={{ width: 28 }} />
              </View>

              <ScrollView style={styles.modalForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Ім'я</Text>
                  <TextInput
                    style={[styles.input, editErrors.name && styles.inputError]}
                    placeholder="Введіть ім'я"
                    value={editForm.name}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                    placeholderTextColor={COLORS.textLight}
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
                    placeholderTextColor={COLORS.textLight}
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
                    placeholderTextColor={COLORS.textLight}
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
                    placeholderTextColor={COLORS.textLight}
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
                      placeholderTextColor={COLORS.textLight}
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

      {/* НОВА МОДАЛКА: Вибір фонду */}
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
                <Ionicons name="close" size={24} color={COLORS.text} />
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
                    size={24} 
                    color={selectedCharity.name === charity.name ? COLORS.primary : COLORS.textLight} 
                  />
                  <Text style={[styles.charityOptionText, selectedCharity.name === charity.name && { color: COLORS.primary, fontWeight: 'bold' }]}>
                    {charity.name}
                  </Text>
                </View>
                {/* Кнопка для переходу на сайт фонду */}
                <TouchableOpacity onPress={() => Linking.openURL(charity.url)}>
                  <Ionicons name="open-outline" size={20} color={COLORS.secondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  profileSection: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  userEmail: { fontSize: 16, color: COLORS.textLight, marginBottom: 12 },
  editProfileButton: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: `${COLORS.primary}15`,
  },
  editProfileText: { marginLeft: 6, color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textLight, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, padding: 16 },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  settingInfo: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 16 },
  settingTextContainer: { marginLeft: 12, flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: COLORS.text, marginBottom: 4 },
  settingDesc: { fontSize: 13, color: COLORS.textLight, lineHeight: 18 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  
  // Стилі для нових кнопок персоналізації
  settingRowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  settingItemLeft: { flexDirection: 'row', alignItems: 'center' },
  settingItemTitle: { fontSize: 16, fontWeight: '500', color: COLORS.text, marginLeft: 12 },
  settingItemRight: { flexDirection: 'row', alignItems: 'center' },
  settingItemValue: { fontSize: 14, color: COLORS.textLight, marginRight: 8 },

  logoutButton: { borderColor: COLORS.danger, borderWidth: 1, backgroundColor: 'transparent' },

  // Стилі модалки редагування профілю (без змін)
  modalContainer: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  modalForm: { paddingHorizontal: 20, paddingVertical: 20 },
  formGroup: { marginBottom: 18 },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.text },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  modalButton: { flex: 1 },

  // Стилі модалки вибору фонду
  charityModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  charityModalContent: { backgroundColor: COLORS.surface, borderRadius: 16, width: '100%', padding: 20 },
  charityModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  charityOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  charityOptionLeft: { flexDirection: 'row', alignItems: 'center' },
  charityOptionText: { fontSize: 16, color: COLORS.text, marginLeft: 12 }
});