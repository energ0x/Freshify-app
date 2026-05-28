import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Switch, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { recipesAPI } from '../services/api';
import useThemeStore from '../store/themeStore';
import CustomButton from '../components/CustomButton';

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeGrocery, setIncludeGrocery] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const { colors: COLORS, theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = getStyles(COLORS, insets, tabBarHeight);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const response = await recipesAPI.get(includeGrocery);
      setRecipes(response.data.recipes || []);
    } catch (error) {
      console.log('Помилка генерації рецептів:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index) => {
    setExpandedId(expandedId === index ? null : index);
  };

  const renderRecipe = ({ item, index }) => {
    const isExpanded = expandedId === index;

    return (
      <View style={styles.recipeCard}>
        <TouchableOpacity style={styles.recipeHeader} onPress={() => toggleExpand(index)} activeOpacity={0.7}>
          <View style={{ flex: 1 }}>
            <Text style={styles.recipeName}>{item.name}</Text>
            <View style={styles.recipeMeta}>
              <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.metaText}>{item.cooking_time}</Text>
              <Ionicons name="bar-chart-outline" size={16} color={COLORS.textLight} style={{ marginLeft: 12 }} />
              <Text style={styles.metaText}>{item.difficulty}</Text>
            </View>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={COLORS.primary} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.recipeDetails}>
            <Text style={styles.description}>{item.description}</Text>

            <Text style={styles.sectionTitle}>Інгредієнти:</Text>
            {item.ingredients?.map((ing, idx) => (
              <Text key={idx} style={styles.listItem}>• {ing}</Text>
            ))}

            {item.missing_ingredients && item.missing_ingredients.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: COLORS.warning, marginTop: 8 }]}>Треба докупити:</Text>
                {item.missing_ingredients.map((ing, idx) => (
                  <Text key={idx} style={styles.listItem}>- {ing}</Text>
                ))}
              </>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Приготування:</Text>
            {item.instructions?.map((step, idx) => (
              <Text key={idx} style={styles.stepItem}><Text style={styles.stepNumber}>{idx + 1}.</Text> {step}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Рецепти від AI</Text>
        <View style={styles.controls}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Врахувати список покупок</Text>
            <Switch
              value={includeGrocery}
              onValueChange={setIncludeGrocery}
              trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary }}
              thumbColor={COLORS.onPrimary}
            />
          </View>
          <CustomButton
            title="Згенерувати рецепти"
            onPress={fetchRecipes}
            loading={loading}
            style={styles.generateBtn}
            icon={<Ionicons name="sparkles-outline" size={20} color={COLORS.onPrimary} />}
          />
        </View>
      </View>

      {loading && recipes.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Шеф-кухар Gemini думає...</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderRecipe}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="restaurant-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Згенеруйте рецепти</Text>
              <Text style={styles.emptyText}>Натисніть кнопку, щоб отримати ідеї страв на основі продуктів у вашому холодильнику</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (COLORS, insets, tabBarHeight) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: {
    paddingTop: insets.top || 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  controls: { 
    paddingHorizontal: 20, 
  },
  switchContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
    backgroundColor: COLORS.surfaceVariant,
    padding: 16,
    borderRadius: 16,
  },
  switchLabel: { 
    fontSize: 16, 
    color: COLORS.text,
    fontWeight: '500',
  },
  generateBtn: { 
    borderRadius: 100,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: { 
    marginTop: 16, 
    color: COLORS.textLight, 
    fontSize: 16 
  },
  list: { 
    padding: 16, 
    paddingBottom: tabBarHeight + 40,
  },
  recipeCard: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 24, 
    marginBottom: 16, 
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden' 
  },
  recipeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20 
  },
  recipeName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text, 
    marginBottom: 8 
  },
  recipeMeta: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  metaText: { 
    fontSize: 14, 
    color: COLORS.textLight, 
    marginLeft: 6 
  },
  recipeDetails: { 
    padding: 20, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border 
  },
  description: { 
    fontSize: 15, 
    fontStyle: 'italic', 
    color: COLORS.text, 
    marginBottom: 16, 
    lineHeight: 22 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text, 
    marginBottom: 8 
  },
  listItem: { 
    fontSize: 15, 
    color: COLORS.text, 
    marginBottom: 6, 
    paddingLeft: 8,
    lineHeight: 22,
  },
  stepItem: { 
    fontSize: 15, 
    color: COLORS.text, 
    marginBottom: 10, 
    lineHeight: 22 
  },
  stepNumber: { 
    fontWeight: 'bold', 
    color: COLORS.primary 
  },
  empty: { 
    alignItems: 'center', 
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 16, 
    color: COLORS.textLight, 
    textAlign: 'center',
    lineHeight: 24,
  },
});