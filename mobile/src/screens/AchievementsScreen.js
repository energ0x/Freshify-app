import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';
import { achievementsAPI } from '../services/api';

const { width } = Dimensions.get('window');

const ROADMAP_DATA = [
  { id: '1', level: 1, title: 'Зелені Паростки', icon: 'leaf', color: '#2ECC71' },
  { id: '4', level: 101, title: 'Майстри Свіжості', icon: 'ribbon', color: '#3498DB' },
  { id: '6', level: 201, title: 'Еко-Герої', icon: 'planet', color: '#F1C40F' },
];

const OTHER_STATS = {
  totalSaved: 45,
  donated: 150,
};

export default function AchievementsScreen({ navigation }) {
  const { colors: COLORS, theme } = useThemeStore();
  const { user, refreshUser } = useAuthStore();
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          // Оновлюємо і користувача (для XP) і ачівки
          await refreshUser();
          const response = await achievementsAPI.get();
          setAchievements(response.data);
        } catch (error) {
          console.error("Failed to fetch data", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [refreshUser])
  );

  const currentXP = user?.xp_points || 0;
  const currentLevel = Math.floor(currentXP / 100) + 1;
  const nextLevelXP = (Math.floor(currentXP / 100) + 1) * 100;
  const progressPercent = (currentXP % 100);

  const currentLeague = ROADMAP_DATA.slice().reverse().find(l => currentLevel >= l.level) || ROADMAP_DATA[0];

  const renderAchievement = (item) => {
    const isCompleted = item.completed;
    const itemProgressPercent = item.total > 0 ? (item.progress / item.total) * 100 : 0;

    return (
      <View key={item.id} style={[styles.achievementCard, !isCompleted && styles.achievementLocked]}>
        <View style={[styles.iconContainer, { backgroundColor: isCompleted ? `${item.color}20` : COLORS.surfaceVariant }]}>
          <Ionicons name={item.icon} size={28} color={isCompleted ? item.color : COLORS.textLight} />
        </View>
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.achievementDesc} numberOfLines={2}>{item.desc}</Text>
          
          <View style={styles.miniProgressContainer}>
            <View style={styles.miniProgressTrack}>
              <View 
                style={[
                  styles.miniProgressFill, 
                  { width: `${itemProgressPercent}%`, backgroundColor: isCompleted ? item.color : COLORS.textLight }
                ]} 
              />
            </View>
            <Text style={styles.miniProgressText}>{item.progress}/{item.total}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      <TouchableOpacity style={styles.headerCard} activeOpacity={0.8} onPress={() => navigation.navigate('Leagues')}>
        <View style={styles.leagueRow}>
          <View style={[styles.leagueIconBg, { backgroundColor: `${currentLeague.color}20` }]}>
            <Ionicons name={currentLeague.icon} size={40} color={currentLeague.color} />
          </View>
          <View style={styles.leagueInfo}>
            <Text style={styles.levelText}>Рівень {currentLevel}</Text>
            <Text style={styles.leagueName}>{currentLeague.title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.outline} />
        </View>

        <View style={styles.xpContainer}>
          <View style={styles.xpTextRow}>
            <Text style={styles.xpText}>Досвід (XP)</Text>
            <Text style={styles.xpValues}>{currentXP} / {nextLevelXP}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: currentLeague.color }]} />
          </View>
          <Text style={styles.xpHint}>Залишилось {nextLevelXP - currentXP} XP до наступного рівня</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="shield-checkmark" size={26} color={COLORS.success} />
          <Text style={styles.statValue}>{OTHER_STATS.totalSaved}</Text>
          <Text style={styles.statLabel}>Врятовано{"\n"}продуктів</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="heart" size={26} color={COLORS.danger} />
          <Text style={styles.statValue}>{OTHER_STATS.donated} ₴</Text>
          <Text style={styles.statLabel}>Передано{"\n"}на ЗСУ</Text>
        </View>
      </View>

      <View style={styles.achievementsSection}>
        <Text style={styles.sectionLabel}>Ваші Досягнення</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.gridContainer}>
            {achievements.map(renderAchievement)}
          </View>
        )}
      </View>
      
    </ScrollView>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leagueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  leagueIconBg: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  leagueInfo: { flex: 1 },
  levelText: { fontSize: 14, color: COLORS.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  leagueName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  
  xpContainer: { width: '100%' },
  xpTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  xpText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  xpValues: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  progressTrack: { height: 12, backgroundColor: COLORS.surfaceVariant, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 6 },
  xpHint: { fontSize: 12, color: COLORS.textLight, textAlign: 'center' },
  
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', marginTop: 4 },
  
  achievementsSection: { width: '100%' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 4 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  achievementCard: {
    width: (width - 40 - 12) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  achievementLocked: { opacity: 0.5 },
  iconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  achievementTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  achievementDesc: { fontSize: 12, color: COLORS.textLight, lineHeight: 16, height: 32, marginBottom: 12 },
  
  miniProgressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniProgressTrack: { flex: 1, height: 6, backgroundColor: COLORS.surfaceVariant, borderRadius: 3, marginRight: 8, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 3 },
  miniProgressText: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
});
