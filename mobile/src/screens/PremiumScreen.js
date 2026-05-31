import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

const PREMIUM_FEATURES = [
  { 
    id: 1, 
    title: 'Безлімітне додавання', 
    desc: 'Скануйте штрихкоди, чеки та фотографуйте продукти без жодних обмежень.', 
    icon: 'infinite-outline',
    color: '#3498DB'
  },
  { 
    id: 2, 
    title: 'ШІ-Кухар без меж', 
    desc: 'Генеруйте персоналізовані рецепти щодня, щоб нічого не пропало.', 
    icon: 'restaurant-outline',
    color: '#E67E22'
  },
  { 
    id: 3, 
    title: 'Поглиблена аналітика', 
    desc: 'Детальні графіки зекономлених коштів та вашого еко-сліду (CO₂).', 
    icon: 'pie-chart-outline',
    color: '#9B59B6'
  },
  { 
    id: 4, 
    title: 'Бустер Досвіду (x1.5)', 
    desc: 'Отримуйте більше XP за кожну дію та швидше підкорюйте вищі ліги.', 
    icon: 'star-outline',
    color: '#F1C40F'
  },
];

export default function PremiumScreen({ navigation }) {
  const { colors: COLORS } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'monthly' або 'yearly'

  const handleSubscribe = () => {
    // Тут у майбутньому буде інтеграція з Apple Pay / Google Pay (через RevenueCat або Expo IAP)
    Alert.alert(
      'Вітаємо у Freshify Premium! 🎉',
      'Оплата пройшла успішно. Тепер вам доступні всі можливості застосунку.',
      [{ text: 'Клас!', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Преміум Шапка */}
        <View style={[styles.heroSection, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.diamondContainer}>
            <Ionicons name="diamond" size={48} color="#FFD700" />
          </View>
          
          <Text style={styles.heroTitle}>Freshify Premium</Text>
          <Text style={styles.heroSubtitle}>
            Розблокуйте всі інструменти для життя в стилі Zero Waste та максимальної економії.
          </Text>
        </View>

        {/* Список переваг */}
        <View style={styles.featuresSection}>
          {PREMIUM_FEATURES.map(feature => (
            <View key={feature.id} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${feature.color}15` }]}>
                <Ionicons name={feature.icon} size={24} color={feature.color} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: COLORS.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDesc, { color: COLORS.textLight }]}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Вибір плану */}
        <View style={styles.plansSection}>
          {/* Місячний план */}
          <TouchableOpacity 
            style={[
              styles.planCard, 
              { borderColor: COLORS.border, backgroundColor: COLORS.surface },
              selectedPlan === 'monthly' && [styles.planCardActive, { backgroundColor: `${COLORS.primary}08` }]
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.planRadio}>
              <Ionicons 
                name={selectedPlan === 'monthly' ? 'radio-button-on' : 'radio-button-off'} 
                size={24} 
                color={selectedPlan === 'monthly' ? COLORS.primary : COLORS.outline} 
              />
            </View>
            <View style={styles.planInfo}>
              <Text style={[styles.planName, { color: COLORS.text }]}>На місяць</Text>
              <Text style={[styles.planDesc, { color: COLORS.textLight }]}>Гнучкий план</Text>
            </View>
            <Text style={[styles.planPrice, { color: COLORS.text }]}>99 ₴<Text style={styles.planPeriod}> / міс</Text></Text>
          </TouchableOpacity>

          {/* Річний план */}
          <TouchableOpacity 
            style={[
              styles.planCard, 
              styles.planCardYearly,
              { backgroundColor: COLORS.surface },
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
              <Text style={[styles.planName, { color: COLORS.text }]}>На рік</Text>
              <Text style={[styles.planDesc, { color: COLORS.textLight }]}>Економія 30%</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.planPrice, { color: COLORS.text }]}>829 ₴<Text style={styles.planPeriod}> / рік</Text></Text>
              <Text style={styles.planPriceDiscount}>лише 69 ₴ / міс</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Кнопка оплати */}
        <View style={styles.actionSection}>
          <CustomButton 
            title={`Оформити за ${selectedPlan === 'yearly' ? '829' : '99'} ₴`}
            onPress={handleSubscribe}
            style={{ borderRadius: 16, height: 56 }}
          />
          <Text style={[styles.footerText, { color: COLORS.textLight }]}>
            Підписка автоматично продовжується. Скасувати можна будь-коли в налаштуваннях вашого акаунту. 
            Продовжуючи, ви погоджуєтеся з Умовами використання та Політикою конфіденційності.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  diamondContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFD700',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  featuresSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  plansSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 16,
  },
  planCardActive: {
    borderColor: '#34C759', // Приклад кольору primary
  },
  planCardYearly: {
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardActiveYearly: {
    borderColor: '#FFD700',
    backgroundColor: '#FFFCED', // Світло-золотий фон
  },
  badgeContainer: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planRadio: {
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  planDesc: {
    fontSize: 13,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '500',
  },
  planPriceDiscount: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '600',
    marginTop: 2,
  },
  actionSection: {
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  }
});