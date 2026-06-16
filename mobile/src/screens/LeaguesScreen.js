import React, { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';

// Роадмеп (Карта розвитку)
const ROADMAP_DATA = [
  { id: '1', level: 1, titleKey: 'leagues.greenSprouts', defaultTitle: 'Зелені Паростки', descKey: 'leagues.desc1', defaultDesc: 'Ваш шлях починається!\n1 ШІ-рецепт, 3 фото, 5 штрихкодів, 10 ручних додавань на місяць.', icon: 'leaf', color: '#2ECC71', isLeague: true },
  { id: '2', level: 10, titleKey: 'leagues.advancedBeginner', defaultTitle: 'Просунутий новачок', descKey: 'leagues.desc2', defaultDesc: 'Ви втягуєтесь:\n2 ШІ-рецепти, 5 фото, 10 штрихкодів, 20 ручних додавань.', icon: 'star', color: '#27AE60', isLeague: false },
  { id: '3', level: 50, titleKey: 'leagues.experienced', defaultTitle: 'Досвідчений', descKey: 'leagues.desc3', defaultDesc: 'Ваш еко-слід стає меншим:\n5 ШІ-рецептів, 15 фото, 30 штрихкодів, 50 ручних додавань.', icon: 'trending-up', color: '#229954', isLeague: false },
  { id: '4', level: 101, titleKey: 'leagues.freshnessMasters', defaultTitle: 'Майстри Свіжості', descKey: 'leagues.desc4', defaultDesc: 'Ви у новій лізі!\n10 ШІ-рецептів, 30 фото, 50 штрихкодів, 100 ручних додавань.', icon: 'ribbon', color: '#3498DB', isLeague: true },
  { id: '5', level: 150, titleKey: 'leagues.chef', defaultTitle: 'Шеф-кухар', descKey: 'leagues.desc5', defaultDesc: 'Готуємо розумно:\n15 ШІ-рецептів, 40 фото, 80 штрихкодів, 150 ручних додавань.', icon: 'restaurant', color: '#2980B9', isLeague: false },
  { id: '6', level: 201, titleKey: 'leagues.ecoHeroes', defaultTitle: 'Еко-Герої', descKey: 'leagues.desc6', defaultDesc: 'Елітна ліга Планети!\n20 ШІ-рецептів, 50 фото, 100 штрихкодів, безліміт ручних додавань.', icon: 'planet', color: '#F1C40F', isLeague: true },
  { id: '7', level: 300, titleKey: 'leagues.absoluteGuru', defaultTitle: 'Абсолютний Гуру', descKey: 'leagues.desc7', defaultDesc: 'Максимальний рівень!\nВи досягли досконалості у стилі Zero Waste.', icon: 'trophy', color: '#F39C12', isLeague: false },
];

export default function LeaguesScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();
  const { user, refreshUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );

  const currentXP = user?.xp_points || 0;
  const currentLevel = Math.floor(currentXP / 100) + 1;

  // Знаходимо індекс поточного рівня користувача
  const currentLevelIndex = ROADMAP_DATA.reduce((acc, curr, index) => {
    if (currentLevel >= curr.level) return index;
    return acc;
  }, 0);

  const jumpToMyLevel = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: currentLevelIndex,
        animated: true,
        viewPosition: 0.5 // Центрує елемент на екрані
      });
    }
  };

  const renderItem = ({ item, index }) => {
    const isUnlocked = currentLevel >= item.level;
    const isLast = index === ROADMAP_DATA.length - 1;

    return (
      <View style={styles.timelineRow}>
        {/* Вертикальна лінія таймлайну */}
        {!isLast && (
          <View style={[styles.timelineLine, { backgroundColor: isUnlocked ? item.color : COLORS.outline, opacity: isUnlocked ? 1 : 0.3 }]} />
        )}

        {/* Іконка-вузол на таймлайні */}
        <View style={[
          styles.timelineNode,
          {
            backgroundColor: isUnlocked ? item.color : COLORS.surfaceVariant,
            borderColor: COLORS.background,
            width: item.isLeague ? 64 : 48,
            height: item.isLeague ? 64 : 48,
            borderRadius: item.isLeague ? 32 : 24,
            marginLeft: item.isLeague ? 0 : 8 // Вирівнювання маленьких іконок по центру лінії
          }
        ]}>
          <Ionicons
            name={isUnlocked ? item.icon : "lock-closed"}
            size={item.isLeague ? 30 : 20}
            color={isUnlocked ? '#fff' : COLORS.onSurfaceVariant}
          />
        </View>

        {/* Картка з описом */}
        <View style={[styles.card, { opacity: isUnlocked ? 1 : 0.6 }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: isUnlocked ? item.color : COLORS.text }]}>
              {t(item.titleKey, item.defaultTitle)}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: isUnlocked ? `${item.color}15` : COLORS.surfaceVariant }]}>
              <Text style={[styles.levelBadgeText, { color: isUnlocked ? item.color : COLORS.onSurfaceVariant }]}>
                {t('leagues.level', 'Рівень')} {item.level}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            {t(item.descKey, item.defaultDesc)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* ── Консистентний Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('leagues.title', 'Карта Рівнів')}</Text>

        <View style={styles.myStatsRow}>
          <View style={styles.statPill}>
            <Ionicons name="star" size={18} color="#F1C40F" />
            <Text style={styles.statPillText}>{currentXP} XP</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: COLORS.primaryContainer }]}>
            <Ionicons name="trending-up" size={18} color={COLORS.primary} />
            <Text style={[styles.statPillText, { color: COLORS.primary }]}>
              {t('leagues.yourLevel', 'Ваш рівень:')} {currentLevel}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={ROADMAP_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          // Запобігає помилці, якщо елемент ще не відрендерився
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />

      {/* Плаваюча кнопка (FAB) для переходу до поточного рівня */}
      <TouchableOpacity
        style={styles.fab}
        onPress={jumpToMyLevel}
        activeOpacity={0.8}
      >
        <Ionicons name="location" size={22} color={COLORS.onPrimary} />
        <Text style={styles.fabText}>{t('leagues.toMyLevel', 'До мого рівня')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (COLORS, isDark, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingTop: insets.top || 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  backButton: {
                    marginTop: 16,

    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  headerTitle: {
      flexDirection: 'row',       // Розташовує елементи в один рядок
alignItems: 'center',       // Центрує їх по вертикалі
    gap: 12,
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  myStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16
  },
  statPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text
  },

  // ─── Timeline List ─────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 120 // Більше місця знизу, щоб остання картка не перекривалась FAB
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 28,
    position: 'relative'
  },
  timelineLine: {
    position: 'absolute',
    left: 31,
    top: 50,
    bottom: -40,
    width: 2,
    zIndex: 0
  },
  timelineNode: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 4
  },

  // ─── Cards ─────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    marginLeft: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    marginRight: 12
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '800'
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500'
  },

  // ─── FAB Button ────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 24,
    bottom: (insets.bottom || 20) + 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 8
  },
  fabText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10
  },
});