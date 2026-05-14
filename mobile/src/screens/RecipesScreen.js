import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { recipesAPI } from '../services/api';
import CustomButton from '../components/CustomButton';
import { COLORS } from '../utils/constants';

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeGrocery, setIncludeGrocery] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

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
      <View style={styles.controls}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Врахувати список покупок</Text>
          <Switch
            value={includeGrocery}
            onValueChange={setIncludeGrocery}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>
        <CustomButton
          title="Згенерувати рецепти (AI)"
          onPress={fetchRecipes}
          loading={loading}
          style={styles.generateBtn}
        />
      </View>

      {loading ? (
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
              <Ionicons name="restaurant-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>Натисніть кнопку, щоб отримати ідеї страв</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  controls: { padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 16, color: COLORS.text },
  generateBtn: { borderRadius: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: COLORS.textLight, fontSize: 16 },
  list: { padding: 16, paddingBottom: 40 },
  recipeCard: { backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  recipeName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  recipeMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 14, color: COLORS.textLight, marginLeft: 4 },
  recipeDetails: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: COLORS.border },
  description: { fontSize: 15, fontStyle: 'italic', color: COLORS.text, marginBottom: 12, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  listItem: { fontSize: 15, color: COLORS.text, marginBottom: 4, paddingLeft: 8 },
  stepItem: { fontSize: 15, color: COLORS.text, marginBottom: 8, lineHeight: 22 },
  stepNumber: { fontWeight: 'bold', color: COLORS.primary },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textLight, textAlign: 'center' },
});