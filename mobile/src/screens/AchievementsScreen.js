import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';
import { achievementsAPI } from '../services/api';
import * as db from '../services/db';

const { width } = Dimensions.get('window');

const ROADMAP_DATA = [
  { id: '1', level: 1, titleKey: 'achievements.roadmap1', icon: 'leaf', color: '#2ECC71' },
  { id: '4', level: 101, titleKey: 'achievements.roadmap2', icon: 'ribbon', color: '#3498DB' },
  { id: '6', level: 201, titleKey: 'achievements.roadmap3', icon: 'planet', color: '#F1C40F' },
];

export default function AchievementsScreen({ navigation }) {
  const { t } = useTranslation();
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
          await refreshUser();
          const response = await achievementsAPI.get();
          setAchievements(response.data);
          await db.write(db.KEYS.ACHIEVEMENTS, response.data);
        } catch (error) {
          console.error("Failed to fetch data", error);
          const cached = await db.read(db.KEYS.ACHIEVEMENTS);
          if (cached) {
            setAchievements(cached);
          }
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
          <Ionicons name={item.icon} size={26} color={isCompleted ? item.color : COLORS.onSurfaceVariant} />
        </View>
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.achievementDesc} numberOfLines={2}>{item.desc}</Text>

          <View style={styles.miniProgressContainer}>
            <View style={styles.miniProgressTrack}>
              <View
                style={[
                  styles.miniProgressFill,
                  { width: `${itemProgressPercent}%`, backgroundColor: isCompleted ? item.color : COLORS.onSurfaceVariant }
                ]}
              />
            </View>
            <Text style={styles.miniProgressText}>{item.progress} / {item.total}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />

      <TouchableOpacity style={styles.headerCard} activeOpacity={0.8} onPress={() => navigation.navigate('Leagues')}>
        <View style={styles.leagueRow}>
          <View style={[styles.leagueIconBg, { backgroundColor: `${currentLeague.color}15` }]}>
            <Ionicons name={currentLeague.icon} size={36} color={currentLeague.color} />
          </View>
          <View style={styles.leagueInfo}>
            <Text style={styles.levelText}>{t('achievements.level')} {currentLevel}</Text>
            <Text style={styles.leagueName}>{t(currentLeague.titleKey)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.outline} />
        </View>

        <View style={styles.xpContainer}>
          <View style={styles.xpTextRow}>
            <Text style={styles.xpText}>{t('achievements.experience')}</Text>
            <Text style={[styles.xpValues, { color: currentLeague.color }]}>
              {currentXP} <Text style={{ color: COLORS.text }}>/ {nextLevelXP}</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: currentLeague.color }]} />
          </View>
          <Text style={styles.xpHint}>{t('achievements.xpLeft', { xp: nextLevelXP - currentXP })}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.achievementsSection}>
        <Text style={styles.sectionLabel}>{t('achievements.yourAchievements')}</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40
  },

  // ─── Header Card (League & XP) ─────────────────────────────────────────────
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16
  },
  leagueIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4
  },
  leagueName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text
  },

  xpContainer: {
    width: '100%'
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  xpText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text
  },
  xpValues: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 14,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 12
  },
  progressFill: {
    height: '100%',
    borderRadius: 7
  },
  xpHint: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '500'
  },

  // ─── Achievements Section ──────────────────────────────────────────────────
  achievementsSection: {
    width: '100%'
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  achievementCard: {
    // 16 is the gap size, 40 is the horizontal padding (20 + 20)
    width: (width - 40 - 16) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  achievementLocked: {
    opacity: 0.6
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6
  },
  achievementDesc: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
    height: 36,
    marginBottom: 16
  },

  miniProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  miniProgressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden'
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 4
  },
  miniProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant
  },
});