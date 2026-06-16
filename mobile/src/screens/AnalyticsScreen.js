import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity, StatusBar, Animated, Platform } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import DatePicker from '../components/DatePicker'; 
import { analyticsAPI } from '../services/api';
import { API_URL } from '../utils/constants';
import useThemeStore from '../store/themeStore';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { getTranslatedCategoryName } from '../utils/categoryHelper';

const screenWidth = Dimensions.get('window').width;
const chartColors = ['#2ECC71', '#3498DB', '#9B59B6', '#E67E22', '#E74C3C', '#1ABC9C', '#F1C40F'];

const MACRO_COLORS = {
  calories: '#E74C3C',
  proteins: '#3498DB',
  fats: '#F1C40F',
  carbs: '#2ECC71',
};

const PERIODS = [
  { id: '1m', labelKey: 'analytics.periods.1m', fallback: '1 місяць', days: 30 },
  { id: '3m', labelKey: 'analytics.periods.3m', fallback: '3 місяці', days: 90 },
  { id: '6m', labelKey: 'analytics.periods.6m', fallback: 'Півроку', days: 180 },
  { id: '1y', labelKey: 'analytics.periods.1y', fallback: '1 рік', days: 365 },
  { id: 'all', labelKey: 'analytics.periods.all', fallback: 'Весь час', days: 9999 },
  { id: 'custom', labelKey: 'analytics.periods.custom', fallback: 'Кастомний', days: null },
];

