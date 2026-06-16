/**
 * @file LeaguesScreen.js
 * @description Screen displaying the complete levels roadmap (timeline) and league transitions.
 * Highlights unlocked/locked statuses based on the user's XP.
 * Provides a floating action button (FAB) to automatically scroll to the user's active level milestone.
 */

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

<<<<<<< HEAD
/**
 * Roadmap array representing levels at which users graduate to new leagues or sub-tiers.
 * Details reward structures, titles, icons, and colors.
 */
=======
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
const ROADMAP_DATA = [
  { id: '1', level: 1, titleKey: 'leagues.greenSprouts', descKey: 'leagues.desc1', icon: 'leaf', color: '#2ECC71', isLeague: true },
  { id: '2', level: 10, titleKey: 'leagues.advancedBeginner', descKey: 'leagues.desc2', icon: 'star', color: '#27AE60', isLeague: false },
  { id: '3', level: 50, titleKey: 'leagues.experienced', descKey: 'leagues.desc3', icon: 'trending-up', color: '#229954', isLeague: false },
  { id: '4', level: 101, titleKey: 'leagues.freshnessMasters', descKey: 'leagues.desc4', icon: 'ribbon', color: '#3498DB', isLeague: true },
  { id: '5', level: 150, titleKey: 'leagues.chef', descKey: 'leagues.desc5', icon: 'restaurant', color: '#2980B9', isLeague: false },
  { id: '6', level: 201, titleKey: 'leagues.ecoHeroes', descKey: 'leagues.desc6', icon: 'planet', color: '#F1C40F', isLeague: true },
  { id: '7', level: 300, titleKey: 'leagues.absoluteGuru', descKey: 'leagues.desc7', icon: 'trophy', color: '#F39C12', isLeague: false },
];

/**
 * LeaguesScreen component.
 * Visualizes levels and milestones on a vertical timeline.
 * 
 * @param {object} props.navigation - React Navigation handle.
 */
export default function LeaguesScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();
  const { user, refreshUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  // Reference to the FlatList component to scroll to specific indexes.
  const flatListRef = useRef(null);

  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark, insets);

  // Sync user profile statistics on screen focus
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );

  // Parse user level details
  const currentXP = user?.xp_points || 0;
  const currentLevel = Math.floor(currentXP / 100) + 1;

<<<<<<< HEAD
  // Find index of the highest level reached by the user in the roadmap array
=======
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
  const currentLevelIndex = ROADMAP_DATA.reduce((acc, curr, index) => {
    if (currentLevel >= curr.level) return index;
    return acc;
  }, 0);

  /**
   * Programmatically scrolls to the active level index, centering it in view.
   */
  const jumpToMyLevel = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: currentLevelIndex,
        animated: true,
<<<<<<< HEAD
        viewPosition: 0.5 // Centers the element vertically on the viewport
=======
        viewPosition: 0.5
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
      });
    }
  };

  /**
   * Renders vertical timelines connecting roadmap cards.
   * Nodes are colored if unlocked, and display lock badges if restricted.
   * 
   * @param {object} param0.item - Node data representing level configuration.
   * @param {number} param0.index - Timeline row index.
   */
  const renderItem = ({ item, index }) => {
    const isUnlocked = currentLevel >= item.level;
    const isLast = index === ROADMAP_DATA.length - 1;

    return (
      <View style={styles.timelineRow}>
<<<<<<< HEAD
        {/* Vertical connector line representing progress timeline */}
=======
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
        {!isLast && (
          <View style={[styles.timelineLine, { backgroundColor: isUnlocked ? item.color : COLORS.outline, opacity: isUnlocked ? 1 : 0.3 }]} />
        )}

<<<<<<< HEAD
        {/* Node icon representing the milestone status */}
=======
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
        <View style={[
          styles.timelineNode,
          {
            backgroundColor: isUnlocked ? item.color : COLORS.surfaceVariant,
            borderColor: COLORS.background,
            width: item.isLeague ? 64 : 48,
            height: item.isLeague ? 64 : 48,
            borderRadius: item.isLeague ? 32 : 24,
<<<<<<< HEAD
            marginLeft: item.isLeague ? 0 : 8 // Centers small badges inline with vertical timeline line
=======
            marginLeft: item.isLeague ? 0 : 8
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
          }
        ]}>
          <Ionicons
            name={isUnlocked ? item.icon : "lock-closed"}
            size={item.isLeague ? 30 : 20}
            color={isUnlocked ? '#fff' : COLORS.onSurfaceVariant}
          />
        </View>

<<<<<<< HEAD
        {/* Milestone info card detailing restrictions and descriptions */}
=======
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
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

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('leagues.title')}</Text>
      </View>

      {/* Stats overview banner */}
      <View style={styles.subHeader}>
        <View style={styles.myStatsRow}>
          {/* XP Pill */}
          <View style={styles.statPill}>
            <Ionicons name="star" size={18} color="#F1C40F" />
            <Text style={styles.statPillText}>{currentXP} XP</Text>
          </View>
          {/* Level Pill */}
          <View style={[styles.statPill, { backgroundColor: COLORS.primaryContainer }]}>
            <Ionicons name="trending-up" size={18} color={COLORS.primary} />
            <Text style={[styles.statPillText, { color: COLORS.primary }]}>
              {t('leagues.yourLevel')} {currentLevel}
            </Text>
          </View>
        </View>
      </View>

      {/* Timeline FlatList */}
      <FlatList
        ref={flatListRef}
        data={ROADMAP_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
<<<<<<< HEAD
          // Fallback helper in case of listing rendering race conditions
=======
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />

<<<<<<< HEAD
      {/* Floating action button to automatically scroll to active level */}
=======
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
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

/**
 * Computes component layout styles dynamically depending on theme configuration.
 * 
 * @param {object} COLORS - Guide colors.
 * @param {boolean} isDark - Active dark status.
 * @param {object} insets - Safe area dimensions.
 * @returns {object} StyleSheet layout.
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
<<<<<<< HEAD
    paddingBottom: 120 // Prevents bottom entries overlapping behind the FAB
=======
    paddingBottom: 120
>>>>>>> d0999ae3534e14befbd7edddc43dc17f323a4328
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