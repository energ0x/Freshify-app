import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';

// Мокові дані (у майбутньому винесете їх у store)
const STREAK_DATA = {
  current: 7,
  week: [true, true, true, true, true, true, true],
  weekLabels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
};

const DAILY_TASKS_PREVIEW = [
  { id: 'd1', title: 'Перевір терміни', icon: 'calendar-outline', color: '#E74C3C', xp: 20, completed: true },
  { id: 'd2', title: 'Використай продукт', icon: 'restaurant-outline', color: '#2ECC71', xp: 30, completed: true },
  { id: 'd3', title: 'Додай новий продукт', icon: 'add-circle-outline', color: '#3498DB', xp: 25, completed: false },
  { id: 'd4', title: 'ШІ-рецепт дня', icon: 'bulb-outline', color: '#9B59B6', xp: 40, completed: false },
  { id: 'd5', title: 'Поділись досягненням', icon: 'share-social-outline', color: '#E67E22', xp: 15, completed: false },
];

export default function DailyTasksWidget({ navigation, isClosable = false, onClose }) {
  const { colors: COLORS, theme } = useThemeStore();
  const isDark = theme === 'dark';

  const completedCount = DAILY_TASKS_PREVIEW.filter((t) => t.completed).length;
  const totalCount = DAILY_TASKS_PREVIEW.length;
  const progressPercent = (completedCount / totalCount) * 100;
  const todayXP = DAILY_TASKS_PREVIEW.filter((t) => t.completed).reduce((s, t) => s + t.xp, 0);
  const maxXP = DAILY_TASKS_PREVIEW.reduce((s, t) => s + t.xp, 0);

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
            <Text style={styles.dailyStreakNumber}>{STREAK_DATA.current} днів</Text>
            <Text style={styles.dailyStreakSub}>поточний стрік</Text>
          </View>
        </View>

        <View style={styles.rightInfoContainer}>
          <View style={styles.dailyWeekRow}>
            {STREAK_DATA.week.map((done, i) => (
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