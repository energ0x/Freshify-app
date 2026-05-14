import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import { settingsAPI } from '../services/api';
import CustomButton from '../components/CustomButton';
import { COLORS, CHARITY } from '../utils/constants';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [donationSettings, setDonationSettings] = useState({ auto_donate: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.getDonation();
      setDonationSettings(res.data);
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

  const handleLogout = () => {
    Alert.alert('Вихід', 'Ви впевнені, що хочете вийти з акаунту?', [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Вийти', style: 'destructive', onPress: logout }
    ]);
  };

  const openCharityLink = () => {
    Linking.openURL(CHARITY.url).catch(() => {
      Alert.alert('Помилка', 'Не вдалося відкрити посилання');
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileSection}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Користувач'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Відповідальне споживання</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="heart" size={24} color={COLORS.danger} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Авто-донат за зіпсовані продукти</Text>
                <Text style={styles.settingDesc}>
                  Якщо ви не встигли спожити продукт, застосунок запропонує перерахувати його вартість (або символічну суму) на ЗСУ.
                </Text>
              </View>
            </View>
            <Switch
              value={donationSettings.auto_donate}
              onValueChange={handleToggleDonation}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="globe-outline" size={24} color={COLORS.secondary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Фонд за замовчуванням</Text>
                <Text style={styles.settingDesc} onPress={openCharityLink} style={[styles.settingDesc, { color: COLORS.secondary, textDecorationLine: 'underline' }]}>
                  {CHARITY.name}
                </Text>
              </View>
            </View>
          </View>
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
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  profileSection: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  userEmail: { fontSize: 16, color: COLORS.textLight },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textLight, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, padding: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 16 },
  settingTextContainer: { marginLeft: 12, flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: COLORS.text, marginBottom: 4 },
  settingDesc: { fontSize: 14, color: COLORS.textLight, lineHeight: 20 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  logoutButton: { borderColor: COLORS.danger, borderWidth: 1, backgroundColor: 'transparent' },
});