export default function AnalyticsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [streamedText, setStreamedText] = useState('');

  const [activePeriod, setActivePeriod] = useState(PERIODS[0]);
  const [activeChartFilter, setActiveChartFilter] = useState('all');

  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  });

  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = getStyles(COLORS, insets, tabBarHeight, theme);

  const animation = useRef(new Animated.Value(0)).current;
  const wsRef = useRef(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = activePeriod.id === 'custom'
        ? {
            start_date: customDateRange.start.toISOString().split('T')[0],
            end_date: customDateRange.end.toISOString().split('T')[0]
          }
        : { days: activePeriod.days };

      const statsRes = await analyticsAPI.get(params);
      setData(statsRes.data);
    } catch (error) {
      console.log('Помилка завантаження статистики', error);
    } finally {
      setLoadingStats(false);
    }
  }, [activePeriod, customDateRange]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      return () => {
        if (wsRef.current) wsRef.current.close();
      };
    }, [loadStats])
  );

  const handlePeriodChange = (period) => {
    setActivePeriod(period);
  };

  const handleGenerateRecs = async () => {
    if (loadingAi) {
      if (wsRef.current) wsRef.current.close();
      setLoadingAi(false);
      Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setStreamedText(prev => prev + "\n\n" + t('analytics.generationCancelled'));
      return;
    }

    setLoadingAi(true);
    setStreamedText('');
    Animated.timing(animation, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const lang = i18n.language?.startsWith('uk') ? 'uk' : 'en';

      let wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      if (Platform.OS === 'android' && wsUrl.includes('localhost')) wsUrl = wsUrl.replace('localhost', '10.0.2.2');
      else if (Platform.OS === 'android' && wsUrl.includes('127.0.0.1')) wsUrl = wsUrl.replace('127.0.0.1', '10.0.2.2');

      const ws = new WebSocket(`${wsUrl}/analytics/ws/ai-recommendations?days=${activePeriod.days || 30}&token=${token}&lang=${lang}`);
      wsRef.current = ws;

      ws.onmessage = (event) => setStreamedText(prev => prev + event.data);
      ws.onclose = () => {
        setLoadingAi(false);
        Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      };
      ws.onerror = (e) => {
        setStreamedText(t('analytics.loadStatsError'));
        setLoadingAi(false);
        Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      };
    } catch (error) {
      setStreamedText(t('analytics.loadStatsError'));
      setLoadingAi(false);
      Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };

  const rotateInterpolate = animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const animatedStyle = { transform: [{ rotate: rotateInterpolate }] };

  if (loadingStats && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('analytics.analyzingHabits')}</Text>
      </View>
    );
  }

  const pieChartData = data?.by_category?.map((item, index) => ({
    name: getTranslatedCategoryName(item.category, t),
    population: item.total,
    color: chartColors[index % chartColors.length],
    legendFontColor: COLORS.text,
    legendFontSize: 12,
  })) || [];

  const rawNutritionData = data?.nutrition_history || [];

  let finalLabels = [];
  let finalData = { calories: [], proteins: [], fats: [], carbs: [] };

  if (rawNutritionData.length === 0) {
    finalLabels = [t('analytics.noData', 'Немає даних'), ' '];
    finalData = { calories: [0, 0], proteins: [0, 0], fats: [0, 0], carbs: [0, 0] };
  } else {
    // 1. Визначаємо початкову і кінцеву дати для графіка
    let startDate, endDate;
    const now = new Date();
    
    if (activePeriod.id === 'custom') {
      startDate = new Date(customDateRange.start);
      endDate = new Date(customDateRange.end);
    } else if (activePeriod.id === 'all') {
      startDate = new Date(rawNutritionData[0].date);
      endDate = now;
    } else {
      endDate = now;
      startDate = new Date();
      startDate.setDate(endDate.getDate() - (activePeriod.days || 30) + 1);
    }

    // Коригуємо початкову дату, якщо запис був раніше за розрахований період
    const firstDataDate = new Date(rawNutritionData[0].date);
    if (firstDataDate < startDate && activePeriod.id !== 'custom') {
      startDate = firstDataDate;
    }

    // 2. Генеруємо масив усіх дат (уникаючи проблеми часових поясів з toISOString)
    const allDates = [];
    let curr = new Date(startDate);
    curr.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const formatDateLocal = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    while (curr <= end) {
      allDates.push(formatDateLocal(curr));
      curr.setDate(curr.getDate() + 1);
    }

    // 3. Мапимо отримані з бекенду дані по датах
    const dataByDate = {};
    rawNutritionData.forEach(d => {
      dataByDate[d.date] = d;
    });

    // Крок для відображення підписів осі X, щоб дати не накладалися одна на одну
    const maxLabels = 6;
    const step = Math.max(1, Math.floor(allDates.length / maxLabels));

    allDates.forEach((dateStr, index) => {
      const [, month, day] = dateStr.split('-');
      
      // Відображаємо підпис лише для кожного N-го елемента або останнього
      if (index % step === 0 || index === allDates.length - 1) {
        finalLabels.push(`${day}.${month}`);
      } else {
        finalLabels.push(''); // Пустий підпис для збереження пропорцій графіка
      }

      // Якщо в цей день не було споживання, ставимо 0
      const dayData = dataByDate[dateStr] || { calories: 0, proteins: 0, fats: 0, carbs: 0 };
      finalData.calories.push(dayData.calories);
      finalData.proteins.push(dayData.proteins);
      finalData.fats.push(dayData.fats);
      finalData.carbs.push(dayData.carbs);
    });

    // Захист для графіка, якщо після всіх маніпуляцій вийшов лише 1 день
    if (allDates.length === 1) {
      finalLabels.push(' ');
      finalData.calories.push(finalData.calories[0]);
      finalData.proteins.push(finalData.proteins[0]);
      finalData.fats.push(finalData.fats[0]);
      finalData.carbs.push(finalData.carbs[0]);
    }
  }

  const nutritionDatasets = [];
  if (activeChartFilter === 'all' || activeChartFilter === 'calories') {
    nutritionDatasets.push({ data: finalData.calories, color: () => MACRO_COLORS.calories, strokeWidth: 2 });
  }
  if (activeChartFilter === 'all' || activeChartFilter === 'macros') {
    nutritionDatasets.push({ data: finalData.proteins, color: () => MACRO_COLORS.proteins, strokeWidth: 2 });
    nutritionDatasets.push({ data: finalData.fats, color: () => MACRO_COLORS.fats, strokeWidth: 2 });
    nutritionDatasets.push({ data: finalData.carbs, color: () => MACRO_COLORS.carbs, strokeWidth: 2 });
  }

  const lineChartData = {
    labels: finalLabels,
    datasets: nutritionDatasets,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('analytics.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loadingStats} onRefresh={loadStats} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => navigation.navigate('Products')}>
            <Text style={styles.statValue}>{data?.total_products_in_fridge || 0}</Text>
            <Text style={styles.statLabel}>{t('analytics.productsAtHome')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => navigation.navigate('History')}>
            <Text style={styles.statValue}>{data?.consumed_products?.length || 0}</Text>
            <Text style={styles.statLabel}>{t('analytics.consumedPerMonth')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('analytics.macrosDynamics', 'Динаміка КБЖВ')}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodContainer} contentContainerStyle={{ gap: 8 }}>
            {PERIODS.map(period => (
              <TouchableOpacity
                key={period.id}
                style={[styles.periodPill, activePeriod.id === period.id && styles.periodPillActive]}
                onPress={() => handlePeriodChange(period)}
              >
                <Text style={[styles.periodText, activePeriod.id === period.id && styles.periodTextActive]}>
                  {t(period.labelKey, period.fallback)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activePeriod.id === 'custom' && (
            <View style={styles.customDateContainer}>
              <View style={styles.datePickerWrapper}>
                <DatePicker
                  label={t('common.from', 'Від')}
                  date={customDateRange.start}
                  maximumDate={customDateRange.end}
                  onDateChange={(selectedDate) => setCustomDateRange(prev => ({ ...prev, start: selectedDate }))}
                />
              </View>
              <View style={styles.datePickerWrapper}>
                <DatePicker
                  label={t('common.to', 'До')}
                  date={customDateRange.end}
                  minimumDate={customDateRange.start}
                  maximumDate={new Date()}
                  onDateChange={(selectedDate) => setCustomDateRange(prev => ({ ...prev, end: selectedDate }))}
                />
              </View>
            </View>
          )}

          {/* Segmented Control для фільтрів */}
          <View style={styles.chartFilterContainer}>
             <TouchableOpacity onPress={() => setActiveChartFilter('all')} style={[styles.filterBtn, activeChartFilter === 'all' && styles.filterBtnActive]}>
                <Text style={[styles.filterBtnText, activeChartFilter === 'all' && styles.filterBtnTextActive]}>{t('common.all', 'Всі')}</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setActiveChartFilter('calories')} style={[styles.filterBtn, activeChartFilter === 'calories' && styles.filterBtnActive]}>
                <Text style={[styles.filterBtnText, activeChartFilter === 'calories' && styles.filterBtnTextActive]}>{t('analytics.calories', 'Калорії')}</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setActiveChartFilter('macros')} style={[styles.filterBtn, activeChartFilter === 'macros' && styles.filterBtnActive]}>
                <Text style={[styles.filterBtnText, activeChartFilter === 'macros' && styles.filterBtnTextActive]}>{t('analytics.macros', 'БЖВ')}</Text>
             </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={lineChartData}
              width={Math.max(screenWidth - 88, finalLabels.length * 40)}
              height={220}
              withDots={finalLabels.length < 30}
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => COLORS.text,
                labelColor: (opacity = 1) => COLORS.onSurfaceVariant,
                propsForDots: { r: "4", strokeWidth: "2" }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </ScrollView>

          <View style={styles.legendContainer}>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: MACRO_COLORS.calories}]}/><Text style={styles.legendText}>{t('analytics.kcal', 'Ккал')}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: MACRO_COLORS.proteins}]}/><Text style={styles.legendText}>{t('addProduct.proteins', 'Білки')}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: MACRO_COLORS.fats}]}/><Text style={styles.legendText}>{t('addProduct.fats', 'Жири')}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: MACRO_COLORS.carbs}]}/><Text style={styles.legendText}>{t('addProduct.carbs', 'Вуглеводи')}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('analytics.consumptionByCategory')}</Text>
          {pieChartData.length > 0 ? (
            <PieChart
              data={pieChartData}
              width={screenWidth - 88}
              height={220}
              chartConfig={{ color: () => COLORS.text }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              absolute
            />
          ) : (
            <Text style={styles.emptyText}>{t('analytics.noConsumptionData')}</Text>
          )}
        </View>

        <View style={styles.sectionAi}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={26} color={COLORS.primary} />
            <Text style={styles.sectionTitleAi}>{t('analytics.aiRecommendationsTitle')}</Text>
          </View>

          <TouchableOpacity style={styles.generateButton} onPress={handleGenerateRecs} activeOpacity={0.8}>
            <Animated.View style={animatedStyle}>
              <Ionicons name={loadingAi ? "close" : "sparkles-outline"} size={22} color={COLORS.onPrimary} />
            </Animated.View>
            <Text style={styles.generateButtonText}>{loadingAi ? t('common.cancel') : t('analytics.getAdvice')}</Text>
          </TouchableOpacity>

          {streamedText ? (
            <View style={styles.aiTextContainer}>
              <MarkdownRenderer content={streamedText} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (COLORS, insets, tabBarHeight, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
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

  scrollContent: { padding: 20, paddingBottom: tabBarHeight + 40 },
  loadingText: { marginTop: 16, fontSize: 15, fontWeight: '500', color: COLORS.onSurfaceVariant },

  // ─── Stats Cards ───────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statValue: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 14, color: COLORS.onSurfaceVariant, marginTop: 8, textAlign: 'center', fontWeight: '600' },

  // ─── Sections ──────────────────────────────────────────────────────────────
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 24,
    borderRadius: 24,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  emptyText: { textAlign: 'center', color: COLORS.onSurfaceVariant, paddingVertical: 30, fontSize: 15 },

  // ─── Period Pills ──────────────────────────────────────────────────────────
  periodContainer: { marginBottom: 20, paddingBottom: 4 },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceVariant,
  },
  periodPillActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: 14, fontWeight: '600', color: COLORS.onSurfaceVariant },
  periodTextActive: { color: COLORS.onPrimary, fontWeight: '700' },

  customDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  datePickerWrapper: { flex: 1 },

  // ─── Segmented Control (Chart Filters) ─────────────────────────────────────
  chartFilterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center'
  },
  filterBtnActive: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  filterBtnTextActive: { color: COLORS.primary, fontWeight: '700' },

  legendContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, fontWeight: '500', color: COLORS.text },

  // ─── AI Section ────────────────────────────────────────────────────────────
  sectionAi: {
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  sectionTitleAi: { fontSize: 20, fontWeight: '800', color: COLORS.onPrimaryContainer },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 16,
    gap: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  generateButtonText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '700' },
  aiTextContainer: { marginTop: 20 },
});