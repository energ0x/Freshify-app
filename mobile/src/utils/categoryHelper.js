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

export const getTranslatedCategoryName = (name, t) => {
  if (!name) return '';
  const key = DEFAULT_CATEGORIES_MAP[name];
  if (key) {
    return t(`categories.defaults.${key}`);
  }
  return name;
};