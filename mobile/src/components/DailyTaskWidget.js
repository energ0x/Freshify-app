// ─── Gamification mock data (замініть на store пізніше) ──────────────────────
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

// ─── Daily Tasks Widget ──────────────────────────────────────────────────────
export default function DailyTasksWidget({ navigation, colors: COLORS, isDark, styles }) {
  const completedCount = DAILY_TASKS_PREVIEW.filter((t) => t.completed).length;
  const totalCount = DAILY_TASKS_PREVIEW.length;
  const progressPercent = (completedCount / totalCount) * 100;
  const todayXP = DAILY_TASKS_PREVIEW.filter((t) => t.completed).reduce((s, t) => s + t.xp, 0);
  const maxXP = DAILY_TASKS_PREVIEW.reduce((s, t) => s + t.xp, 0);

  return (
    <TouchableOpacity
      style={styles.dailyWidget}
      activeOpacity={0.88}
      onPress={() => navigation.navigate('DailyTasks')}
    >
      {/* Top row: streak + XP */}
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

        {/* Week mini-dots */}
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

        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      </View>

      {/* Divider */}
      <View style={styles.dailyDivider} />

      {/* Tasks summary + progress */}
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

      {/* Mini task pills */}
      {/* <View style={styles.dailyTaskPills}>
        {DAILY_TASKS_PREVIEW.map((task) => (
          <View
            key={task.id}
            style={[
              styles.dailyTaskPill,
              task.completed
                ? { backgroundColor: `${task.color}18` }
                : { backgroundColor: COLORS.surfaceVariant },
            ]}
          >
            <Ionicons
              name={task.completed ? 'checkmark-circle' : task.icon}
              size={14}
              color={task.completed ? task.color : COLORS.textLight}
            />
            <Text
              style={[
                styles.dailyTaskPillText,
                { color: task.completed ? task.color : COLORS.textLight },
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
          </View>
        ))}
      </View> */}
    </TouchableOpacity>
  );
}