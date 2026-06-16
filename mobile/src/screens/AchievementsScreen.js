/**
 * @file AchievementsScreen.js
 * @description Screen displaying the user's achievements, level progression, and current league.
 * Fetches user profile data and achievement progress from the server on screen focus.
 * Falls back to locally cached database data (using local db service) if offline or upon fetch failure.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';
import { achievementsAPI } from '../services/api';
import * as db from '../services/db';

const { width } = Dimensions.get('window');

/**
 * Roadmap array representing levels at which users graduate to new leagues.
 */
const ROADMAP_DATA = [
  { id: '1', level: 1, titleKey: 'achievements.roadmap1', icon: 'leaf', color: '#2ECC71' },
  { id: '4', level: 101, titleKey: 'achievements.roadmap2', icon: 'ribbon', color: '#3498DB' },
  { id: '6', level: 201, titleKey: 'achievements.roadmap3', icon: 'planet', color: '#F1C40F' },
];

/**
 * AchievementsScreen component.
 * Displays level badges, current XP progress, and lists unlocked/locked achievements.
 * 
 * @param {object} props.navigation - React Navigation handle.
 */
export default function AchievementsScreen({ navigation }) {
  // Localization Hook.
  const { t } = useTranslation();
  // Store hook for application color palette and theme.
  const { colors: COLORS, theme } = useThemeStore();
  // Store hook for user profile data and refreshing action.
  const { user, refreshUser } = useAuthStore();
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  // States for holding achievements data and tracking network request loading.
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Screen focus effect to fetch fresh achievement list and user info.
   * Caches response data locally; falls back to cached data in case of offline exceptions.
   */
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          // Sync fresh user details (including XP)
          await refreshUser();
          // Request achievement milestones
          const response = await achievementsAPI.get();
          setAchievements(response.data);
          // Cache successful response in local database
          await db.write(db.KEYS.ACHIEVEMENTS, response.data);
        } catch (error) {
          console.error("Failed to fetch data", error);
          // Read cached records if the backend request fails
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

  // Level calculations: 100 XP per level.
  const currentXP = user?.xp_points || 0;
  const currentLevel = Math.floor(currentXP / 100) + 1;
  const nextLevelXP = (Math.floor(currentXP / 100) + 1) * 100;
  const progressPercent = (currentXP % 100);

  // Determine user's active league by reviewing level milestones in reverse order
  const currentLeague = ROADMAP_DATA.slice().reverse().find(l => currentLevel >= l.level) || ROADMAP_DATA[0];

  /**
   * Renders individual achievement card item.
   * Handles visual locking opacity and fills mini-progress bar.
   * 
   * @param {object} item - Achievement item properties (id, completed, progress, total, icon, color, title, desc).
   */
  const renderAchievement = (item) => {
    const isCompleted = item.completed;
    const itemProgressPercent = item.total > 0 ? (item.progress / item.total) * 100 : 0;

    return (
      <View key={item.id} style={[styles.achievementCard, !isCompleted && styles.achievementLocked]}>
        {/* Completed status color container */}
        <View style={[styles.iconContainer, { backgroundColor: isCompleted ? `${item.color}20` : COLORS.surfaceVariant }]}>
          <Ionicons name={item.icon} size={26} color={isCompleted ? item.color : COLORS.onSurfaceVariant} />
        </View>
        
        {/* Achievement information and progress bar */}
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.achievementDesc} numberOfLines={2}>{item.desc}</Text>

          {/* Mini progress tracker */}
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
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.achievements', 'Досягнення')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Top Header Card detailing current League status and XP progression */}
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

          {/* Experience point progress bar details */}
          <View style={styles.xpContainer}>
            <View style={styles.xpTextRow}>
              <Text style={styles.xpText}>{t('achievements.experience')}</Text>
              <Text style={[styles.xpValues, { color: currentLeague.color }]}>
                {currentXP} <Text style={{ color: COLORS.text }}>/ {nextLevelXP}</Text>
              </Text>
            </View>
            {/* Visual Progress Bar Track */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: currentLeague.color }]} />
            </View>
            <Text style={styles.xpHint}>{t('achievements.xpLeft', { xp: nextLevelXP - currentXP })}</Text>
          </View>
        </TouchableOpacity>

        {/* Section listing all individual achievements */}
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
    </View>
  );
}

/**
 * Computes stylesheet layout based on active theme configuration.
 * 
 * @param {object} COLORS - Theme colors palette.
 * @param {boolean} isDark - Flag representing dark theme status.
 * @param {object} insets - Screen insets details.
 * @returns {object} StyleSheet object.
 */
const getStyles = (COLORS, isDark, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  backButton: {
      marginTop: 16,
      marginBottom: 12,
      alignSelf: 'flex-start',
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