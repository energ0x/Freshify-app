import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Switch, Alert, Linking,
  Modal, TouchableOpacity, Platform, StatusBar, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { settingsAPI, achievementsAPI } from '../services/api';
import { CHARITY } from '../utils/constants';

import DailyTasksWidget from '../components/DailyTasksWidget';

const AVAILABLE_CHARITIES = [
  CHARITY,
  { name: 'Фонд Сергія Притули', url: 'https://prytulafoundation.org' },
  { name: 'United24', url: 'https://u24.gov.ua' },
  { name: 'Госпітальєри', url: 'https://www.hospitallers.life/' },
];

const LANGUAGES = [
  { code: 'uk', name: 'Українська 🇺🇦' },
  { code: 'en', name: 'English 🇬🇧' }
];

const SettingItem = ({ icon, title, value, onPress, iconBgColor, rightComponent, styles, COLORS }) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.iconBox, { backgroundColor: iconBgColor ?? `${COLORS.primary}18` }]}>
        <Ionicons name={icon} size={20} color={iconBgColor ? '#fff' : COLORS.primary} />
      </View>
      <Text style={styles.settingTitle}>{title}</Text>
    </View>
    <View style={styles.settingRight}>
      {rightComponent ?? (
        <>
          {!!value && <Text style={styles.settingValue}>{value}</Text>}
          {onPress && <Ionicons name="chevron-forward" size={20} color={COLORS.outline} />}
        </>
      )}
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, colors: COLORS, isSystemTheme, setSystemTheme } = useThemeStore();

  const [donationSettings, setDonationSettings] = useState({ auto_donate: false });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [achievements, setAchievements] = useState([]);

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [selectedCharity, setSelectedCharity] = useState(AVAILABLE_CHARITIES[0]);
  const [charityModalVisible, setCharityModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const currentLangCode = i18n.language?.startsWith('uk') ? 'uk' : 'en';
  const currentLangName = LANGUAGES.find(l => l.code === currentLangCode)?.name || 'English 🇬🇧';

  useEffect(() => {
    loadSettings();
    checkNotificationStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchAchievements = async () => {
        try {
          const response = await achievementsAPI.get();
          setAchievements(response.data);
        } catch (error) {
          console.error("Failed to fetch achievements", error);
        }
      };
      fetchAchievements();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.getDonation();
      if (res.data) setDonationSettings(res.data);
    } catch (e) {
      console.log('Settings load error', e);
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const storedPreference = await AsyncStorage.getItem('notifications_enabled');
      if (storedPreference === 'true') {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
      } else {
        setNotificationsEnabled(false);
      }
    } catch (e) {
      console.log('Error checking notification status', e);
    }
  };

  const handleToggleNotifications = async (value) => {
    if (value) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        setNotificationsEnabled(true);
        await AsyncStorage.setItem('notifications_enabled', 'true');
      } else {
        Alert.alert(t('common.attention'), t('settings.notificationsDenied'));
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
      await AsyncStorage.setItem('notifications_enabled', 'false');
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const handleToggleDonation = async (value) => {
    setDonationSettings(prev => ({ ...prev, auto_donate: value }));
    try {
      await settingsAPI.updateDonation({ auto_donate: value });
    } catch {
      setDonationSettings(prev => ({ ...prev, auto_donate: !value }));
      Alert.alert(t('common.error'), t('settings.settingsSaveError'));
    }
  };

  const handleLanguageChange = async (code) => {
    await AsyncStorage.setItem('app_language', code);
    i18n.changeLanguage(code);
    setLanguageModalVisible(false);
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logoutAction'), style: 'destructive', onPress: logout },
    ]);
  };

  const level = user ? Math.floor((user.xp_points || 0) / 100) + 1 : 1;
  const unlockedAchievementsCount = achievements.filter(a => a.completed).length;
  const totalAchievementsCount = achievements.length || 6;

  const handleShareSuccess = async () => {
    try {
      await Share.share({
        message: t('settings.shareMessage', { level: level }),
      });
    } catch (error) {
      console.log('Share error', error);
    }
  };

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, insets, tabBarHeight, isDark);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* ── Консистентний Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('tabs.profile', 'Профіль')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

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

          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>

          <TouchableOpacity
            style={styles.editPill}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
            <Text style={styles.editPillText}>{t('settings.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Мій Прогрес ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.myProgress')}</Text>

        <DailyTasksWidget navigation={navigation} isClosable={false} />

        <TouchableOpacity
          style={styles.progressCard}
          onPress={() => navigation.navigate('Achievements')}
          activeOpacity={0.8}
        >
          <View style={styles.progressStat}>
            <View style={[styles.iconBoxLg, { backgroundColor: `${COLORS.primary}18` }]}>
              <Ionicons name="star" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.progressValue}>{user?.xp_points || 0} {t('settings.xp')}</Text>
              <Text style={styles.progressLabel}>{t('settings.level')} {level}</Text>
            </View>
          </View>

          <View style={styles.progressDivider} />

          <View style={styles.progressStat}>
            <View style={[styles.iconBoxLg, { backgroundColor: '#F39C1218' }]}>
              <Ionicons name="trophy" size={24} color="#F39C12" />
            </View>
            <View>
              <Text style={styles.progressValue}>{unlockedAchievementsCount} / {totalAchievementsCount}</Text>
              <Text style={styles.progressLabel}>{t('settings.achievements')}</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={22} color={COLORS.outline} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShareSuccess} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={22} color={COLORS.onPrimaryContainer} />
          <Text style={styles.shareBtnText}>{t('settings.shareSuccess')}</Text>
        </TouchableOpacity>

        {/* ── Преміум ── */}
        <TouchableOpacity
          style={styles.premiumCard}
          onPress={() => navigation.navigate('Premium')}
          activeOpacity={0.9}
        >
          <View style={styles.premiumIconWrap}>
            <Ionicons name="diamond" size={26} color="#FFD700" />
          </View>
          <View style={styles.premiumTextWrap}>
            <Text style={styles.premiumTitle}>{t('settings.premiumTitle')}</Text>
            <Text style={styles.premiumDesc}>{t('settings.premiumDesc')}</Text>
          </View>
        </TouchableOpacity>

        {/* ── Персоналізація ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.personalization')}</Text>
        <View style={styles.card}>
          <SettingItem
            icon="language-outline"
            title={t('settings.language')}
            iconBgColor="#3498DB"
            onPress={() => setLanguageModalVisible(true)}
            styles={styles}
            COLORS={COLORS}
            rightComponent={
              <View style={styles.charityChip}>
                <Text style={styles.charityChipText} numberOfLines={1}>{currentLangName}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.outline} />
              </View>
            }
          />
          <View style={styles.divider} />
          <SettingItem
            icon="notifications-outline"
            title={t('settings.notifications')}
            iconBgColor="#FF2D55"
            styles={styles}
            COLORS={COLORS}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
                thumbColor={COLORS.onPrimary ?? '#fff'}
              />
            }
          />
          <View style={styles.divider} />
          <SettingItem
            icon={theme === 'light' ? 'sunny' : 'moon'}
            title={t('settings.darkTheme')}
            iconBgColor={theme === 'light' ? '#FF9500' : '#5A5DE8'}
            styles={styles}
            COLORS={COLORS}
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
            title={t('settings.systemTheme')}
            iconBgColor="#5856D6"
            styles={styles}
            COLORS={COLORS}
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
        <Text style={styles.sectionLabel}>{t('settings.nutrition')}</Text>
        <View style={styles.card}>
          <SettingItem
            icon="restaurant-outline"
            title={t('settings.myDiet')}
            value={t('settings.choose')}
            iconBgColor="#FF6B35"
            onPress={() => navigation.navigate('DietSettings')}
            styles={styles}
            COLORS={COLORS}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="warning-outline"
            title={t('settings.myAllergens')}
            value={t('settings.configure')}
            iconBgColor="#FF3B30"
            onPress={() => navigation.navigate('AllergensSettings')}
            styles={styles}
            COLORS={COLORS}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="list-outline"
            title={t('settings.myCategories')}
            value={t('settings.configure')}
            iconBgColor="#9B59B6"
            onPress={() => navigation.navigate('Categories')}
            styles={styles}
            COLORS={COLORS}
          />
        </View>

        {/* ── Відповідальне споживання ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.responsibleConsumption')}</Text>

        <View style={styles.card}>
          <View style={styles.donateHeader}>
            <View style={styles.donateIconWrap}>
              <Ionicons name="heart-circle" size={32} color={COLORS.danger ?? '#FF2D55'} />
            </View>
            <View style={styles.donateTexts}>
              <Text style={styles.donateTitle}>{t('settings.autoDonate')}</Text>
              <Text style={styles.donateDesc}>
                {t('settings.autoDonateDesc')}
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
                title={t('settings.defaultFund')}
                iconBgColor="#007AFF"
                onPress={() => setCharityModalVisible(true)}
                styles={styles}
                COLORS={COLORS}
                rightComponent={
                  <View style={styles.charityChip}>
                    <Text style={styles.charityChipText} numberOfLines={1}>{selectedCharity.name}</Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.outline} />
                  </View>
                }
              />
            </>
          )}
        </View>

        {/* ── Акаунт ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
        <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.8}>
          <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.error ?? '#FF3B30'} />
          </View>
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Модалка: Зміна мови ── */}
      <Modal visible={languageModalVisible} animationType="fade" transparent onRequestClose={() => setLanguageModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLanguageModalVisible(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.chooseLanguageTitle')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.outline} />
              </TouchableOpacity>
            </View>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity key={lang.code} style={styles.sheetOption} onPress={() => handleLanguageChange(lang.code)}>
                <View style={styles.sheetOptionLeft}>
                  <Ionicons name={currentLangCode === lang.code ? 'radio-button-on' : 'radio-button-off'} size={24} color={currentLangCode === lang.code ? COLORS.primary : COLORS.outline} />
                  <Text style={[styles.sheetOptionText, currentLangCode === lang.code && { color: COLORS.primary, fontWeight: '700' }]}>{lang.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Charity Modal ── */}
      <Modal visible={charityModalVisible} animationType="fade" transparent onRequestClose={() => setCharityModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCharityModalVisible(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.chooseFundTitle')}</Text>
              <TouchableOpacity onPress={() => setCharityModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.outline} />
              </TouchableOpacity>
            </View>
            {AVAILABLE_CHARITIES.map((charity, index) => (
              <TouchableOpacity key={index} style={styles.sheetOption} onPress={() => { setSelectedCharity(charity); setCharityModalVisible(false); }}>
                <View style={styles.sheetOptionLeft}>
                  <Ionicons name={selectedCharity.name === charity.name ? 'radio-button-on' : 'radio-button-off'} size={24} color={selectedCharity.name === charity.name ? COLORS.primary : COLORS.outline} />
                  <Text style={[styles.sheetOptionText, selectedCharity.name === charity.name && { color: COLORS.primary, fontWeight: '700' }]}>{charity.name}</Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(charity.url)}>
                  <Ionicons name="open-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (COLORS, insets, tabBarHeight, isDark) => {
  const premiumBg = isDark ? COLORS.primaryContainer : COLORS.primary;
  const premiumText = isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // ─── Header ────────────────────────────────────────────────────────────────
    header: {
      paddingTop: insets.top || 20,
      paddingHorizontal: 20,
      // paddingBottom: 20,
      backgroundColor: COLORS.surface,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      zIndex: 10,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: COLORS.text,
      marginTop: 12,
      marginBottom: 20,
      letterSpacing: 0.5,
    },

    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: tabBarHeight + 40 },

    // ─── Profile Card ──────────────────────────────────────────────────────────
    profileCard: { backgroundColor: COLORS.surface, borderRadius: 24, marginBottom: 32, alignItems: 'center', paddingBottom: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
    profileBanner: { width: '100%', height: 100, backgroundColor: COLORS.primaryContainer, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', marginBottom: -50 },
    bCircle1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: `${COLORS.primary}22`, top: -50, right: -20 },
    bCircle2: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: `${COLORS.primary}18`, bottom: -30, left: 24 },
    bCircle3: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: `${COLORS.primary}14`, top: 14, left: '42%' },

    avatarRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: COLORS.surface, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
    avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontSize: 40, fontWeight: '800', color: COLORS.onPrimary ?? '#fff', lineHeight: 48 },

    profileName: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 16, letterSpacing: -0.5 },
    profileEmail: { fontSize: 14, color: COLORS.onSurfaceVariant, marginTop: 4, marginBottom: 20 },

    editPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceVariant, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
    editPillText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

    // ─── Sections & Cards ──────────────────────────────────────────────────────
    sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 8 },
    card: { backgroundColor: COLORS.surface, borderRadius: 24, marginBottom: 32, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.outline, marginHorizontal: 20, opacity: 0.3 },

    // ─── Progress Card ─────────────────────────────────────────────────────────
    progressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingVertical: 20, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
    progressStat: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    iconBoxLg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    progressValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    progressLabel: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 2, fontWeight: '500' },
    progressDivider: { width: 1, height: '70%', backgroundColor: COLORS.outline, marginHorizontal: 16, opacity: 0.3 },

    // ─── Buttons ───────────────────────────────────────────────────────────────
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryContainer, height: 52, borderRadius: 16, marginBottom: 32, gap: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    shareBtnText: { color: COLORS.onPrimaryContainer, fontSize: 16, fontWeight: '700' },

    premiumCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: premiumBg, paddingHorizontal: 20, paddingVertical: 24, borderRadius: 24, marginBottom: 32, shadowColor: isDark ? '#000' : COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.3 : 0.25, shadowRadius: 12, elevation: 6 },
    premiumIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255, 215, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    premiumTextWrap: { flex: 1 },
    premiumTitle: { fontSize: 20, fontWeight: '800', color: '#FFD700', marginBottom: 4 },
    premiumDesc: { fontSize: 14, color: premiumText, lineHeight: 20, opacity: 0.9 },

    // ─── Settings Items ────────────────────────────────────────────────────────
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    settingTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1 },
    settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    settingValue: { fontSize: 14, color: COLORS.onSurfaceVariant, fontWeight: '500' },

    donateHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 16 },
    donateIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: `${COLORS.danger ?? '#FF2D55'}12`, justifyContent: 'center', alignItems: 'center' },
    donateTexts: { flex: 1 },
    donateTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    donateDesc: { fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 18 },
    charityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 140 },
    charityChipText: { fontSize: 14, color: COLORS.onSurfaceVariant, maxWidth: 110, fontWeight: '500' },

    // ─── Logout ────────────────────────────────────────────────────────────────
    logoutCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.errorContainer || '#FF3B3012', borderRadius: 16, paddingHorizontal: 8, height: 56, marginBottom: 24, gap: 8 },
    logoutText: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.error ?? '#FF3B30' },

    // ─── Modals ────────────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: (insets.bottom || 0) + 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 },
    modalHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: COLORS.outline, alignSelf: 'center', marginTop: 12, marginBottom: 8, opacity: 0.3 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

    sheetOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.outline },
    sheetOptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    sheetOptionText: { fontSize: 16, color: COLORS.text, marginLeft: 16, fontWeight: '600', flex: 1 },
  });
};