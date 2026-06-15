import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  PRODUCTS: '@freshify:products',
  GROCERY: '@freshify:grocery',
  CATEGORIES: '@freshify:categories',
  CONSUMED: '@freshify:consumed',
  ACHIEVEMENTS: '@freshify:achievements',
  SYNC_QUEUE: '@freshify:sync_queue',
};

export const read = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const write = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

export const append = async (key, item) => {
  try {
    const data = await read(key);
    const newData = (data || []).concat(item);
    await write(key, newData);
  } catch {}
};

export const removeById = async (key, id) => {
  try {
    const data = await read(key);
    if (data) {
      const filtered = data.filter(item => item.id !== id);
      await write(key, filtered);
    }
  } catch {}
};

export const replaceById = async (key, id, newItem) => {
  try {
    const data = await read(key);
    if (data) {
      const updated = data.map(item => (item.id === id ? newItem : item));
      await write(key, updated);
    }
  } catch {}
};

export const clear = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
};

export default { KEYS, read, write, append, removeById, replaceById, clear };
