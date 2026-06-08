import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';

export default function PremiumScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const PREMIUM_FEATURES = [
    { id: 1, title: t('premium.f1_title'), desc: t('premium.f1_desc'), icon: 'infinite-outline', color: '#3498DB' },
    { id: 2, title: t('premium.f2_title'), desc: t('premium.f2_desc'), icon: 'restaurant-outline', color: '#E67E22' },
    { id: 3, title: t('premium.f3_title'), desc: t('premium.f3_desc'), icon: 'pie-chart-outline', color: '#9B59B6' },
    { id: 4, title: t('premium.f4_title'), desc: t('premium.f4_desc'), icon: 'star-outline', color: '#F1C40F' },
  ];

  const handleSubscribe = () => {
    Alert.alert(
      t('premium.successTitle'),
      t('premium.successMsg'),
      [{ text: t('premium.cool'), onPress: () => navigation.goBack() }]
    );
  };

  const isDark = theme === 'dark';
  const heroBg = isDark ? COLORS.primaryContainer : COLORS.primary;
  
  const styles = getStyles(COLORS, insets, isDark, heroBg);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={heroBg} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.heroSection}>
          <View style={styles.bCircle1} />
          <View style={styles.bCircle2} />
          
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.diamondContainer}>
            <Ionicons name="diamond" size={44} color="#FFD700" />
          </View>
          
          <Text style={styles.heroTitle}>{t('premium.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('premium.subtitle')}
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionLabel}>{t('premium.featuresTitle')}</Text>
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

        <View style={styles.plansSection}>
          <Text style={styles.sectionLabel}>{t('premium.choosePlan')}</Text>
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
              <Text style={styles.planName}>{t('premium.monthly')}</Text>
              <Text style={styles.planDesc}>{t('premium.monthlyDesc')}</Text>
            </View>
            <Text style={styles.planPrice}>99 ₴<Text style={styles.planPeriod}>{t('premium.perMonth')}</Text></Text>
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
              <Text style={styles.badgeText}>{t('premium.bestValue')}</Text>
            </View>
            <View style={styles.planRadio}>
              <Ionicons 
                name={selectedPlan === 'yearly' ? 'radio-button-on' : 'radio-button-off'} 
                size={24} 
                color={selectedPlan === 'yearly' ? '#FFD700' : COLORS.outline} 
              />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{t('premium.yearly')}</Text>
              <Text style={styles.planDesc}>{t('premium.yearlyDesc')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.planPrice}>829 ₴<Text style={styles.planPeriod}>{t('premium.perYear')}</Text></Text>
              <Text style={styles.planPriceDiscount}>{t('premium.only')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe} activeOpacity={0.85}>
            <Text style={styles.subscribeBtnText}>{t('premium.subscribe', { price: selectedPlan === 'yearly' ? '829' : '99' })}</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>
            {t('premium.footer')}
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
  },
  bCircle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
  bCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -20 },
  
  closeButton: { position: 'absolute', top: insets.top + 10, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  diamondContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 215, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, marginTop: 20, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.4)' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFD700', marginBottom: 10, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10, opacity: 0.9 },
  
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 4 },
  
  featuresSection: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  featureIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  featureDesc: { fontSize: 13, lineHeight: 18, color: COLORS.textLight },
  
  plansSection: { paddingHorizontal: 20, marginBottom: 24 },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 16 },
  planCardActive: { borderColor: isDark ? '#FFD700' : COLORS.primary, backgroundColor: isDark ? 'rgba(255, 215, 0, 0.05)' : `${COLORS.primary}08` },
  planCardYearly: { borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  planCardActiveYearly: { borderColor: '#FFD700', backgroundColor: isDark ? '#262211' : '#FFFCED' },
  badgeContainer: { position: 'absolute', top: -12, right: 20, backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  planRadio: { marginRight: 16 },
  planInfo: { flex: 1 },
  planName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  planDesc: { fontSize: 13, color: COLORS.textLight },
  planPrice: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  planPeriod: { fontSize: 13, fontWeight: '500', color: COLORS.textLight },
  planPriceDiscount: { fontSize: 11, color: isDark ? '#FFD700' : COLORS.warning, fontWeight: '600', marginTop: 2 },
  
  actionSection: { paddingHorizontal: 20 },
  subscribeBtn: { backgroundColor: '#FFD700', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  subscribeBtnText: { color: '#133918', fontSize: 16, fontWeight: 'bold' },
  footerText: { fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16, color: COLORS.textLight },
});