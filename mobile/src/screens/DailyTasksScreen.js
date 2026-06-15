import React, { useState, useEffect } from 'react';
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
import useThemeStore from '../store/themeStore';
import { dailyTasksAPI, dailyTasksListeners } from '../services/api';

// ─── Mock data ──────────────────────────────────────────────────────────────
const STREAK_DATA = {
  current: 0,
  best: 0,
  week: [null, null, null, null, null, null, null],
  weekLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
};

const DAILY_TASKS = [];

export default function DailyTasksScreen({ navigation }) {
  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  const [tasks, setTasks] = useState(DAILY_TASKS);
  const [streak, setStreak] = useState(STREAK_DATA);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const [res, summaryRes] = await Promise.all([dailyTasksAPI.list(), dailyTasksAPI.getSummary()]);
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
        if (summaryRes?.data) {
          const s = summaryRes.data;
          setStreak(prev => ({ ...prev, current: s.current || 0, best: s.best || 0, week: s.week || prev.week, weekLabels: s.weekLabels || prev.weekLabels }));
        }
      } catch (e) {
        // ignore
      }
    };

    fetchAll();

    const listener = () => fetchAll();
    dailyTasksListeners.add(listener);

    return () => { mounted = false; dailyTasksListeners.delete(listener); };
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length || 1;
  const todayXP = tasks.filter((t) => t.completed).reduce((s, t) => s + t.xp, 0);
  const maxXP = tasks.reduce((s, t) => s + t.xp, 0);
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      {/* <View style={styles.header}> */}
        {/* <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: COLORS.text }]}>Щоденні завдання</Text>
          <View style={{ width: 24 }} />
        </View> */}

        {/* Streak pills */}
        {/* <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="flame" size={16} color="#E74C3C" />
            <Text style={[styles.statPillText, { color: COLORS.text }]}>
              Стрік: {STREAK_DATA.current} днів
            </Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="star" size={16} color="#F1C40F" />
            <Text style={[styles.statPillText, { color: COLORS.text }]}>
              +{todayXP} / {maxXP} XP
            </Text>
          </View>
        </View> */}
      {/* </View> */}

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
              <Text style={styles.streakNumber}>{streak.current}</Text>
              <Text style={styles.streakLabel}>днів поспіль</Text>
            </View>
            <View style={styles.bestStreakBadge}>
              <Ionicons name="trophy" size={14} color="#F1C40F" />
              <Text style={styles.bestStreakText}>Рекорд: {streak.best} дн.</Text>
            </View>
          </View>

          {/* Week dots */}
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
                  {done === true && <Ionicons name="checkmark" size={14} color="#fff" />}
                  {done === false && <Ionicons name="close" size={12} color={COLORS.textLight} />}
                </View>
                <Text style={styles.dayLabel}>{streak.weekLabels[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Daily progress ── */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Прогрес сьогодні</Text>
            <Text style={styles.progressCount}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%`, backgroundColor: '#2ECC71' },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            {completedCount === totalCount
              ? '🎉 Всі завдання виконано! +' + maxXP + ' XP зараховано'
              : `Залишилось ${totalCount - completedCount} завдань — зберіть ще +${maxXP - todayXP} XP`}
          </Text>
        </View>

        {/* ── Daily tasks ── */}
        <Text style={styles.sectionLabel}>Завдання на сьогодні</Text>

        {tasks.map((task) => (
          <View
            key={task.id}
            style={[
              styles.taskCard,
              task.completed && styles.taskCardDone,
            ]}
          >
            <View
              style={[
                styles.taskIcon,
                { backgroundColor: task.completed ? `${task.color}20` : COLORS.surfaceVariant },
              ]}
            >
              <Ionicons
                name={task.completed ? 'checkmark-circle' : task.icon}
                size={26}
                color={task.completed ? task.color : COLORS.textLight}
              />
            </View>

            <View style={styles.taskInfo}>
              <Text
                style={[
                  styles.taskTitle,
                  task.completed && { textDecorationLine: 'line-through', color: COLORS.textLight },
                ]}
              >
                {task.title}
              </Text>
              <Text style={styles.taskDesc} numberOfLines={2}>
                {task.desc}
              </Text>
            </View>

            <View style={[styles.xpBadge, { backgroundColor: task.completed ? `${task.color}15` : COLORS.surfaceVariant }]}>
              <Text style={[styles.xpBadgeText, { color: task.completed ? task.color : COLORS.textLight }]}>
                +{task.xp} XP
              </Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (COLORS, isDark, insets) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // ── Header ──
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

    // ── Scroll / content ──
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

    // ── Generic card ──
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

    // ── Streak ──
    streakHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
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
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
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

    // ── Progress ──
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

    // ── Section label ──
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.textLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
      marginLeft: 4,
    },

    // ── Task cards ──
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

    xpBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 100,
      alignSelf: 'center',
    },
    xpBadgeText: { fontSize: 12, fontWeight: '800' },

    // ── Weekly challenge cards ──
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
    challengeProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
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