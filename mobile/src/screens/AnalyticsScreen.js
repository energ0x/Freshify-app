import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity, StatusBar, Animated, Platform } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as SecureStore from 'expo-secure-store';
import { analyticsAPI } from '../services/api';
import { API_URL } from '../utils/constants';
import useThemeStore from '../store/themeStore';
import MarkdownRenderer from '../components/MarkdownRenderer';

const screenWidth = Dimensions.get('window').width;
const chartColors = ['#2ECC71', '#3498DB', '#9B59B6', '#E67E22', '#E74C3C', '#1ABC9C', '#F1C40F'];

export default function AnalyticsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = getStyles(COLORS, insets, tabBarHeight);

  const animation = useRef(new Animated.Value(0)).current;
  const wsRef = useRef(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const statsRes = await analyticsAPI.get(30);
      setData(statsRes.data);
    } catch (error) {
      console.log('Помилка завантаження статистики', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [loadStats]);

  const handleGenerateRecs = async () => {
    if (loadingAi) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setLoadingAi(false);
      Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setStreamedText(prev => prev + "\n\n**Генерацію скасовано.**");
      return;
    }

    setLoadingAi(true);
    setStreamedText('');
    Animated.timing(animation, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      
      let wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      if (Platform.OS === 'android' && wsUrl.includes('localhost')) {
        wsUrl = wsUrl.replace('localhost', '10.0.2.2');
      } else if (Platform.OS === 'android' && wsUrl.includes('127.0.0.1')) {
        wsUrl = wsUrl.replace('127.0.0.1', '10.0.2.2');
      }
      
      const ws = new WebSocket(`${wsUrl}/analytics/ws/ai-recommendations?days=30&token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        setStreamedText(prev => prev + event.data);
      };

      ws.onclose = (event) => {
        setLoadingAi(false);
        Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      };

      ws.onerror = (e) => {
        console.log("WebSocket Error:", e.message);
        setStreamedText('Не вдалося завантажити рекомендації.');
        setLoadingAi(false);
        Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      };

    } catch (error) {
      console.log('Помилка ініціалізації WebSocket', error);
      setStreamedText('Не вдалося завантажити рекомендації.');
      setLoadingAi(false);
      Animated.timing(animation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const animatedStyle = {
    transform: [{ rotate: rotateInterpolate }],
  };

  if (loadingStats && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Аналізуємо ваші харчові звички...</Text>
      </View>
    );
  }

  const chartData = data?.by_category?.map((item, index) => ({
    name: item.category,
    population: item.total,
    color: chartColors[index % chartColors.length],
    legendFontColor: COLORS.text,
    legendFontSize: 12,
  })) || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Аналітика</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loadingStats} onRefresh={loadStats} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Stat Cards ──────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Продукти')}
          >
            <Text style={styles.statValue}>{data?.total_products_in_fridge || 0}</Text>
            <Text style={styles.statLabel}>Продуктів вдома</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.statValue}>{data?.consumed_products?.length || 0}</Text>
            <Text style={styles.statLabel}>Спожито за місяць</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Pie Chart ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Споживання за категоріями</Text>
          {chartData.length > 0 ? (
            <PieChart
              data={chartData}
              width={screenWidth - 80}
              height={220}
              chartConfig={{ color: () => COLORS.text }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              absolute
            />
          ) : (
            <Text style={styles.emptyText}>Немає даних про споживання за останні 30 днів</Text>
          )}
        </View>

        {/* ─── AI Recommendations ──────────────────────────────────────────── */}
        <View style={styles.sectionAi}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={24} color={COLORS.warning} />
            <Text style={styles.sectionTitleAi}>AI Рекомендації дієтолога</Text>
          </View>

          <TouchableOpacity style={styles.generateButton} onPress={handleGenerateRecs}>
            <Animated.View style={animatedStyle}>
              <Ionicons name={loadingAi ? "close" : "sparkles-outline"} size={24} color={COLORS.onPrimary} />
            </Animated.View>
            <Text style={styles.generateButtonText}>{loadingAi ? "Скасувати" : "Отримати поради"}</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  // ─── Header ────────────────────────────────────────────────────────────────
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },

  // ─── Scroll content ────────────────────────────────────────────────────────
  scrollContent: {
    padding: 20,
    paddingBottom: tabBarHeight + 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },

  // ─── Stat cards ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceVariant,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },

  // ─── Section card ──────────────────────────────────────────────────────────
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.onSurfaceVariant,
    paddingVertical: 30,
  },

  // ─── AI section ────────────────────────────────────────────────────────────
  sectionAi: {
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 24,
    padding: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitleAi: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onPrimaryContainer,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 100,
    gap: 10,
  },
  generateButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  aiTextContainer: {
    marginTop: 16,
  },
});