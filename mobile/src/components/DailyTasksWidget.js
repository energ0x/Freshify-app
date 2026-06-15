import React, { useState, useEffect } from 'react';
import { dailyTasksAPI, dailyTasksListeners } from '../services/api';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';

// Local defaults (fallback while loading)
const STREAK_DATA = {
  current: 0,
  week: [null, null, null, null, null, null, null],
  weekLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
};

const DAILY_TASKS_PREVIEW = [];

export default function DailyTasksWidget({ navigation, isClosable = false, onClose }) {
  const { colors: COLORS, theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [tasks, setTasks] = useState(DAILY_TASKS_PREVIEW);
  const [streak, setStreak] = useState(STREAK_DATA);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const res = await dailyTasksAPI.list();
        if (!mounted) return;
        if (res?.data) {
          const data = res.data.map(t => ({
            id: t.id,
            title: t.name,
            icon: t.icon,
            color: '#2ECC71',
            xp: t.xp_reward,
            completed: t.completed,
          }));
          setTasks(data);
        }
        // Fetch summary after tasks to ensure today's entries were created server-side
        const summaryRes = await dailyTasksAPI.getSummary();
        if (!mounted) return;
        if (summaryRes?.data) {
          const s = summaryRes.data;
          // summary.week now contains [{date: 'YYYY-MM-DD', done: bool}, ...] ordered Mon..Sun
          const week = (s.week || []).map(item => !!item.done);
          setStreak(prev => ({ ...prev, current: s.current || 0, best: s.best || 0, week: week.length === 7 ? week : prev.week, weekLabels: s.weekLabels || prev.weekLabels }));
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
  const progressPercent = (completedCount / totalCount) * 100;
  const todayXP = tasks.filter((t) => t.completed).reduce((s, t) => s + t.xp, 0);
  const maxXP = tasks.reduce((s, t) => s + t.xp, 0);

  const styles = getStyles(COLORS, isDark);

  return (
    <TouchableOpacity
      style={styles.dailyWidget}
      activeOpacity={0.88}
      onPress={() => navigation.navigate('DailyTasks')}
    >
      <View style={styles.dailyWidgetTop}>
        <View style={styles.dailyStreakRow}>
          <View style={styles.dailyStreakFlame}>
            <Ionicons name="flame" size={20} color="#E74C3C" />
          </View>
          <View>
            <Text style={styles.dailyStreakNumber}>{streak.current} днів</Text>
            <Text style={styles.dailyStreakSub}>поточний стрік</Text>
          </View>
        </View>

        <View style={styles.rightInfoContainer}>
          <View style={styles.dailyWeekRow}>
            {streak.week.map((done, i) => (
              <View
                key={i}
                style={[
                  styles.dailyDot,
                  done ? styles.dailyDotDone : { backgroundColor: COLORS.surfaceVariant },
                ]}
              />
            ))}
          </View>
          
          {/* Якщо компонент можна закрити, показуємо хрестик. Інакше — стрілочку */}
          {isClosable ? (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation(); // Зупиняємо перехід по кліку
                if(onClose) onClose();
              }} 
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} style={{ marginLeft: 6 }} />
          )}
        </View>
      </View>

      <View style={styles.dailyDivider} />

      <View style={styles.dailyTasksRow}>
        <Text style={styles.dailyTasksLabel}>Завдання сьогодні</Text>
        <Text style={styles.dailyTasksCount}>
          {completedCount}/{totalCount} · +{todayXP}/{maxXP} XP
        </Text>
      </View>

      <View style={styles.dailyProgressTrack}>
        <View
          style={[
            styles.dailyProgressFill,
            { width: `${progressPercent}%`, backgroundColor: '#2ECC71' },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (COLORS, isDark) => StyleSheet.create({
  dailyWidget: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dailyWidgetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dailyStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dailyStreakFlame: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E74C3C18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyStreakNumber: { fontSize: 16, fontWeight: '800', color: COLORS.text, lineHeight: 18 },
  dailyStreakSub: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  
  rightInfoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyWeekRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dailyDot: { width: 10, height: 10, borderRadius: 5 },
  dailyDotDone: { backgroundColor: '#2ECC71' },
  
  closeBtn: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    padding: 4,
    marginLeft: 6,
  },

  dailyDivider: { height: 1, backgroundColor: COLORS.surfaceVariant, marginBottom: 14 },
  dailyTasksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dailyTasksLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  dailyTasksCount: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  dailyProgressTrack: { height: 8, backgroundColor: COLORS.surfaceVariant, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  dailyProgressFill: { height: '100%', borderRadius: 4 },
});