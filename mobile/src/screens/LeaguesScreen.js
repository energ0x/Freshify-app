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

const ROADMAP_DATA = [
  { id: '1', level: 1, titleKey: 'leagues.greenSprouts', descKey: 'leagues.desc1', icon: 'leaf', color: '#2ECC71', isLeague: true },
  { id: '2', level: 10, titleKey: 'leagues.advancedBeginner', descKey: 'leagues.desc2', icon: 'star', color: '#27AE60', isLeague: false },
  { id: '3', level: 50, titleKey: 'leagues.experienced', descKey: 'leagues.desc3', icon: 'trending-up', color: '#229954', isLeague: false },
  { id: '4', level: 101, titleKey: 'leagues.freshnessMasters', descKey: 'leagues.desc4', icon: 'ribbon', color: '#3498DB', isLeague: true },
  { id: '5', level: 150, titleKey: 'leagues.chef', descKey: 'leagues.desc5', icon: 'restaurant', color: '#2980B9', isLeague: false },
  { id: '6', level: 201, titleKey: 'leagues.ecoHeroes', descKey: 'leagues.desc6', icon: 'planet', color: '#F1C40F', isLeague: true },
  { id: '7', level: 300, titleKey: 'leagues.absoluteGuru', descKey: 'leagues.desc7', icon: 'trophy', color: '#F39C12', isLeague: false },
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

  const currentLevelIndex = ROADMAP_DATA.reduce((acc, curr, index) => {
    if (currentLevel >= curr.level) return index;
    return acc;
  }, 0);

  const jumpToMyLevel = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: currentLevelIndex,
        animated: true,
        viewPosition: 0.5
      });
    }
  };

  const renderItem = ({ item, index }) => {
    const isUnlocked = currentLevel >= item.level;
    const isLast = index === ROADMAP_DATA.length - 1;

    return (
      <View style={styles.timelineRow}>
        {!isLast && (
          <View style={[styles.timelineLine, { backgroundColor: isUnlocked ? item.color : COLORS.outline, opacity: isUnlocked ? 1 : 0.3 }]} />
        )}

        <View style={[
          styles.timelineNode,
          {
            backgroundColor: isUnlocked ? item.color : COLORS.surfaceVariant,
            borderColor: COLORS.background,
            width: item.isLeague ? 64 : 48,
            height: item.isLeague ? 64 : 48,
            borderRadius: item.isLeague ? 32 : 24,
            marginLeft: item.isLeague ? 0 : 8
          }
        ]}>
          <Ionicons
            name={isUnlocked ? item.icon : "lock-closed"}
            size={item.isLeague ? 30 : 20}
            color={isUnlocked ? '#fff' : COLORS.onSurfaceVariant}
          />
        </View>

        <View style={[styles.card, { opacity: isUnlocked ? 1 : 0.6 }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: isUnlocked ? item.color : COLORS.text }]}>
              {t(item.titleKey)}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: isUnlocked ? `${item.color}15` : COLORS.surfaceVariant }]}>
              <Text style={[styles.levelBadgeText, { color: isUnlocked ? item.color : COLORS.onSurfaceVariant }]}>
                {t('leagues.level')} {item.level}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>
            {t(item.descKey)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('leagues.title')}</Text>
      </View>

      <View style={styles.subHeader}>
        <View style={styles.myStatsRow}>
          <View style={styles.statPill}>
            <Ionicons name="star" size={18} color="#F1C40F" />
            <Text style={styles.statPillText}>{currentXP} XP</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: COLORS.primaryContainer }]}>
            <Ionicons name="trending-up" size={18} color={COLORS.primary} />
            <Text style={[styles.statPillText, { color: COLORS.primary }]}>
              {t('leagues.yourLevel')} {currentLevel}
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
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={jumpToMyLevel}
        activeOpacity={0.8}
      >
        <Ionicons name="location" size={22} color={COLORS.onPrimary} />
        <Text style={styles.fabText}>{t('leagues.toMyLevel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

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
  subHeader: {
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
    zIndex: 5,
    marginTop: -24,
    paddingTop: 32,
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

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 120
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