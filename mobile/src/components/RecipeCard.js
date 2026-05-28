import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/themeStore';

const RecipeCard = ({ content }) => {
  const { colors: COLORS } = useThemeStore();
  const styles = getStyles(COLORS);
  const [isExpanded, setIsExpanded] = useState(false);

  const parseContent = () => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return null;

    const name = lines[0].replace('##', '').trim();
    const description = lines[1] || '';
    
    const metaLine = lines.find(line => line.includes('**Час:**'));
    const time = metaLine?.match(/\*\*Час:\*\* (.*?)( |$)/)?.[1] || '';
    const difficulty = metaLine?.match(/\*\*Складність:\*\* (.*)/)?.[1] || '';

    const ingredientsIndex = lines.findIndex(line => line.includes('### Інгредієнти:'));
    const missingIngredientsIndex = lines.findIndex(line => line.includes('### Треба докупити:'));
    const instructionsIndex = lines.findIndex(line => line.includes('### Приготування:'));

    const ingredients = lines.slice(
      ingredientsIndex + 1,
      missingIngredientsIndex !== -1 ? missingIngredientsIndex : instructionsIndex
    ).map(line => line.replace('-', '').trim());

    const missingIngredients = missingIngredientsIndex !== -1 ? lines.slice(
      missingIngredientsIndex + 1,
      instructionsIndex
    ).map(line => line.replace('-', '').trim()) : [];

    const instructions = lines.slice(instructionsIndex + 1).map(line => line.replace(/^\d+\.\s*/, '').trim());

    return { name, description, time, difficulty, ingredients, missingIngredients, instructions };
  };

  const recipe = parseContent();

  if (!recipe) {
    return null;
  }

  return (
    <View style={styles.recipeCard}>
      <TouchableOpacity style={styles.recipeHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <View style={styles.recipeMeta}>
            <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.metaText}>{recipe.time} хв</Text>
            <Ionicons name="bar-chart-outline" size={16} color={COLORS.textLight} style={{ marginLeft: 12 }} />
            <Text style={styles.metaText}>{recipe.difficulty}</Text>
          </View>
        </View>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={COLORS.primary} />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.recipeDetails}>
          <Text style={styles.description}>{recipe.description}</Text>

          <Text style={styles.sectionTitle}>Інгредієнти:</Text>
          {recipe.ingredients.map((ing, idx) => (
            <View key={idx} style={styles.listItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} style={styles.listIcon} />
              <Text style={styles.listText}>{ing}</Text>
            </View>
          ))}

          {recipe.missingIngredients.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: COLORS.warning, marginTop: 8 }]}>Треба докупити:</Text>
              {recipe.missingIngredients.map((ing, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} style={styles.listIcon} />
                  <Text style={styles.listText}>{ing}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Приготування:</Text>
          {recipe.instructions.map((step, idx) => (
            <Text key={idx} style={styles.stepItem}><Text style={styles.stepNumber}>{idx + 1}.</Text> {step}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

const getStyles = (COLORS) => StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  listIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
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
});

export default RecipeCard;