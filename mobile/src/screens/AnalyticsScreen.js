import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { analyticsAPI } from '../services/api';
import { COLORS } from '../utils/constants';

const screenWidth = Dimensions.get('window').width;

const chartColors = ['#2ECC71', '#3498DB', '#9B59B6', '#E67E22', '#E74C3C', '#1ABC9C', '#F1C40F'];

export default function AnalyticsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [aiRecs, setAiRecs] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, aiRes] = await Promise.all([
        analyticsAPI.get(30),
        analyticsAPI.getRecommendations(30)
      ]);
      setData(statsRes.data);
      setAiRecs(aiRes.data);
    } catch (error) {
      console.log('Помилка завантаження аналітики', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Холодильник')}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Споживання за категоріями</Text>
        {chartData.length > 0 ? (
          <PieChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{ color: () => '#000' }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute
          />
        ) : (
          <Text style={styles.emptyText}>Немає даних про споживання за останні 30 днів</Text>
        )}
      </View>

      {aiRecs && (
        <View style={styles.section}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={24} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>AI Рекомендації дієтолога</Text>
          </View>
          <View style={styles.aiCard}>
            <Text style={styles.aiText}>{aiRecs.recommendations}</Text>
            {aiRecs.tips && aiRecs.tips.length > 0 && (
              <View style={styles.tipsContainer}>
                {aiRecs.tips.map((tip, idx) => (
                  <View key={idx} style={styles.tipItem}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: COLORS.textLight },
  statsRow: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  statCard: { flex: 1, backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, marginHorizontal: 5, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 14, color: COLORS.textLight, marginTop: 4, textAlign: 'center' },
  section: { backgroundColor: COLORS.surface, marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  emptyText: { textAlign: 'center', color: COLORS.textLight, fontStyle: 'italic', paddingVertical: 20 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  aiCard: { backgroundColor: '#F0F9FF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD' },
  aiText: { fontSize: 15, color: COLORS.text, lineHeight: 22, marginBottom: 16 },
  tipsContainer: { borderTopWidth: 1, borderTopColor: '#BAE6FD', paddingTop: 16, gap: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
});