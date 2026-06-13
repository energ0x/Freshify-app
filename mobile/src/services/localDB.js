import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_KEYS = {
  PRODUCTS: 'products',
  CONSUMED_PRODUCTS: 'consumed_products',
  GROCERY_ITEMS: 'grocery_items',
  CATEGORIES: 'categories',
  OFFLINE_QUEUE: 'offline_queue',
};

// --- Generic Helpers ---

const getJSON = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error(`[LocalDB] Failed to get JSON for key: ${key}`, e);
    return null;
  }
};

const setJSON = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error(`[LocalDB] Failed to set JSON for key: ${key}`, e);
  }
};

// --- Products ---

export const getLocalProducts = () => getJSON(DB_KEYS.PRODUCTS);
export const saveLocalProducts = (products) => setJSON(DB_KEYS.PRODUCTS, products);

// --- Consumed Products ---

export const getLocalConsumedProducts = () => getJSON(DB_KEYS.CONSUMED_PRODUCTS);
export const saveLocalConsumedProducts = (products) => setJSON(DB_KEYS.CONSUMED_PRODUCTS, products);

// --- Grocery ---

export const getLocalGroceryItems = () => getJSON(DB_KEYS.GROCERY_ITEMS);
export const saveLocalGroceryItems = (items) => setJSON(DB_KEYS.GROCERY_ITEMS, items);

// --- Categories ---

export const getLocalCategories = () => getJSON(DB_KEYS.CATEGORIES);
export const saveLocalCategories = (categories) => setJSON(DB_KEYS.CATEGORIES, categories);

// --- Offline Queue ---

export const getOfflineQueue = async () => {
  return (await getJSON(DB_KEYS.OFFLINE_QUEUE)) || [];
};

export const addToOfflineQueue = async (action) => {
  const queue = await getOfflineQueue();
  queue.push({ ...action, id: `offline_${new Date().getTime()}` });
  await setJSON(DB_KEYS.OFFLINE_QUEUE, queue);
};

export const clearOfflineQueue = () => setJSON(DB_KEYS.OFFLINE_QUEUE, []);

export const removeActionFromQueue = async (actionId) => {
  let queue = await getOfflineQueue();
  queue = queue.filter(action => action.id !== actionId);
  await setJSON(DB_KEYS.OFFLINE_QUEUE, queue);
};
