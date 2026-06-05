import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeStore from '../store/themeStore';

const PREMIUM_FEATURES = [
  { id: 1, title: 'Безлімітне додавання', desc: 'Скануйте штрихкоди, чеки та фотографуйте продукти без жодних обмежень.', icon: 'infinite-outline', color: '#3498DB' },
  { id: 2, title: 'ШІ-Кухар без меж', desc: 'Генеруйте персоналізовані рецепти щодня, щоб нічого не пропало.', icon: 'restaurant-outline', color: '#E67E22' },
  { id: 3, title: 'Поглиблена аналітика', desc: 'Детальні графіки зекономлених коштів та вашого еко-сліду (CO₂).', icon: 'pie-chart-outline', color: '#9B59B6' },
  { id: 4, title: 'Бустер Досвіду (x1.5)', desc: 'Отримуйте більше XP за кожну дію та швидше підкорюйте вищі ліги.', icon: 'star-outline', color: '#F1C40F' },
];

export default function PremiumScreen({ navigation }) {
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const handleSubscribe = () => {
    Alert.alert(
      'Вітаємо у Freshify Premium! 🎉',
      'Оплата пройшла успішно. Тепер вам доступні всі можливості застосунку.',
      [{ text: 'Клас!', onPress: () => navigation.goBack() }]
    );
  };

  const isDark = theme === 'dark';
  // Використовуємо глибокий темно-зелений для темної теми, і звичайний зелений для світлої
  const heroBg = isDark ? COLORS.primaryContainer : COLORS.primary;
  
  const styles = getStyles(COLORS, insets, isDark, heroBg);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={heroBg} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── ПРЕМІУМ ШАПКА (Завжди красивий зелений) ── */}
        <View style={styles.heroSection}>
          <View style={styles.bCircle1} />
          <View style={styles.bCircle2} />
          
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.diamondContainer}>
            <Ionicons name="diamond" size={44} color="#FFD700" />
          </View>
          
          <Text style={styles.heroTitle}>Freshify Premium</Text>
          <Text style={styles.heroSubtitle}>
            Розблокуйте всі інструменти для життя в стилі Zero Waste та максимальної економії.
          </Text>
        </View>

        {/* ── ПЕРЕВАГИ ── */}
        <View style={styles.featuresSection}>
          {PREMIUM_FEATURES.map(feature => (
            <View key={feature.id} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${feature.color}15` }]}>
                <Ionicons name={feature.icon} size={24} color={feature.color} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── ВИБІР ПЛАНУ ── */}
        <View style={styles.plansSection}>
          <TouchableOpacity 
            style={[
              styles.planCard, 
              selectedPlan === 'monthly' && styles.planCardActive
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.planRadio}>
              <Ionicons 
                name={selectedPlan === 'monthly' ? 'radio-button-on' : 'radio-button-off'} 
                size={24} 
                color={selectedPlan === 'monthly' ? (isDark ? '#FFD700' : COLORS.primary) : COLORS.outline} 
              />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>На місяць</Text>
              <Text style={styles.planDesc}>Гнучкий план</Text>
            </View>
            <Text style={styles.planPrice}>99 ₴<Text style={styles.planPeriod}> / міс</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.planCard, 
              styles.planCardYearly,
              selectedPlan === 'yearly' && styles.planCardActiveYearly
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}
          >
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>ВИГІДНО</Text>
            </View>
            <View style={styles.planRadio}>
              <Ionicons 
                name={selectedPlan === 'yearly' ? 'radio-button-on' : 'radio-button-off'} 
                size={24} 
                color={selectedPlan === 'yearly' ? '#FFD700' : COLORS.outline} 
              />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>На рік</Text>
              <Text style={styles.planDesc}>Економія 30%</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.planPrice}>829 ₴<Text style={styles.planPeriod}> / рік</Text></Text>
              <Text style={styles.planPriceDiscount}>лише 69 ₴ / міс</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── КНОПКА ОПЛАТИ (Золота з темним текстом) ── */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe} activeOpacity={0.85}>
            <Text style={styles.subscribeBtnText}>Оформити за {selectedPlan === 'yearly' ? '829' : '99'} ₴</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>
            Підписка автоматично продовжується. Скасувати можна будь-коли в налаштуваннях вашого акаунту. 
            Продовжуючи, ви погоджуєтеся з Умовами використання та Політикою конфіденційності.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (COLORS, insets, isDark, heroBg) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40, flexGrow: 1 },
  
  heroSection: {
    backgroundColor: heroBg,
    paddingTop: insets.top + 10,
    paddingHorizontal: 24,
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
  },
  bCircle1: { 
    position: 'absolute', width: 220, height: 220, borderRadius: 110, 
    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 
  },
  bCircle2: { 
    position: 'absolute', width: 140, height: 140, borderRadius: 70, 
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -20 
  },
  
  closeButton: {
    position: 'absolute',
    top: insets.top + 10,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  diamondContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    opacity: 0.9,
  },
  
  featuresSection: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  featureIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  featureDesc: { fontSize: 13, lineHeight: 18, color: COLORS.textLight },
  
  plansSection: { paddingHorizontal: 24, marginBottom: 24 },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 16 },
  planCardActive: { 
    borderColor: isDark ? '#FFD700' : COLORS.primary, 
    backgroundColor: isDark ? 'rgba(255, 215, 0, 0.05)' : `${COLORS.primary}08` 
  },
  planCardYearly: { borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  planCardActiveYearly: { 
    borderColor: '#FFD700', 
    backgroundColor: isDark ? '#262211' : '#FFFCED' 
  },
  badgeContainer: { position: 'absolute', top: -12, right: 20, backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  planRadio: { marginRight: 16 },
  planInfo: { flex: 1 },
  planName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  planDesc: { fontSize: 13, color: COLORS.textLight },
  planPrice: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  planPeriod: { fontSize: 13, fontWeight: '500', color: COLORS.textLight },
  planPriceDiscount: { fontSize: 11, color: isDark ? '#FFD700' : COLORS.warning, fontWeight: '600', marginTop: 2 },
  
  actionSection: { paddingHorizontal: 24 },
  subscribeBtn: { 
    backgroundColor: '#FFD700', 
    borderRadius: 16, 
    height: 56, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  subscribeBtnText: {
    color: '#133918', // Завжди темно-зелений для високої контрастності
    fontSize: 16, 
    fontWeight: 'bold'
  },
  footerText: { fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16, color: COLORS.textLight },
});