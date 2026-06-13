import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';

// Роадмеп (Карта розвитку)
const ROADMAP_DATA = [
  { id: '1', level: 1, title: 'Зелені Паростки', desc: 'Ваш шлях починається!\n1 ШІ-рецепт, 3 фото, 5 штрихкодів, 10 ручних додавань на місяць.', icon: 'leaf', color: '#2ECC71', isLeague: true },
  { id: '2', level: 10, title: 'Просунутий новачок', desc: 'Ви втягуєтесь:\n2 ШІ-рецепти, 5 фото, 10 штрихкодів, 20 ручних додавань.', icon: 'star', color: '#27AE60', isLeague: false },
  { id: '3', level: 50, title: 'Досвідчений', desc: 'Ваш еко-слід стає меншим:\n5 ШІ-рецептів, 15 фото, 30 штрихкодів, 50 ручних додавань.', icon: 'trending-up', color: '#229954', isLeague: false },
  { id: '4', level: 101, title: 'Майстри Свіжості', desc: 'Ви у новій лізі!\n10 ШІ-рецептів, 30 фото, 50 штрихкодів, 100 ручних додавань.', icon: 'ribbon', color: '#3498DB', isLeague: true },
  { id: '5', level: 150, title: 'Шеф-кухар', desc: 'Готуємо розумно:\n15 ШІ-рецептів, 40 фото, 80 штрихкодів, 150 ручних додавань.', icon: 'restaurant', color: '#2980B9', isLeague: false },
  { id: '6', level: 201, title: 'Еко-Герої', desc: 'Елітна ліга Планети!\n20 ШІ-рецептів, 50 фото, 100 штрихкодів, безліміт ручних додавань.', icon: 'planet', color: '#F1C40F', isLeague: true },
  { id: '7', level: 300, title: 'Абсолютний Гуру', desc: 'Максимальний рівень!\nВи досягли досконалості у стилі Zero Waste.', icon: 'trophy', color: '#F39C12', isLeague: false },
];

export default function LeaguesScreen({ navigation }) {
  const { colors: COLORS, theme } = useThemeStore();
  const { user, refreshUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

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
          <View style={[styles.timelineLine, { backgroundColor: isUnlocked ? item.color : COLORS.border }]} />
        )}

        {/* Іконка-вузол на таймлайні */}
        <View style={[
          styles.timelineNode, 
          { 
            backgroundColor: isUnlocked ? item.color : COLORS.surfaceVariant,
            borderColor: COLORS.background,
            width: item.isLeague ? 56 : 40,
            height: item.isLeague ? 56 : 40,
            borderRadius: item.isLeague ? 28 : 20,
            marginLeft: item.isLeague ? 0 : 8 // Вирівнювання маленьких іконок по центру лінії
          }
        ]}>
          <Ionicons 
            name={isUnlocked ? item.icon : "lock-closed"} 
            size={item.isLeague ? 28 : 18} 
            color={isUnlocked ? '#fff' : COLORS.textLight} 
          />
        </View>

        {/* Картка з описом */}
        <View style={[styles.card, { backgroundColor: COLORS.surface, opacity: isUnlocked ? 1 : 0.6 }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: isUnlocked ? item.color : COLORS.text }]}>
              {item.title}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: isUnlocked ? `${item.color}15` : COLORS.surfaceVariant }]}>
              <Text style={[styles.levelBadgeText, { color: isUnlocked ? item.color : COLORS.textLight }]}>
                Рівень {item.level}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: COLORS.textLight }]}>{item.desc}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Шапка з поточною статистикою */}
      <View style={[styles.header, { backgroundColor: COLORS.surface, paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: COLORS.text }]}>Карта Рівнів</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.myStatsRow}>
          <View style={styles.statPill}>
            <Ionicons name="star" size={16} color="#F1C40F" />
            <Text style={[styles.statPillText, { color: COLORS.text }]}>{currentXP} XP</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="trending-up" size={16} color={COLORS.primary} />
            <Text style={[styles.statPillText, { color: COLORS.text }]}>Ваш рівень: {currentLevel}</Text>
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
        style={[styles.fab, { backgroundColor: COLORS.primary, bottom: insets.bottom + 20 }]} 
        onPress={jumpToMyLevel}
        activeOpacity={0.8}
      >
        <Ionicons name="location" size={20} color="#fff" />
        <Text style={styles.fabText}>До мого рівня</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
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
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  myStatsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  statPillText: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100 },
  
  timelineRow: { flexDirection: 'row', marginBottom: 24, position: 'relative' },
  timelineLine: { position: 'absolute', left: 27, top: 40, bottom: -30, width: 2, zIndex: 0 },
  timelineNode: { justifyContent: 'center', alignItems: 'center', zIndex: 1, borderWidth: 4 },
  
  card: { flex: 1, marginLeft: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  levelBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18 },

  fab: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 100, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 8 },
});