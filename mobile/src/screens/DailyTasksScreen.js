import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import { useTranslation } from 'react-i18next';

const STREAK_DATA = {
  current: 7,
  best: 14,
  week: [true, true, true, true, true, true, true],
};

const DAILY_TASK_KEYS = [
  { id: 'd1', titleKey: 'dailyTasks.task1Title', descKey: 'dailyTasks.task1Desc', icon: 'calendar-outline', color: '#E74C3C', xp: 20, completed: true },
  { id: 'd2', titleKey: 'dailyTasks.task2Title', descKey: 'dailyTasks.task2Desc', icon: 'restaurant-outline', color: '#2ECC71', xp: 30, completed: true },
  { id: 'd3', titleKey: 'dailyTasks.task3Title', descKey: 'dailyTasks.task3Desc', icon: 'add-circle-outline', color: '#3498DB', xp: 25, completed: false },
  { id: 'd4', titleKey: 'dailyTasks.task4Title', descKey: 'dailyTasks.task4Desc', icon: 'bulb-outline', color: '#9B59B6', xp: 40, completed: false },
  { id: 'd5', titleKey: 'dailyTasks.task5Title', descKey: 'dailyTasks.task5Desc', icon: 'share-social-outline', color: '#E67E22', xp: 15, completed: false },
];

