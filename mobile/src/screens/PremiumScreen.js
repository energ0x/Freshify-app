/**
 * @file PremiumScreen.js
 * @description Screen detailing Premium features and pricing options.
 * Initiates the subscription process: calls the backend premium activation endpoint,
 * opens a payment link (Monobank jar), and notifies the user upon successful activation.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import { authAPI } from '../services/api';

/**
 * PremiumScreen component.
 * Allows users to choose a plan and subscribe.
 * 
 * @param {object} props.navigation - React Navigation handle.
 */
export default function PremiumScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  
  // Local state for the selected plan option. Defaulting to yearly.
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  // Hardcoded key properties for premium benefit items.
  const PREMIUM_FEATURES = [
    { id: 1, title: t('premium.f1_title'), desc: t('premium.f1_desc'), icon: 'infinite', color: '#3498DB' },
    { id: 2, title: t('premium.f2_title'), desc: t('premium.f2_desc'), icon: 'restaurant', color: '#E67E22' },
    { id: 3, title: t('premium.f3_title'), desc: t('premium.f3_desc'), icon: 'pie-chart', color: '#9B59B6' },
    { id: 4, title: t('premium.f4_title'), desc: t('premium.f4_desc'), icon: 'star', color: '#F1C40F' },
  ];

  /**
   * Orchestrates the subscription sequence:
   * 1. Calls API to change premium state on the backend database.
   * 2. Opens the Monobank payment link in an external web browser.
   * 3. Displays success confirmation dialogue and routes user back.
   */
  const handleSubscribe = async () => {
    try {
      // 1. Activate premium in backend store
      await authAPI.activatePremium();

      // 2. Open payment gateway URL externally
      const url = 'https://send.monobank.ua/4abA62Fckj';
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Don't know how to open this URL: " + url);
      }

      // 3. Inform the user of successful subscription
      Alert.alert(
        t('premium.successTitle'),
        t('premium.successMsg'),
        [{ text: t('premium.cool'), onPress: () => navigation.goBack() }]
      );
    } catch (error) {
       console.error("Error activating premium:", error);
       Alert.alert(
         "Помилка",
         "Не вдалося активувати преміум. Спробуйте пізніше."
       );
    }
  };

  const isDark = theme === 'dark';
  // Decide hero section color based on active dark theme configuration
  const heroBg = isDark ? COLORS.primaryContainer : COLORS.primary;

  const styles = getStyles(COLORS, insets, isDark, heroBg);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={heroBg} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero Banner header featuring branding decoration */}
        <View style={styles.heroSection}>
          {/* Circular vector layout ornaments */}
          <View style={styles.bCircle1} />
          <View style={styles.bCircle2} />

          {/* Close button to return back to settings / profile */}
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.diamondContainer}>
            <Ionicons name="diamond" size={48} color="#FFD700" />
          </View>

          <Text style={styles.heroTitle}>{t('premium.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('premium.subtitle')}
          </Text>
        </View>

        {/* Benefits list section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionLabel}>{t('premium.featuresTitle')}</Text>
          {PREMIUM_FEATURES.map(feature => (
            <View key={feature.id} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${feature.color}15` }]}>
                <Ionicons name={feature.icon} size={28} color={feature.color} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan configuration choices */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionLabel}>{t('premium.choosePlan')}</Text>

          {/* Monthly plan option */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardActive
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={selectedPlan === 'monthly' ? 'radio-button-on' : 'radio-button-off'}
              size={26}
              color={selectedPlan === 'monthly' ? (isDark ? '#FFD700' : COLORS.primary) : COLORS.outline}
            />
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{t('premium.monthly')}</Text>
              <Text style={styles.planDesc}>{t('premium.monthlyDesc')}</Text>
            </View>
            <View style={styles.planPriceContainer}>
              <Text style={styles.planPrice}>99 ₴ <Text style={styles.planPeriod}>{t('premium.perMonth')}</Text></Text>
            </View>
          </TouchableOpacity>

          {/* Yearly plan option */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardActiveYearly
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}
          >
            {/* Promo banner highlighting the best deal */}
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{t('premium.bestValue')}</Text>
            </View>
            <Ionicons
              name={selectedPlan === 'yearly' ? 'radio-button-on' : 'radio-button-off'}
              size={26}
              color={selectedPlan === 'yearly' ? '#FFD700' : COLORS.outline}
            />
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{t('premium.yearly')}</Text>
              <Text style={styles.planDesc}>{t('premium.yearlyDesc')}</Text>
            </View>
            <View style={styles.planPriceContainer}>
              <Text style={styles.planPrice}>829 ₴ <Text style={styles.planPeriod}>{t('premium.perYear')}</Text></Text>
              <Text style={styles.planPriceDiscount}>{t('premium.only')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Subscribe confirmation button and legal disclaimer */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe} activeOpacity={0.85}>
            <Text style={styles.subscribeBtnText}>
              {t('premium.subscribe', { price: selectedPlan === 'yearly' ? '829' : '99' })}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>
            {t('premium.footer')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Generates component styling based on theme variables and device notches.
 * 
 * @param {object} COLORS - Style guide colors.
 * @param {object} insets - Safe screen padding boundaries.
 * @param {boolean} isDark - Active dark status.
 * @param {string} heroBg - Decided brand background color.
 * @returns {object} StyleSheet layout.
 */
const getStyles = (COLORS, insets, isDark, heroBg) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    paddingBottom: insets.bottom + 40,
    flexGrow: 1
  },

  // ─── Hero Section ──────────────────────────────────────────────────────────
  heroSection: {
    backgroundColor: heroBg,
    paddingTop: insets.top + 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: isDark ? '#000' : heroBg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.4 : 0.2,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 10,
    marginBottom: 24,
  },
  bCircle1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
  bCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -20 },

  closeButton: {
    position: 'absolute',
    top: insets.top + 10,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  diamondContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5
  },
  heroSubtitle: {
    fontSize: 15,
    color: isDark ? COLORS.onPrimaryContainer : COLORS.onPrimary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    fontWeight: '500'
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
    marginLeft: 24
  },

  // ─── Features Section ──────────────────────────────────────────────────────
  featuresSection: {
    paddingHorizontal: 24,
    marginBottom: 16
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16
  },
  featureIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextWrap: {
    flex: 1,
    gap: 4
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500'
  },

  // ─── Plans Section ─────────────────────────────────────────────────────────
  plansSection: {
    paddingHorizontal: 20,
    marginBottom: 32
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: COLORS.surface,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
    gap: 16
  },
  planCardActive: {
    borderColor: isDark ? '#FFD700' : COLORS.primary,
    backgroundColor: isDark ? 'rgba(255, 215, 0, 0.05)' : `${COLORS.primary}08`,
    elevation: 4,
    shadowOpacity: isDark ? 0.3 : 0.1,
  },
  planCardActiveYearly: {
    borderColor: '#FFD700',
    backgroundColor: isDark ? 'rgba(255, 215, 0, 0.1)' : '#FFFCED',
    elevation: 4,
    shadowOpacity: isDark ? 0.3 : 0.1,
  },
  badgeContainer: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  badgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },

  planInfo: {
    flex: 1,
    gap: 4
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  planDesc: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500'
  },
  planPriceContainer: {
    alignItems: 'flex-end',
    gap: 2
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant
  },
  planPriceDiscount: {
    fontSize: 12,
    color: isDark ? '#FFD700' : COLORS.primary,
    fontWeight: '700',
  },

  // ─── Actions ───────────────────────────────────────────────────────────────
  actionSection: {
    paddingHorizontal: 20
  },
  subscribeBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  subscribeBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500'
  },
});