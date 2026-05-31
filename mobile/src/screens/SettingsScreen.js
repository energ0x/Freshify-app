import React, { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Switch, Alert, Linking,
  Modal, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, StatusBar, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { settingsAPI } from '../services/api';
import CustomButton from '../components/CustomButton';
import { CHARITY } from '../utils/constants';

const AVAILABLE_CHARITIES = [
  CHARITY,
  { name: 'Фонд Сергія Притули', url: 'https://prytulafoundation.org' },
  { name: 'United24', url: 'https://u24.gov.ua' },
  { name: 'Госпітальєри', url: 'https://www.hospitallers.life/' },
];

// Мокові дані для гейміфікації (у майбутньому братимуться зі store)
const USER_STATS = {
  level: 12,
  currentXP: 1450,
  achievementsUnlocked: 2,
  totalAchievements: 6
};

export default function SettingsScreen({ navigation }) {
  const { user, logout, updateProfile } = useAuthStore();
  const { theme, toggleTheme, colors: COLORS, isSystemTheme, setSystemTheme } = useThemeStore();

  const [donationSettings, setDonationSettings] = useState({ auto_donate: false });
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', email: '', current_password: '', new_password: '', confirmPassword: '',
  });
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
        confirmPassword: '',
      });
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.getDonation();
      if (res.data) setDonationSettings(res.data);
    } catch (e) {
      console.log('Settings load error', e);
    }
  };

  const handleToggleDonation = async (value) => {
    setDonationSettings(prev => ({ ...prev, auto_donate: value }));
    try {
      await settingsAPI.updateDonation({ auto_donate: value });
    } catch {
      setDonationSettings(prev => ({ ...prev, auto_donate: !value }));
      Alert.alert('Помилка', 'Не вдалося зберегти налаштування');
    }
  };

  const validateEditForm = () => {
    const errors = {};
    if (editForm.name.trim().length < 2) errors.name = "Ім'я повинно мати мінімум 2 символи";
    if (!editForm.email.trim()) errors.email = 'Email не може бути пустим';
    if (!editForm.email.includes('@')) errors.email = 'Невалідний email';
    if (editForm.new_password && editForm.new_password.length < 6)
      errors.new_password = 'Пароль повинен мати мінімум 6 символів';
    if (editForm.new_password && !editForm.current_password)
      errors.current_password = 'Введіть поточний пароль';
    if (editForm.new_password !== editForm.confirmPassword)
      errors.confirmPassword = 'Паролі не збігаються';
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
      { text: 'Вийти', style: 'destructive', onPress: logout },
    ]);
  };

  const handleShareSuccess = async () => {
    try {
      await Share.share({
        message: `Я вже досяг(ла) ${USER_STATS.level} рівня у Freshify, рятую продукти від смітника та зменшую свій еко-слід! Приєднуйся до мене 🌱`,
      });
    } catch (error) {
      console.log('Помилка при спробі поділитися', error);
    }
  };

  const styles = getStyles(COLORS, insets, tabBarHeight);

  const SettingItem = ({ icon, title, value, onPress, iconBgColor, rightComponent }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: iconBgColor ?? `${COLORS.primary}18` }]}>
          <Ionicons name={icon} size={17} color={iconBgColor ? '#fff' : COLORS.primary} />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        {rightComponent ?? (
          <>
            {!!value && <Text style={styles.settingValue}>{value}</Text>}
            {onPress && <Ionicons name="chevron-forward" size={16} color={COLORS.outline} />}
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── Профіль ───────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.profileBanner}>
            <View style={styles.bCircle1} />
            <View style={styles.bCircle2} />
            <View style={styles.bCircle3} />
          </View>

          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
            </View>
          </View>

          <Text style={styles.profileName}>{user?.name || 'Користувач'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>

          <TouchableOpacity style={styles.editPill} onPress={() => setEditModalVisible(true)} activeOpacity={0.8}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
            <Text style={styles.editPillText}>Редагувати профіль</Text>
          </TouchableOpacity>
        </View>

        {/* ── Гейміфікація та Прогрес ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Мій Прогрес</Text>
        <TouchableOpacity 
          style={styles.progressCard} 
          onPress={() => navigation.navigate('Achievements')}
          activeOpacity={0.8}
        >
          <View style={styles.progressStat}>
            <View style={[styles.iconBox, { backgroundColor: `${COLORS.primary}18`, width: 40, height: 40, borderRadius: 12 }]}>
              <Ionicons name="star" size={22} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.progressValue}>{USER_STATS.currentXP} XP</Text>
              <Text style={styles.progressLabel}>Рівень {USER_STATS.level}</Text>
            </View>
          </View>
          
          <View style={styles.progressDivider} />
          
          <View style={styles.progressStat}>
            <View style={[styles.iconBox, { backgroundColor: '#F39C1218', width: 40, height: 40, borderRadius: 12 }]}>
              <Ionicons name="trophy" size={22} color="#F39C12" />
            </View>
            <View>
              <Text style={styles.progressValue}>{USER_STATS.achievementsUnlocked} / {USER_STATS.totalAchievements}</Text>
              <Text style={styles.progressLabel}>Досягнень</Text>
            </View>
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Кнопка "Поділитися успіхами" */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareSuccess}>
          <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
          <Text style={styles.shareBtnText}>Поділитися успіхами</Text>
        </TouchableOpacity>

        {/* ── Преміум Підписка ───────────────────────────────────────────── */}
        <TouchableOpacity 
          style={styles.premiumCard} 
          onPress={() => navigation.navigate('Premium')}
          activeOpacity={0.9}
        >
          <View style={styles.premiumIconWrap}>
            <Ionicons name="diamond" size={26} color="#FFD700" />
          </View>
          <View style={styles.premiumTextWrap}>
            <Text style={styles.premiumTitle}>Freshify Premium</Text>
            <Text style={styles.premiumDesc}>Безлімітні рецепти, розумне сканування та розширена аналітика</Text>
          </View>
        </TouchableOpacity>

        {/* ── Персоналізація ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Персоналізація</Text>
        <View style={styles.card}>
          <SettingItem
            icon={theme === 'light' ? 'sunny' : 'moon'}
            title="Темна тема"
            iconBgColor={theme === 'light' ? '#FF9500' : '#5A5DE8'}
            rightComponent={
              <Switch
                value={theme === 'dark'}
                onValueChange={(v) => toggleTheme(v ? 'dark' : 'light')}
                trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
                thumbColor={COLORS.onPrimary ?? '#fff'}
              />
            }
          />
          <View style={styles.divider} />
          <SettingItem
            icon="phone-portrait-outline"
            title="Системна тема"
            iconBgColor="#5856D6"
            rightComponent={
              <Switch
                value={isSystemTheme}
                onValueChange={setSystemTheme}
                trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
                thumbColor={COLORS.onPrimary ?? '#fff'}
              />
            }
          />
        </View>

        {/* ── Харчування ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Харчування</Text>
        <View style={styles.card}>
          <SettingItem
            icon="restaurant-outline"
            title="Моя дієта"
            value="Обрати"
            iconBgColor="#FF6B35"
            onPress={() => navigation.navigate('DietSettings')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="warning-outline"
            title="Мої алергени"
            value="Налаштувати"
            iconBgColor="#FF3B30"
            onPress={() => navigation.navigate('AllergensSettings')}
          />
          <SettingItem
            icon="warning-outline"
            title="Мої категорії"
            value="Налаштувати"
            iconBgColor="#FF3B30"
            onPress={() => navigation.navigate('Categories')}
          />
        </View>

        {/* ── Відповідальне споживання ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Відповідальне споживання</Text>

        <View style={styles.card}>
          <View style={styles.donateHeader}>
            <View style={styles.donateIconWrap}>
              <Ionicons name="heart-circle-outline" size={30} color={COLORS.danger ?? '#FF2D55'} />
            </View>
            <View style={styles.donateTexts}>
              <Text style={styles.donateTitle}>Авто-донат</Text>
              <Text style={styles.donateDesc}>
                Автоматично пропонувати донат,{'\n'}якщо продукт зіпсовано.
              </Text>
            </View>
            <Switch
              value={donationSettings.auto_donate}
              onValueChange={handleToggleDonation}
              trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
              thumbColor={COLORS.onPrimary ?? '#fff'}
            />
          </View>

          {donationSettings.auto_donate && (
            <>
              <View style={styles.divider} />
              <SettingItem
                icon="globe-outline"
                title="Фонд за замовчуванням"
                iconBgColor="#007AFF"
                onPress={() => setCharityModalVisible(true)}
                rightComponent={
                  <View style={styles.charityChip}>
                    <Text style={styles.charityChipText} numberOfLines={1}>{selectedCharity.name}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.outline} />
                  </View>
                }
              />
            </>
          )}
        </View>

        {/* ── Акаунт ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Акаунт</Text>
        <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.75}>
          <View style={[styles.iconBox, { backgroundColor: '#FF3B3018' }]}>
            <Ionicons name="log-out-outline" size={17} color="#FF3B30" />
          </View>
          <Text style={styles.logoutText}>Вийти з акаунту</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF3B30" />
        </TouchableOpacity>

      </ScrollView>

      {/* ── Edit Profile Modal ──────────────────────────────────────────── */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Редагувати профіль</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close-circle" size={30} color={COLORS.outline} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {[
                  { key: 'name', label: "Ім'я", placeholder: "Введіть ім'я", secure: false },
                  { key: 'email', label: 'Email', placeholder: 'Введіть email', secure: false, keyboard: 'email-address' },
                  { key: 'current_password', label: 'Поточний пароль', placeholder: 'Введіть поточний пароль', secure: true },
                  { key: 'new_password', label: 'Новий пароль (опціонально)', placeholder: 'Залишите пустим, щоб не змінювати', secure: true },
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
                    <Text style={styles.formLabel}>Підтвердіть пароль</Text>
                    <TextInput
                      style={[styles.input, editErrors.confirmPassword && styles.inputError]}
                      placeholder="Повторіть пароль"
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

              <View style={styles.modalActions}>
                <CustomButton title="Скасувати" variant="outline" onPress={() => setEditModalVisible(false)} style={styles.modalBtn} disabled={saving} />
                <CustomButton title="Зберегти" onPress={handleSaveProfile} loading={saving} style={styles.modalBtn} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Charity Modal ─────────────────────────────────────────────────── */}
      <Modal visible={charityModalVisible} animationType="fade" transparent onRequestClose={() => setCharityModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCharityModalVisible(false)}>
          <View style={styles.charitySheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Оберіть фонд</Text>
              <TouchableOpacity onPress={() => setCharityModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={COLORS.outline} />
              </TouchableOpacity>
            </View>
            {AVAILABLE_CHARITIES.map((charity, index) => (
              <TouchableOpacity key={index} style={styles.charityOption} onPress={() => { setSelectedCharity(charity); setCharityModalVisible(false); }}>
                <View style={styles.charityOptionLeft}>
                  <Ionicons name={selectedCharity.name === charity.name ? 'radio-button-on' : 'radio-button-off'} size={22} color={selectedCharity.name === charity.name ? COLORS.primary : COLORS.outline} />
                  <Text style={[styles.charityOptionText, selectedCharity.name === charity.name && { color: COLORS.primary, fontWeight: '700' }]}>{charity.name}</Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(charity.url)}>
                  <Ionicons name="open-outline" size={20} color={COLORS.secondary ?? COLORS.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const getStyles = (COLORS, insets, tabBarHeight) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: (insets.top || 20) + 6, paddingBottom: tabBarHeight + 40 },

  profileCard: { backgroundColor: COLORS.surface, borderRadius: 28, marginBottom: 24, alignItems: 'center', paddingBottom: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  profileBanner: { width: '100%', height: 100, backgroundColor: COLORS.primaryContainer, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', marginBottom: -50 },
  bCircle1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: `${COLORS.primary}22`, top: -50, right: -20 },
  bCircle2: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: `${COLORS.primary}18`, bottom: -30, left: 24 },
  bCircle3: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: `${COLORS.primary}14`, top: 14, left: '42%' },
  avatarRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: COLORS.surface, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 42, fontWeight: '800', color: COLORS.onPrimary ?? '#fff', lineHeight: 50 },
  profileName: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 14, letterSpacing: -0.5 },
  profileEmail: { fontSize: 14, color: COLORS.textLight, marginTop: 3, marginBottom: 16 },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.background, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 100, borderWidth: 1, borderColor: `${COLORS.text}10` },
  editPillText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

  // СТИЛІ БЛОКУ ПРОГРЕСУ ТА КНОПКИ ПОШИРЕННЯ
  progressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 22, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  progressStat: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  progressValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  progressLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  progressDivider: { width: 1, height: '80%', backgroundColor: `${COLORS.text}10`, marginHorizontal: 16 },
  
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: `${COLORS.primary}12`, paddingVertical: 14, borderRadius: 16, marginBottom: 28, gap: 8 },
  shareBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },

  // СТИЛІ КАРТКИ ПРЕМІУМУ
  premiumCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${COLORS.primary}`, paddingHorizontal: 18, paddingVertical: 20, borderRadius: 22, marginBottom: 28, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  premiumIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFD70020', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  premiumTextWrap: { flex: 1 },
  premiumTitle: { fontSize: 17, fontWeight: '800', color: '#FFD700', marginBottom: 4 },
  premiumDesc: { fontSize: 12, color: `${COLORS.onPrimary}`, lineHeight: 16 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 6 },
  card: { backgroundColor: COLORS.surface, borderRadius: 22, marginBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: `${COLORS.text}10`, marginHorizontal: 16 },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 14, color: COLORS.textLight },

  donateHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  donateIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: `${COLORS.danger ?? '#FF2D55'}12`, justifyContent: 'center', alignItems: 'center' },
  donateTexts: { flex: 1 },
  donateTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  donateDesc: { fontSize: 12, color: COLORS.textLight, lineHeight: 17 },
  charityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 140 },
  charityChipText: { fontSize: 13, color: COLORS.textLight, maxWidth: 110 },

  logoutCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 24, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#FF3B3016' },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FF3B30' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: (insets.bottom || 0) + 30, maxHeight: '92%' },
  charitySheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: (insets.bottom || 0) + 24 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.outline ?? '#CCC', alignSelf: 'center', marginTop: 12, marginBottom: 4, opacity: 0.45 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalForm: { paddingHorizontal: 24, paddingTop: 4 },
  formGroup: { marginBottom: 18 },
  formLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.surfaceVariant, borderWidth: 1.5, borderColor: 'transparent', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 15, color: COLORS.text },
  inputError: { borderColor: COLORS.danger ?? '#FF3B30', backgroundColor: `${COLORS.danger ?? '#FF3B30'}08` },
  errorText: { color: COLORS.danger ?? '#FF3B30', fontSize: 12, marginTop: 5 },
  modalActions: { flexDirection: 'row', gap: 14, paddingHorizontal: 24, paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${COLORS.text}10` },
  modalBtn: { flex: 1 },

  charityOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${COLORS.text}10` },
  charityOptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  charityOptionText: { fontSize: 15, color: COLORS.text, marginLeft: 14, fontWeight: '500', flex: 1 },
});