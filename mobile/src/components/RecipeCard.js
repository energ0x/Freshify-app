import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import useThemeStore from '../store/themeStore';
import { groceryAPI } from '../services/api';

const RecipeCard = ({ content }) => {
  const { t } = useTranslation();
  const { colors: COLORS, theme } = useThemeStore();
  const isDark = theme === 'dark';
  const styles = getStyles(COLORS, isDark);

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

    // Шукаємо індекси заголовків незалежно від мови
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
        <View style={styles.headerInfo}>
          <Text style={styles.recipeName}>{recipe.name}</Text>

          <View style={styles.recipeMeta}>
            {!!recipe.time && (
              <View style={styles.metaPill}>
                <Ionicons name="time" size={16} color={COLORS.primary} />
                <Text style={styles.metaText}>{recipe.time}</Text>
              </View>
            )}
            {!!recipe.difficulty && (
              <View style={styles.metaPill}>
                <Ionicons name="bar-chart" size={16} color={COLORS.primary} />
                <Text style={styles.metaText}>{recipe.difficulty}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.expandIconContainer, isExpanded && styles.expandIconContainerActive]}>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={22} color={isExpanded ? COLORS.onPrimaryContainer : COLORS.primary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.recipeDetails}>
          {recipe.description ? <Text style={styles.description}>{recipe.description}</Text> : null}

          {recipe.ingredients.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('recipeCard.ingredients', 'Інгредієнти')}</Text>
              {recipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.listItem}>
                  <View style={styles.listIconWrapValid}>
                    <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                  </View>
                  <Text style={styles.listText}>{ing}</Text>
                </View>
              ))}
            </>
          )}

          {recipe.missingIngredients.length > 0 && (
            <View style={styles.missingSection}>
              <View style={styles.missingHeaderContainer}>
                <Text style={styles.sectionTitleMissing}>{t('recipeCard.missing', 'Треба докупити')}</Text>
                <TouchableOpacity
                  style={[
                    styles.addToGroceryButton,
                    (addedToGrocery || addingToGrocery) && styles.addToGroceryButtonDisabled
                  ]}
                  onPress={handleAddMissingToGrocery}
                  disabled={addingToGrocery || addedToGrocery}
                  activeOpacity={0.8}
                >
                  {addingToGrocery ? (
                    <ActivityIndicator size="small" color={COLORS.onPrimaryContainer} />
                  ) : addedToGrocery ? (
                    <>
                      <Ionicons name="checkmark-done" size={18} color={COLORS.primary} />
                      <Text style={[styles.addToGroceryText, { color: COLORS.primary }]}>{t('recipeCard.added', 'Додано')}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cart" size={18} color={COLORS.onPrimaryContainer} />
                      <Text style={styles.addToGroceryText}>{t('recipeCard.addAll', 'В список')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.missingList}>
                {recipe.missingIngredients.map((ing, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <View style={styles.listIconWrapMissing}>
                      <Ionicons name="close" size={14} color={COLORS.danger ?? '#FF3B30'} />
                    </View>
                    <Text style={styles.listText}>{ing}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {recipe.instructions.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t('recipeCard.instructions', 'Приготування')}</Text>
              {recipe.instructions.map((step, idx) => (
                <View key={idx} style={styles.stepItem}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const getStyles = (COLORS, isDark) => StyleSheet.create({
  recipeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 8,
    overflow: 'hidden'
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  headerInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  expandIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandIconContainerActive: {
    backgroundColor: COLORS.primaryContainer,
  },

  // ─── Content Details ───────────────────────────────────────────────────────
  recipeDetails: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  description: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
  },

  // ─── Lists ─────────────────────────────────────────────────────────────────
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  listIconWrapValid: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  listIconWrapMissing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.errorContainer || '#FF3B3020',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 22,
  },

  // ─── Missing Ingredients Section ───────────────────────────────────────────
  missingSection: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  missingHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleMissing: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger ?? '#FF3B30',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addToGroceryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addToGroceryButtonDisabled: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  },
  addToGroceryText: {
    color: COLORS.onPrimaryContainer,
    fontSize: 13,
    fontWeight: '700',
  },
  missingList: {
    marginTop: 4,
  },

  // ─── Instructions ──────────────────────────────────────────────────────────
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontWeight: '800',
    color: COLORS.onPrimary,
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    fontWeight: '500',
  },
});

export default RecipeCard;