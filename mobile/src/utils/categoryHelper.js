/**
 * @file categoryHelper.js
 * @description Helper functions and mappings for converting and localizing category names.
 * Standardizes default category database entries (primarily written in Ukrainian) to translations keys,
 * allowing internationalized rendering in English or Ukrainian based on the user's active locale.
 */

/**
 * Static mapping matching standard backend-seeded category titles (in Ukrainian)
 * to standard localization keys used within translation dictionary files (e.g. en.json, uk.json).
 */
export const DEFAULT_CATEGORIES_MAP = {
  'Молочні продукти': 'dairy',
  "М'ясо та риба": 'meatAndFish',
  'Овочі': 'vegetables',
  'Фрукти': 'fruits',
  'Зелень': 'greens',
  'Хліб та випічка': 'breadAndBakery',
  'Напої': 'drinks',
  'Консерви': 'cannedGoods',
  'Крупи та злаки': 'cerealsAndGrains',
  'Заморожені продукти': 'frozenFoods',
  'Соуси та приправи': 'saucesAndSpices',
  'Солодощі': 'sweets',
  'Інше': 'other'
};

/**
 * Formats and localizes a category's name.
 * If the category name matches an entry in `DEFAULT_CATEGORIES_MAP`, returns the localized name.
 * Otherwise, falls back to returning the original category name parameter.
 * 
 * @param {string|null|undefined} name - Raw category name to convert.
 * @param {Function} t - The localization translation hook function (typically from useTranslation).
 * @returns {string} Localized string name, or the fallback name.
 */
export const getTranslatedCategoryName = (name, t) => {
  if (!name) return '';
  const key = DEFAULT_CATEGORIES_MAP[name];
  if (key) {
    return t(`categories.defaults.${key}`);
  }
  return name;
};