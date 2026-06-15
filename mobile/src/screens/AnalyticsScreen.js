import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity, StatusBar, Animated, Platform, Alert } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

// Імпортуємо твій кастомний компонент
import DatePicker from '../components/DatePicker'; 

import { analyticsAPI } from '../services/api';
import { API_URL } from '../utils/constants';
import useThemeStore from '../store/themeStore';
import MarkdownRenderer from '../components/MarkdownRenderer';

const screenWidth = Dimensions.get('window').width;
const chartColors = ['#2ECC71', '#3498DB', '#9B59B6', '#E67E22', '#E74C3C', '#1ABC9C', '#F1C40F'];

const MACRO_COLORS = {
  calories: '#E74C3C',
  proteins: '#3498DB',
  fats: '#F1C40F',
  carbs: '#2ECC71',
};

const PERIODS = [
  { id: '1m', label: '1 місяць', days: 30 },
  { id: '3m', label: '3 місяці', days: 90 },
  { id: '6m', label: 'Півроку', days: 180 },
  { id: '1y', label: '1 рік', days: 365 },
  { id: 'all', label: 'Весь час', days: 9999 },
  { id: 'custom', label: 'Кастомний', days: null },
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
  const styles = getStyles(COLORS, insets, tabBarHeight);

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
      // Отримуємо мову
      const lang = i18n.language?.startsWith('uk') ? 'uk' : 'en';

      let wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      if (Platform.OS === 'android' && wsUrl.includes('localhost')) wsUrl = wsUrl.replace('localhost', '10.0.2.2');
      else if (Platform.OS === 'android' && wsUrl.includes('127.0.0.1')) wsUrl = wsUrl.replace('127.0.0.1', '10.0.2.2');
      
      // Додаємо параметр lang до запиту
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
    name: item.category,
    population: item.total,
    color: chartColors[index % chartColors.length],
    legendFontColor: COLORS.text,
    legendFontSize: 12,
  })) || [];

  const rawNutritionData = data?.nutrition_history || [];
  
  let finalLabels = [];
  let finalData = { calories: [], proteins: [], fats: [], carbs: [] };

  if (rawNutritionData.length === 0) {
    finalLabels = ['Немає даних', ' '];
    finalData = { calories: [0, 0], proteins: [0, 0], fats: [0, 0], carbs: [0, 0] };
  } else if (rawNutritionData.length === 1) {
    finalLabels = [rawNutritionData[0].date, ' '];
    const d = rawNutritionData[0];
    finalData = {
      calories: [d.calories, d.calories],
      proteins: [d.proteins, d.proteins],
      fats: [d.fats, d.fats],
      carbs: [d.carbs, d.carbs],
    };
  } else {
    finalLabels = rawNutritionData.map(d => d.date);
    finalData = {
      calories: rawNutritionData.map(d => d.calories),
      proteins: rawNutritionData.map(d => d.proteins),
      fats: rawNutritionData.map(d => d.fats),
      carbs: rawNutritionData.map(d => d.carbs),
    };
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
          <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => navigation.navigate('Products')}>
            <Text style={styles.statValue}>{data?.total_products_in_fridge || 0}</Text>
            <Text style={styles.statLabel}>{t('analytics.productsAtHome')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => navigation.navigate('History')}>
            <Text style={styles.statValue}>{data?.consumed_products?.length || 0}</Text>
            <Text style={styles.statLabel}>{t('analytics.consumedPerMonth')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Динаміка КБЖВ</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodContainer} contentContainerStyle={{ gap: 8 }}>
            {PERIODS.map(period => (
              <TouchableOpacity
                key={period.id}
                style={[styles.periodPill, activePeriod.id === period.id && { backgroundColor: COLORS.primary }]}
                onPress={() => handlePeriodChange(period)}
              >
                <Text style={[styles.periodText, activePeriod.id === period.id && { color: COLORS.onPrimary }]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activePeriod.id === 'custom' && (
            <View style={styles.customDateContainer}>
              <View style={styles.datePickerWrapper}>
                <DatePicker
                  label="Від"
                  date={customDateRange.start}
                  maximumDate={customDateRange.end}
                  onDateChange={(selectedDate) => setCustomDateRange(prev => ({ ...prev, start: selectedDate }))}
                />
              </View>
              <View style={styles.datePickerWrapper}>
                <DatePicker
                  label="До"
                  date={customDateRange.end}
                  minimumDate={customDateRange.start}
                  maximumDate={new Date()}
                  onDateChange={(selectedDate) => setCustomDateRange(prev => ({ ...prev, end: selectedDate }))}
                />
              </View>
            </View>
          )}

          <View style={styles.chartFilterContainer}>
             <TouchableOpacity onPress={() => setActiveChartFilter('all')} style={[styles.filterBtn, activeChartFilter === 'all' && styles.filterBtnActive]}>
                <Text style={[styles.filterBtnText, activeChartFilter === 'all' && {color: COLORS.primary}]}>Всі</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setActiveChartFilter('calories')} style={[styles.filterBtn, activeChartFilter === 'calories' && styles.filterBtnActive]}>
                <Text style={[styles.filterBtnText, activeChartFilter === 'calories' && {color: COLORS.primary}]}>Калорії</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setActiveChartFilter('macros')} style={[styles.filterBtn, activeChartFilter === 'macros' && styles.filterBtnActive]}>
                <Text style={[styles.filterBtnText, activeChartFilter === 'macros' && {color: COLORS.primary}]}>БЖВ</Text>
             </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={lineChartData}
              width={Math.max(screenWidth - 40, rawNutritionData.length * 40)} 
              height={220}
              withDots={rawNutritionData.length < 30} 
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
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: MACRO_COLORS.calories}]}/><Text style={styles.legendText}>Ккал</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: MACRO_COLORS.proteins}]}/><Text style={styles.legendText}>Білки</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: MACRO_COLORS.fats}]}/><Text style={styles.legendText}>Жири</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: MACRO_COLORS.carbs}]}/><Text style={styles.legendText}>Вуглеводи</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('analytics.consumptionByCategory')}</Text>
          {pieChartData.length > 0 ? (
            <PieChart
              data={pieChartData}
              width={screenWidth - 80}
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
            <Ionicons name="sparkles" size={24} color={COLORS.warning} />
            <Text style={styles.sectionTitleAi}>{t('analytics.aiRecommendationsTitle')}</Text>
          </View>

          <TouchableOpacity style={styles.generateButton} onPress={handleGenerateRecs}>
            <Animated.View style={animatedStyle}>
              <Ionicons name={loadingAi ? "close" : "sparkles-outline"} size={24} color={COLORS.onPrimary} />
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

const getStyles = (COLORS, insets, tabBarHeight) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  scrollContent: { padding: 20, paddingBottom: tabBarHeight + 40 },
  loadingText: { marginTop: 16, fontSize: 14, color: COLORS.onSurfaceVariant },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surfaceVariant, padding: 20, borderRadius: 24, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 13, color: COLORS.text, marginTop: 8, textAlign: 'center', fontWeight: '500' },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  emptyText: { textAlign: 'center', color: COLORS.onSurfaceVariant, paddingVertical: 30 },
  
  periodContainer: { marginBottom: 16, paddingBottom: 4 },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant,
    marginRight: 8,
  },
  periodText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  
  customDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  datePickerWrapper: {
    flex: 1,
  },
  
  chartFilterContainer: { flexDirection: 'row', gap: 12, marginBottom: 12, justifyContent: 'center' },
  filterBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  filterBtnActive: { backgroundColor: COLORS.primaryContainer },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.text },

  sectionAi: { backgroundColor: COLORS.primaryContainer, borderRadius: 24, padding: 20 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitleAi: { fontSize: 18, fontWeight: '700', color: COLORS.onPrimaryContainer },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 100, gap: 10 },
  generateButtonText: { color: COLORS.onPrimary, fontSize: 16, fontWeight: '600' },
  aiTextContainer: { marginTop: 16 },
});