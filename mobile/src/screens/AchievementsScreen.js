import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';

const { width } = Dimensions.get('window');

// Дані про ліги та рівні, можна винести в константи, якщо використовуються в кількох місцях
const ROADMAP_DATA = [
  { id: '1', level: 1, title: 'Зелені Паростки', icon: 'leaf', color: '#2ECC71' },
  { id: '4', level: 101, title: 'Майстри Свіжості', icon: 'ribbon', color: '#3498DB' },
  { id: '6', level: 201, title: 'Еко-Герої', icon: 'planet', color: '#F1C40F' },
];

const ACHIEVEMENTS = [
  { id: '1', title: 'Чистий холодильник', desc: 'Використайте 10 продуктів', icon: 'leaf', progress: 10, total: 10, completed: true, color: '#2ECC71' },
  { id: '5', title: 'Кармічний баланс', desc: 'Зробіть перший авто-донат', icon: 'heart', progress: 1, total: 1, completed: true, color: '#E74C3C' },
  { id: '2', title: 'ШІ-Дослідник', desc: 'Додайте 5 продуктів через фото', icon: 'camera', progress: 2, total: 5, completed: false, color: '#3498DB' },
  { id: '3', title: 'Магістр штрихкодів', desc: 'Відскануйте 20 штрихкодів', icon: 'barcode', progress: 15, total: 20, completed: false, color: '#9B59B6' },
  { id: '4', title: 'Ідеальний баланс', desc: 'Тиждень без зіпсованих продуктів', icon: 'scale', progress: 4, total: 7, completed: false, color: '#F1C40F' },
  { id: '6', title: 'Кулінарна магія', desc: 'Зготуйте страву з 5+ інгредієнтів', icon: 'restaurant', progress: 0, total: 1, completed: false, color: '#E67E22' },
];

// Мокові дані для статистики, які в майбутньому будуть приходити з API
const OTHER_STATS = {
  totalSaved: 45,
  donated: 150,
};

export default function AchievementsScreen({ navigation }) {
  const { colors: COLORS, theme } = useThemeStore();
  const { user } = useAuthStore();
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

  const currentXP = user?.xp_points || 0;
  const currentLevel = Math.floor(currentXP / 100) + 1;
  const nextLevelXP = (Math.floor(currentXP / 100) + 1) * 100;
  const progressPercent = (currentXP % 100);

  const currentLeague = ROADMAP_DATA.slice().reverse().find(l => currentLevel >= l.level) || ROADMAP_DATA[0];

  const renderAchievement = (item) => {
    const isCompleted = item.progress >= item.total;
    const itemProgressPercent = (item.progress / item.total) * 100;

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
        <View style={styles.gridContainer}>
          {ACHIEVEMENTS.map(renderAchievement)}
        </View>
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
    width: (width - 40 - 12) / 2, // Ширина екрану - (20+20) відступи - 12 між картками / 2
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