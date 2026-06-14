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

  // Визначаємо поточну мову
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

  const SettingItem = ({ icon, title, value, onPress, iconBgColor, rightComponent }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: iconBgColor ?? `${COLORS.primary}18` }]}>
          <Ionicons name={icon} size={18} color={iconBgColor ? '#fff' : COLORS.primary} />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        {rightComponent ?? (
          <>
            {!!value && <Text style={styles.settingValue}>{value}</Text>}
            {onPress && <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />}
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
            <View style={[styles.iconBox, { backgroundColor: `${COLORS.primary}18`, width: 44, height: 44, borderRadius: 12 }]}>
              <Ionicons name="star" size={22} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.progressValue}>{user?.xp_points || 0} {t('settings.xp')}</Text>
              <Text style={styles.progressLabel}>{t('settings.level')} {level}</Text>
            </View>
          </View>
          
          <View style={styles.progressDivider} />
          
          <View style={styles.progressStat}>
            <View style={[styles.iconBox, { backgroundColor: '#F39C1218', width: 44, height: 44, borderRadius: 12 }]}>
              <Ionicons name="trophy" size={22} color="#F39C12" />
            </View>
            <View>
              <Text style={styles.progressValue}>{unlockedAchievementsCount} / {totalAchievementsCount}</Text>
              <Text style={styles.progressLabel}>{t('settings.achievements')}</Text>
            </View>
          </View>
          
          <Ionicons name="chevron-forward" size={22} color={COLORS.textLight} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShareSuccess}>
          <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
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
          />
          <View style={styles.divider} />
          <SettingItem
            icon="warning-outline"
            title={t('settings.myAllergens')}
            value={t('settings.configure')}
            iconBgColor="#FF3B30"
            onPress={() => navigation.navigate('AllergensSettings')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="list-outline"
            title={t('settings.myCategories')}
            value={t('settings.configure')}
            iconBgColor="#9B59B6"
            onPress={() => navigation.navigate('Categories')}
          />
        </View>

        {/* ── Відповідальне споживання ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.responsibleConsumption')}</Text>

        <View style={styles.card}>
          <View style={styles.donateHeader}>
            <View style={styles.donateIconWrap}>
              <Ionicons name="heart-circle-outline" size={30} color={COLORS.danger ?? '#FF2D55'} />
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
        <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.75}>
          <View style={[styles.iconBox, { backgroundColor: '#FF3B3018' }]}>
            <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
          </View>
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#FF3B30" />
        </TouchableOpacity>

      </ScrollView>

      {/* ── Модалка: Зміна мови ── */}
      <Modal visible={languageModalVisible} animationType="fade" transparent onRequestClose={() => setLanguageModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLanguageModalVisible(false)}>
          <View style={styles.charitySheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.chooseLanguageTitle')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={COLORS.outline} />
              </TouchableOpacity>
            </View>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity key={lang.code} style={styles.charityOption} onPress={() => handleLanguageChange(lang.code)}>
                <View style={styles.charityOptionLeft}>
                  <Ionicons name={currentLangCode === lang.code ? 'radio-button-on' : 'radio-button-off'} size={24} color={currentLangCode === lang.code ? COLORS.primary : COLORS.outline} />
                  <Text style={[styles.charityOptionText, currentLangCode === lang.code && { color: COLORS.primary, fontWeight: '700' }]}>{lang.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Charity Modal ── */}
      <Modal visible={charityModalVisible} animationType="fade" transparent onRequestClose={() => setCharityModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCharityModalVisible(false)}>
          <View style={styles.charitySheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.chooseFundTitle')}</Text>
              <TouchableOpacity onPress={() => setCharityModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={COLORS.outline} />
              </TouchableOpacity>
            </View>
            {AVAILABLE_CHARITIES.map((charity, index) => (
              <TouchableOpacity key={index} style={styles.charityOption} onPress={() => { setSelectedCharity(charity); setCharityModalVisible(false); }}>
                <View style={styles.charityOptionLeft}>
                  <Ionicons name={selectedCharity.name === charity.name ? 'radio-button-on' : 'radio-button-off'} size={24} color={selectedCharity.name === charity.name ? COLORS.primary : COLORS.outline} />
                  <Text style={[styles.charityOptionText, selectedCharity.name === charity.name && { color: COLORS.primary, fontWeight: '700' }]}>{charity.name}</Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(charity.url)}>
                  <Ionicons name="open-outline" size={24} color={COLORS.secondary ?? COLORS.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const getStyles = (COLORS, insets, tabBarHeight, isDark) => {
  const premiumBg = isDark ? COLORS.primaryContainer : COLORS.primary;
  const premiumText = isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingHorizontal: 20, paddingTop: (insets.top || 20) + 10, paddingBottom: tabBarHeight + 40 },

    profileCard: { backgroundColor: COLORS.surface, borderRadius: 24, marginBottom: 32, alignItems: 'center', paddingBottom: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 8, elevation: 2 },
    profileBanner: { width: '100%', height: 100, backgroundColor: COLORS.primaryContainer, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', marginBottom: -50 },
    bCircle1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: `${COLORS.primary}22`, top: -50, right: -20 },
    bCircle2: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: `${COLORS.primary}18`, bottom: -30, left: 24 },
    bCircle3: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: `${COLORS.primary}14`, top: 14, left: '42%' },
    avatarRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: COLORS.surface, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
    avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontSize: 42, fontWeight: '800', color: COLORS.onPrimary ?? '#fff', lineHeight: 50 },
    profileName: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 14, letterSpacing: -0.5 },
    profileEmail: { fontSize: 14, color: COLORS.textLight, marginTop: 3, marginBottom: 16 },
    editPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.background, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 100, borderWidth: 1, borderColor: `${COLORS.text}10` },
    editPillText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

    progressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 8, elevation: 2 },
    progressStat: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    progressValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    progressLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
    progressDivider: { width: 1, height: '80%', backgroundColor: `${COLORS.text}10`, marginHorizontal: 16 },
    
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: `${COLORS.primary}12`, paddingVertical: 14, borderRadius: 16, marginBottom: 32, gap: 8 },
    shareBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },

    premiumCard: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: premiumBg, 
      paddingHorizontal: 20, 
      paddingVertical: 22, 
      borderRadius: 24, 
      marginBottom: 32, 
      shadowColor: isDark ? '#000' : COLORS.primary, 
      shadowOffset: { width: 0, height: 6 }, 
      shadowOpacity: isDark ? 0.3 : 0.2, 
      shadowRadius: 12, 
      elevation: 4 
    },
    premiumIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 215, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    premiumTextWrap: { flex: 1 },
    premiumTitle: { fontSize: 18, fontWeight: '800', color: '#FFD700', marginBottom: 4 },
    premiumDesc: { fontSize: 13, color: premiumText, lineHeight: 18, opacity: 0.9 },

    sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    card: { backgroundColor: COLORS.surface, borderRadius: 24, marginBottom: 32, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 8, elevation: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: `${COLORS.text}10`, marginHorizontal: 16 },

    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    settingTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1 },
    settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    settingValue: { fontSize: 14, color: COLORS.textLight },

    donateHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
    donateIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: `${COLORS.danger ?? '#FF2D55'}12`, justifyContent: 'center', alignItems: 'center' },
    donateTexts: { flex: 1 },
    donateTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    donateDesc: { fontSize: 13, color: COLORS.textLight, lineHeight: 18 },
    charityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 140 },
    charityChipText: { fontSize: 14, color: COLORS.textLight, maxWidth: 110 },

    logoutCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 24, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#FF3B3016' },
    logoutText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#FF3B30' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
    charitySheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: (insets.bottom || 0) + 24 },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.outline ?? '#CCC', alignSelf: 'center', marginTop: 12, marginBottom: 4, opacity: 0.45 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
    
    charityOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${COLORS.text}10` },
    charityOptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    charityOptionText: { fontSize: 16, color: COLORS.text, marginLeft: 16, fontWeight: '500', flex: 1 },
  });
};