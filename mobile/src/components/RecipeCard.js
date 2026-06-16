import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import { groceryAPI } from '../services/api';

const RecipeCard = ({ content }) => {
  const { t } = useTranslation();
  const { colors: COLORS } = useThemeStore();
  const styles = getStyles(COLORS);
  const [isExpanded, setIsExpanded] = useState(false);
  const [addingToGrocery, setAddingToGrocery] = useState(false);
  const [addedToGrocery, setAddedToGrocery] = useState(false);

  const parseContent = () => {
    // Відкидаємо порожні рядки
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return null;

    // Назва (перший рядок, очищаємо від '##')
    const name = lines[0].replace(/^##\s*/, '').trim();

    // Знаходимо рядок з метаданими (Час та Складність)
    const metaIndex = lines.findIndex(line => line.includes('**') && line.includes('|'));
    
    // Опис – це все, що між назвою та мета-рядком (або 2-й рядок, якщо мета немає)
    const descriptionEnd = metaIndex !== -1 ? metaIndex : 2;
    const description = lines.slice(1, descriptionEnd).join(' ').trim();

    let time = '';
    let difficulty = '';
    
    // Розумний парсинг часу та складності (вирізає жирний шрифт, залишає лише значення)
    if (metaIndex !== -1) {
      const parts = lines[metaIndex].split('|');
      if (parts.length >= 2) {
        time = parts[0].replace(/\*\*.*?\*\*/g, '').replace(/^:\s*/, '').trim();
        difficulty = parts[1].replace(/\*\*.*?\*\*/g, '').replace(/^:\s*/, '').trim();
      }
    }

    // Шукаємо індекси заголовків незалежно від мови (розумний regex)
    const ingredientsIndex = lines.findIndex(line => line.startsWith('###') && /(Інгредієнти|Ingredients)/i.test(line));
    const missingIngredientsIndex = lines.findIndex(line => line.startsWith('###') && /(Треба докупити|To buy)/i.test(line));
    const instructionsIndex = lines.findIndex(line => line.startsWith('###') && /(Приготування|Instructions)/i.test(line));

    // Визначаємо межі блоків
    const ingredientsEnd = missingIngredientsIndex !== -1 ? missingIngredientsIndex : instructionsIndex;
    
    // Витягуємо списки
    const ingredients = ingredientsIndex !== -1 && ingredientsEnd !== -1 
      ? lines.slice(ingredientsIndex + 1, ingredientsEnd).filter(l => l.trim() !== '').map(line => line.replace(/^-\s*/, '').trim()) 
      : [];

    const missingIngredients = missingIngredientsIndex !== -1 && instructionsIndex !== -1
      ? lines.slice(missingIngredientsIndex + 1, instructionsIndex).filter(l => l.trim() !== '').map(line => line.replace(/^-\s*/, '').trim())
      : [];

    const instructions = instructionsIndex !== -1
      ? lines.slice(instructionsIndex + 1).filter(l => l.trim() !== '').map(line => line.replace(/^\d+\.\s*/, '').trim())
      : [];

    return { name, description, time, difficulty, ingredients, missingIngredients, instructions };
  };

  const recipe = parseContent();

  if (!recipe) {
    return null;
  }

  const handleAddMissingToGrocery = async () => {
    if (addedToGrocery || recipe.missingIngredients.length === 0) {
      return;
    }

    setAddingToGrocery(true);
    let successCount = 0;

    try {
      for (const ingredient of recipe.missingIngredients) {
        await groceryAPI.create({
          name: ingredient,
          quantity: 1,
        });
        successCount++;
      }

      Alert.alert(t('common.success'), t('recipeCard.addedItems', { count: successCount }));
      setAddedToGrocery(true);
    } catch (error) {
      console.error("Error adding to grocery list:", error);
      Alert.alert(t('common.error'), t('recipeCard.addError'));
    } finally {
      setAddingToGrocery(false);
    }
  };

  return (
    <View style={styles.recipeCard}>
      <TouchableOpacity style={styles.recipeHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <View style={styles.recipeMeta}>
            <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.metaText}>{recipe.time}</Text>
            <Ionicons name="bar-chart-outline" size={16} color={COLORS.textLight} style={{ marginLeft: 12 }} />
            <Text style={styles.metaText}>{recipe.difficulty}</Text>
          </View>
        </View>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={COLORS.primary} />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.recipeDetails}>
          {recipe.description ? <Text style={styles.description}>{recipe.description}</Text> : null}

          <Text style={styles.sectionTitle}>{t('recipeCard.ingredients')}</Text>
          {recipe.ingredients.map((ing, idx) => (
            <View key={idx} style={styles.listItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} style={styles.listIcon} />
              <Text style={styles.listText}>{ing}</Text>
            </View>
          ))}

          {recipe.missingIngredients.length > 0 && (
            <>
              <View style={styles.missingHeaderContainer}>
                <Text style={[styles.sectionTitle, { color: COLORS.warning, marginBottom: 0 }]}>{t('recipeCard.missing')}</Text>
                <TouchableOpacity
                  style={[
                    styles.addToGroceryButton,
                    (addedToGrocery || addingToGrocery) && styles.addToGroceryButtonDisabled
                  ]}
                  onPress={handleAddMissingToGrocery}
                  disabled={addingToGrocery || addedToGrocery}
                >
                  {addingToGrocery ? (
                    <ActivityIndicator size="small" color={COLORS.onPrimary} />
                  ) : addedToGrocery ? (
                    <>
                      <Ionicons name="checkmark-outline" size={16} color={COLORS.onPrimary} />
                      <Text style={styles.addToGroceryText}>{t('recipeCard.added')}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cart-outline" size={16} color={COLORS.onPrimary} />
                      <Text style={styles.addToGroceryText}>{t('recipeCard.addAll')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 8 }}>
                {recipe.missingIngredients.map((ing, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} style={styles.listIcon} />
                    <Text style={styles.listText}>{ing}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t('recipeCard.instructions')}</Text>
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
  missingHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addToGroceryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addToGroceryButtonDisabled: {
    backgroundColor: COLORS.surfaceVariant,
  },
  addToGroceryText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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