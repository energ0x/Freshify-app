import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import { dailyTasksAPI, dailyTasksListeners } from '../services/api';

// Local defaults (fallback while loading)
const STREAK_DATA = {
  current: 0,
  week: [null, null, null, null, null, null, null],
};

const DAILY_TASKS_PREVIEW = [];

export default function DailyTasksWidget({ navigation, isClosable = false, onClose }) {
  const { t } = useTranslation();
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
          }));
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
      activeOpacity={0.8}
      onPress={() => navigation.navigate('DailyTasks')}
    >
      <View style={styles.dailyWidgetTop}>
        <View style={styles.dailyStreakRow}>
          <View style={styles.dailyStreakFlame}>
            <Ionicons name="flame" size={24} color="#E74C3C" />
          </View>
          <View style={styles.streakTextWrap}>
            <Text style={styles.dailyStreakNumber}>
              {streak.current} {t('dailyTasks.days', { count: streak.current })}
            </Text>
            <Text style={styles.dailyStreakSub}>
              {t('dailyTasks.currentStreak')}
            </Text>
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

          {isClosable ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if(onClose) onClose();
              }}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={22} color={COLORS.outline} style={{ marginLeft: 6 }} />
          )}
        </View>
      </View>

      <View style={styles.dailyDivider} />

      <View style={styles.dailyTasksRow}>
        <Text style={styles.dailyTasksLabel}>{t('dailyTasks.tasksToday')}</Text>
        <Text style={styles.dailyTasksCount}>
          {completedCount} / {totalCount}  ·  +{todayXP} / {maxXP} XP
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
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dailyWidgetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dailyStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  dailyStreakFlame: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#E74C3C15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakTextWrap: {
    justifyContent: 'center',
  },
  dailyStreakNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2
  },
  dailyStreakSub: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600'
  },

  rightInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dailyWeekRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  dailyDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  dailyDotDone: {
    backgroundColor: '#2ECC71'
  },

  closeBtn: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    padding: 6,
    marginLeft: 4,
  },

  dailyDivider: {
    height: 1,
    backgroundColor: COLORS.outline,
    opacity: 0.2,
    marginBottom: 16
  },

  dailyTasksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  dailyTasksLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text
  },
  dailyTasksCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant
  },
  dailyProgressTrack: {
    height: 10,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 5,
    overflow: 'hidden'
  },
  dailyProgressFill: {
    height: '100%',
    borderRadius: 5
  },
});