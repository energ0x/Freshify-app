/**
 * @file DailyTasksScreen.js
 * @description Screen displaying daily tasks and user streaks.
 * Pulls daily mission status (completed/incomplete) and rewards (XP) from the API.
 * Keeps track of current consecutive streaks and renders progress indicators.
 * Implements a listener pattern to dynamically refresh tasks data.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import { dailyTasksAPI, dailyTasksListeners } from '../services/api';

// Initial state template for user streak data
const STREAK_DATA = {
  current: 0,
  best: 0,
  week: [null, null, null, null, null, null, null],
  weekLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
};

// Initial state placeholder for daily tasks
const DAILY_TASKS = [];

/**
 * DailyTasksScreen component.
 * Lists daily objectives, streak flame indicators, and XP trackers.
 * 
 * @param {object} props.navigation - React Navigation handle.
 */
export default function DailyTasksScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  // States holding current tasks list and streak statistics
  const [tasks, setTasks] = useState(DAILY_TASKS);
  const [streak, setStreak] = useState(STREAK_DATA);

  // Synchronize daily tasks and streak details on mount.
  useEffect(() => {
    let mounted = true;
    
    /**
     * Pulls task records and summary statistics from the server.
     * Updates states if the component is still mounted.
     */
    const fetchAll = async () => {
      try {
        // Fetch tasks list
        const res = await dailyTasksAPI.list();
        if (!mounted) return;
        if (res?.data) {
          setTasks(res.data.map(t => ({
            id: t.id,
            title: t.name,
            desc: t.description,
            icon: t.icon,
            color: '#2ECC71',
            xp: t.xp_reward,
            completed: t.completed,
          })));
        }

        // Fetch streak and weekly completions summary
        const summaryRes = await dailyTasksAPI.getSummary();
        if (!mounted) return;
        if (summaryRes?.data) {
          const s = summaryRes.data;
          const week = (s.week || []).map(item => !!item.done);
          setStreak(prev => ({
            ...prev,
            current: s.current || 0,
            best: s.best || 0,
            week: week.length === 7 ? week : prev.week,
            weekLabels: s.weekLabels || prev.weekLabels
          }));
        }
      } catch (e) {
        console.log('Error fetching daily tasks', e);
      }
    };

    fetchAll();

    // Register listener for real-time task update callbacks (e.g. from scanning products)
    const listener = () => fetchAll();
    dailyTasksListeners.add(listener);

    // Clean up mounts and unsubscribe from events
    return () => { mounted = false; dailyTasksListeners.delete(listener); };
  }, []);

  // Aggregate completion status calculations
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length || 1;
  const todayXP = tasks.filter((t) => t.completed).reduce((s, t) => s + t.xp, 0);
  const maxXP = tasks.reduce((s, t) => s + t.xp, 0);
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* Header section with back navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dailyTasks.title', 'Щоденні місії')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak card (Flame progress) */}
        <View style={styles.card}>
          <View style={styles.streakHeader}>
            <View style={styles.streakFlame}>
              <Ionicons name="flame" size={32} color="#E74C3C" />
            </View>
            <View style={styles.streakInfo}>
              <Text style={styles.streakNumber}>{streak.current}</Text>
              <Text style={styles.streakLabel}>{t('dailyTasks.daysInRow', 'днів поспіль')}</Text>
            </View>
            {/* Record / Best streak badge */}
            <View style={styles.bestStreakBadge}>
              <Ionicons name="trophy" size={16} color="#F1C40F" />
              <Text style={styles.bestStreakText}>{t('dailyTasks.record', 'Рекорд:')} {streak.best}</Text>
            </View>
          </View>

          {/* Weekdays dots indicator row */}
          <View style={styles.weekRow}>
            {streak.week.map((done, i) => (
              <View key={i} style={styles.dayCol}>
                <View
                  style={[
                    styles.dayDot,
                    done === true && styles.dayDotDone,
                    done === false && styles.dayDotMissed,
                    done === null && { backgroundColor: COLORS.surfaceVariant },
                  ]}
                >
                  {done === true && <Ionicons name="checkmark" size={18} color="#fff" />}
                  {done === false && <Ionicons name="close" size={16} color={COLORS.onSurfaceVariant} />}
                </View>
                <Text style={styles.dayLabel}>{streak.weekLabels[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Daily progress overview */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>{t('dailyTasks.progressToday', 'Прогрес сьогодні')}</Text>
            <Text style={styles.progressCount}>
              {completedCount} / {totalCount}
            </Text>
          </View>

          {/* Progress bar track */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%`, backgroundColor: '#2ECC71' },
              ]}
            />
          </View>

          {/* Localized feedback hints */}
          <Text style={styles.progressHint}>
            {completedCount === totalCount
              ? t('dailyTasks.allCompleted', '🎉 Всі завдання виконано! +{{xp}} XP зараховано', { xp: maxXP })
              : t('dailyTasks.tasksLeft', 'Залишилось {{count}} завдань — зберіть ще +{{xp}} XP', { count: totalCount - completedCount, xp: maxXP - todayXP })}
          </Text>
        </View>

        {/* Daily mission cards listing */}
        <Text style={styles.sectionLabel}>{t('dailyTasks.tasksForToday', 'Завдання на сьогодні')}</Text>

        {tasks.map((task) => (
          <View
            key={task.id}
            style={[
              styles.taskCard,
              task.completed && styles.taskCardDone,
            ]}
          >
            {/* Mission Completion Icon */}
            <View
              style={[
                styles.taskIcon,
                { backgroundColor: task.completed ? `${task.color}20` : COLORS.surfaceVariant },
              ]}
            >
              <Ionicons
                name={task.completed ? 'checkmark-circle' : task.icon}
                size={26}
                color={task.completed ? task.color : COLORS.onSurfaceVariant}
              />
            </View>

            {/* Mission Text details */}
            <View style={styles.taskInfo}>
              <Text
                style={[
                  styles.taskTitle,
                  task.completed && { textDecorationLine: 'line-through', color: COLORS.onSurfaceVariant },
                ]}
              >
                {task.title}
              </Text>
              <Text style={styles.taskDesc} numberOfLines={2}>
                {task.desc}
              </Text>
            </View>

            {/* XP Reward Badge */}
            <View style={[styles.xpBadge, { backgroundColor: task.completed ? `${task.color}15` : COLORS.surfaceVariant }]}>
              <Text style={[styles.xpBadgeText, { color: task.completed ? task.color : COLORS.onSurfaceVariant }]}>
                +{task.xp} XP
              </Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

/**
 * Calculates component layout styles dynamically depending on dark mode theme colors.
 * 
 * @param {object} COLORS - App colors palette.
 * @param {boolean} isDark - Dark theme status.
 * @param {object} insets - Safe margins container.
 * @returns {object} StyleSheet layout.
 */
const getStyles = (COLORS, isDark, insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background
    },

    // ─── Header ────────────────────────────────────────────────────────────────
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

    // ─── Content ───────────────────────────────────────────────────────────────
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: (insets.bottom || 20) + 40
    },

    // ─── Cards ─────────────────────────────────────────────────────────────────
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },

    // ─── Streak Card ───────────────────────────────────────────────────────────
    streakHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      gap: 16,
    },
    streakFlame: {
      width: 64,
      height: 64,
      borderRadius: 24,
      backgroundColor: '#E74C3C15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    streakInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    streakNumber: {
      fontSize: 36,
      fontWeight: '800',
      color: COLORS.text,
    },
    streakLabel: {
      fontSize: 14,
      color: COLORS.onSurfaceVariant,
      fontWeight: '600',
      marginTop: 2,
    },
    bestStreakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#F1C40F15',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
    },
    bestStreakText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#F39C12'
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayCol: {
      alignItems: 'center',
      gap: 8
    },
    dayDot: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dayDotDone: { backgroundColor: '#2ECC71' },
    dayDotMissed: { backgroundColor: COLORS.surfaceVariant },
    dayLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.onSurfaceVariant
    },

    // ─── Progress Card ─────────────────────────────────────────────────────────
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text
    },
    progressCount: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text
    },
    progressTrack: {
      height: 12,
      backgroundColor: COLORS.surfaceVariant,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 16,
    },
    progressFill: {
      height: '100%',
      borderRadius: 6
    },
    progressHint: {
      fontSize: 14,
      color: COLORS.onSurfaceVariant,
      textAlign: 'center',
      fontWeight: '500'
    },

    // ─── Section Labels ────────────────────────────────────────────────────────
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 16,
      marginLeft: 4,
    },

    // ─── Task Cards ────────────────────────────────────────────────────────────
    taskCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 6,
      elevation: 2,
      gap: 14,
    },
    taskCardDone: {
      opacity: 0.7
    },
    taskIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    taskInfo: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.text,
      marginBottom: 4
    },
    taskDesc: {
      fontSize: 13,
      color: COLORS.onSurfaceVariant,
      lineHeight: 18
    },
    xpBadge: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      alignSelf: 'center',
    },
    xpBadgeText: {
      fontSize: 13,
      fontWeight: '800'
    },
  });