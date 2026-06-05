import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';

const { width } = Dimensions.get('window');

// Мокові дані для демонстрації. 
// У майбутньому їх можна винести у Zustand (useUserStore) та оновлювати реально.
const USER_STATS = {
  level: 12,
  currentXP: 1450,
  nextLevelXP: 2000,
  league: 'Майстри Свіжості',
  leagueIcon: 'ribbon',
  leagueColor: '#3498DB',
  totalSaved: 45,
  donated: 150,
};

const ACHIEVEMENTS = [
  { id: '1', title: 'Чистий холодильник', desc: 'Використайте 10 продуктів', icon: 'leaf', progress: 10, total: 10, completed: true, color: '#2ECC71' },
  { id: '5', title: 'Кармічний баланс', desc: 'Зробіть перший авто-донат', icon: 'heart', progress: 1, total: 1, completed: true, color: '#E74C3C' },
  { id: '2', title: 'ШІ-Дослідник', desc: 'Додайте 5 продуктів через фото', icon: 'camera', progress: 2, total: 5, completed: false, color: '#3498DB' },
  { id: '3', title: 'Магістр штрихкодів', desc: 'Відскануйте 20 штрихкодів', icon: 'barcode', progress: 15, total: 20, completed: false, color: '#9B59B6' },
  { id: '4', title: 'Ідеальний баланс', desc: 'Тиждень без зіпсованих продуктів', icon: 'scale', progress: 4, total: 7, completed: false, color: '#F1C40F' },
  { id: '6', title: 'Кулінарна магія', desc: 'Зготуйте страву з 5+ інгредієнтів', icon: 'restaurant', progress: 0, total: 1, completed: false, color: '#E67E22' },
];

export default function AchievementsScreen({ navigation }) {
  const { colors: COLORS, theme } = useThemeStore();
  const styles = getStyles(COLORS, theme);

  const progressPercent = (USER_STATS.currentXP / USER_STATS.nextLevelXP) * 100;

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
          
          {/* Міні-прогрес бар для досягнення */}
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Шапка з Лігою та Досвідом (КЛІКАБЕЛЬНА) */}
      <TouchableOpacity 
        style={styles.headerCard} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Leagues')}
      >
        <View style={styles.leagueRow}>
          <View style={[styles.leagueIconBg, { backgroundColor: `${USER_STATS.leagueColor}20` }]}>
            <Ionicons name={USER_STATS.leagueIcon} size={40} color={USER_STATS.leagueColor} />
          </View>
          <View style={styles.leagueInfo}>
            <Text style={styles.levelText}>Рівень {USER_STATS.level}</Text>
            <Text style={styles.leagueName}>{USER_STATS.league}</Text>
          </View>
          {/* Стрілочка, яка підказує, що можна натиснути */}
          <Ionicons name="chevron-forward" size={24} color={COLORS.outline} />
        </View>

        {/* Головний прогрес бар XP */}
        <View style={styles.xpContainer}>
          <View style={styles.xpTextRow}>
            <Text style={styles.xpText}>Досвід (XP)</Text>
            <Text style={styles.xpValues}>{USER_STATS.currentXP} / {USER_STATS.nextLevelXP}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: USER_STATS.leagueColor }]} />
          </View>
          <Text style={styles.xpHint}>Залишилось {USER_STATS.nextLevelXP - USER_STATS.currentXP} XP до наступного рівня</Text>
        </View>
      </TouchableOpacity>

      {/* Швидка статистика */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
          <Text style={styles.statValue}>{USER_STATS.totalSaved}</Text>
          <Text style={styles.statLabel}>Врятовано{"\n"}продуктів</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="heart" size={24} color={COLORS.danger} />
          <Text style={styles.statValue}>{USER_STATS.donated} ₴</Text>
          <Text style={styles.statLabel}>Передано{"\n"}на ЗСУ</Text>
        </View>
      </View>

      {/* Вітрина досягнень */}
      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>Ваші Досягнення</Text>
        <View style={styles.gridContainer}>
          {ACHIEVEMENTS.map(renderAchievement)}
        </View>
      </View>
      
    </ScrollView>
  );
}

const getStyles = (COLORS, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  leagueIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  leagueInfo: {
    flex: 1,
  },
  levelText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  leagueName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  xpContainer: {
    width: '100%',
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  xpValues: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressTrack: {
    height: 12,
    backgroundColor: COLORS.surfaceVariant, // Замінено для підтримки темної теми
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  xpHint: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  achievementsSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: (width - 40) / 2, // Дві колонки
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 14,
    height: 30, // Фіксована висота для вирівнювання сітки
    marginBottom: 12,
  },
  miniProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surfaceVariant, // Замінено для підтримки темної теми
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  miniProgressText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});