const WEEKLY_CHALLENGE_KEYS = [
  { id: 'w1', titleKey: 'dailyTasks.challenge1Title', descKey: 'dailyTasks.challenge1Desc', icon: 'leaf', color: '#2ECC71', xp: 150, progress: 5, total: 7 },
  { id: 'w2', titleKey: 'dailyTasks.challenge2Title', descKey: 'dailyTasks.challenge2Desc', icon: 'barcode', color: '#3498DB', xp: 100, progress: 9, total: 15 },
  { id: 'w3', titleKey: 'dailyTasks.challenge3Title', descKey: 'dailyTasks.challenge3Desc', icon: 'restaurant', color: '#E67E22', xp: 120, progress: 2, total: 5 },
];

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function DailyTasksScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  const completedCount = DAILY_TASK_KEYS.filter((task) => task.completed).length;
  const totalCount = DAILY_TASK_KEYS.length;
  const todayXP = DAILY_TASK_KEYS.filter((task) => task.completed).reduce((s, task) => s + task.xp, 0);
  const maxXP = DAILY_TASK_KEYS.reduce((s, task) => s + task.xp, 0);
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Streak card ── */}
        <View style={styles.card}>
          <View style={styles.streakHeader}>
            <View style={styles.streakFlame}>
              <Ionicons name="flame" size={36} color="#E74C3C" />
            </View>
            <View style={styles.streakInfo}>
              <Text style={styles.streakNumber}>{STREAK_DATA.current}</Text>
              <Text style={styles.streakLabel}>{t('dailyTasks.streakLabel')}</Text>
            </View>
            <View style={styles.bestStreakBadge}>
              <Ionicons name="trophy" size={14} color="#F1C40F" />
              <Text style={styles.bestStreakText}>{t('dailyTasks.bestStreak', { days: STREAK_DATA.best })}</Text>
            </View>
          </View>

          <View style={styles.weekRow}>
            {STREAK_DATA.week.map((done, i) => (
              <View key={i} style={styles.dayCol}>
                <View
                  style={[
                    styles.dayDot,
                    done === true && styles.dayDotDone,
                    done === false && styles.dayDotMissed,
                    done === null && { backgroundColor: COLORS.surfaceVariant },
                  ]}
                >
                  {done === true && <Ionicons name="checkmark" size={14} color="#fff" />}
                  {done === false && <Ionicons name="close" size={12} color={COLORS.textLight} />}
                </View>
                <Text style={styles.dayLabel}>{t(`dailyTasks.${WEEKDAY_KEYS[i]}`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Daily progress ── */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>{t('dailyTasks.todayProgress')}</Text>
            <Text style={styles.progressCount}>{completedCount}/{totalCount}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: '#2ECC71' }]} />
          </View>
          <Text style={styles.progressHint}>
            {completedCount === totalCount
              ? t('dailyTasks.allDone', { xp: maxXP })
              : t('dailyTasks.remaining', { count: totalCount - completedCount, xp: maxXP - todayXP })}
          </Text>
        </View>

        {/* ── Daily tasks ── */}
        <Text style={styles.sectionLabel}>{t('dailyTasks.todayLabel')}</Text>

        {DAILY_TASK_KEYS.map((task) => (
          <View key={task.id} style={[styles.taskCard, task.completed && styles.taskCardDone]}>
            <View style={[styles.taskIcon, { backgroundColor: task.completed ? `${task.color}20` : COLORS.surfaceVariant }]}>
              <Ionicons
                name={task.completed ? 'checkmark-circle' : task.icon}
                size={26}
                color={task.completed ? task.color : COLORS.textLight}
              />
            </View>

            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, task.completed && { textDecorationLine: 'line-through', color: COLORS.textLight }]}>
                {t(task.titleKey)}
              </Text>
              <Text style={styles.taskDesc} numberOfLines={2}>{t(task.descKey)}</Text>
            </View>

            <View style={[styles.xpBadge, { backgroundColor: task.completed ? `${task.color}15` : COLORS.surfaceVariant }]}>
              <Text style={[styles.xpBadgeText, { color: task.completed ? task.color : COLORS.textLight }]}>
                +{task.xp} XP
              </Text>
            </View>
          </View>
        ))}

        {/* ── Weekly challenges ── */}
        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>{t('dailyTasks.weeklyLabel')}</Text>

        {WEEKLY_CHALLENGE_KEYS.map((ch) => {
          const pct = (ch.progress / ch.total) * 100;
          return (
            <View key={ch.id} style={styles.challengeCard}>
              <View style={styles.challengeTop}>
                <View style={[styles.challengeIcon, { backgroundColor: `${ch.color}20` }]}>
                  <Ionicons name={ch.icon} size={24} color={ch.color} />
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeTitle}>{t(ch.titleKey)}</Text>
                  <Text style={styles.challengeDesc}>{t(ch.descKey)}</Text>
                </View>
                <View style={[styles.xpBadge, { backgroundColor: `${ch.color}15` }]}>
                  <Text style={[styles.xpBadgeText, { color: ch.color }]}>+{ch.xp} XP</Text>
                </View>
              </View>

              <View style={styles.challengeProgressRow}>
                <View style={styles.challengeTrack}>
                  <View style={[styles.challengeFill, { width: `${pct}%`, backgroundColor: ch.color }]} />
                </View>
                <Text style={styles.challengeCount}>{ch.progress}/{ch.total}</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (COLORS, isDark, insets) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    header: {
      backgroundColor: COLORS.surface,
      paddingTop: insets.top + 10,
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    statsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0,0,0,0.04)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 100,
    },
    statPillText: { fontSize: 14, fontWeight: '600' },

    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

    card: {
      backgroundColor: COLORS.surface,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 8,
      elevation: 2,
    },

    streakHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    streakFlame: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#E74C3C18',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    streakInfo: { flex: 1 },
    streakNumber: { fontSize: 32, fontWeight: '800', color: COLORS.text, lineHeight: 36 },
    streakLabel: { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },
    bestStreakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F1C40F18',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 100,
    },
    bestStreakText: { fontSize: 12, fontWeight: '700', color: '#F1C40F' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayCol: { alignItems: 'center', gap: 6 },
    dayDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: COLORS.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dayDotDone: { backgroundColor: '#2ECC71' },
    dayDotMissed: { backgroundColor: COLORS.surfaceVariant },
    dayLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },

    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    progressCount: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    progressTrack: {
      height: 12,
      backgroundColor: COLORS.surfaceVariant,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 10,
    },
    progressFill: { height: '100%', borderRadius: 6 },
    progressHint: { fontSize: 13, color: COLORS.textLight, textAlign: 'center' },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.textLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
      marginLeft: 4,
    },

    taskCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    taskCardDone: { opacity: 0.65 },
    taskIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    taskInfo: { flex: 1, marginRight: 8 },
    taskTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
    taskDesc: { fontSize: 12, color: COLORS.textLight, lineHeight: 16 },

    xpBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, alignSelf: 'center' },
    xpBadgeText: { fontSize: 12, fontWeight: '800' },

    challengeCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    challengeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    challengeIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    challengeInfo: { flex: 1, marginRight: 8 },
    challengeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
    challengeDesc: { fontSize: 12, color: COLORS.textLight, lineHeight: 16 },
    challengeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    challengeTrack: {
      flex: 1,
      height: 8,
      backgroundColor: COLORS.surfaceVariant,
      borderRadius: 4,
      overflow: 'hidden',
    },
    challengeFill: { height: '100%', borderRadius: 4 },
    challengeCount: { fontSize: 12, fontWeight: '700', color: COLORS.textLight, minWidth: 30 },
  });
