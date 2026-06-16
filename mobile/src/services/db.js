/**
 * @file db.js
 * @description Local persistent storage service wrapper built on top of AsyncStorage.
 * Provides basic CRUD utility helpers (read, write, append, update/replace, delete/remove)
 * to manipulate stored collections (products, categories, grocery items, etc.) for offline-first support.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage key constants.
 * Standardizes storage namespaces used for different data types.
 */
export const KEYS = {
  PRODUCTS: '@freshify:products',         // Cached list of active products
  GROCERY: '@freshify:grocery',           // Cached list of grocery shopping items
  CATEGORIES: '@freshify:categories',     // Cached list of product categories
  CONSUMED: '@freshify:consumed',         // Cached history of consumed products
  ACHIEVEMENTS: '@freshify:achievements', // Cached list of user achievements
  SYNC_QUEUE: '@freshify:sync_queue',     // Queue of unsynced offline API operations
};

/**
 * Reads a JSON-formatted collection from AsyncStorage.
 * 
 * @param {string} key - AsyncStorage key identifier.
 * @returns {Promise<any|null>} Parsed JSON content, or null if empty or on error.
 */
export const read = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Writes/overwrites a JSON-serializable dataset to AsyncStorage.
 * 
 * @param {string} key - AsyncStorage key identifier.
 * @param {any} data - Content to serialize and store.
 * @returns {Promise<void>} Resolves when execution completes.
 */
export const write = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

/**
 * Appends a single item to an existing collection array.
 * 
 * @param {string} key - Target AsyncStorage key.
 * @param {any} item - Object to append.
 * @returns {Promise<void>} Resolves when execution completes.
 */
export const append = async (key, item) => {
  try {
    const data = await read(key);
    const newData = (data || []).concat(item);
    await write(key, newData);
  } catch {}
};

/**
 * Removes an item from a cached collection array matching a given ID.
 * 
 * @param {string} key - Target AsyncStorage key.
 * @param {string|number} id - The unique identifier of the item to delete.
 * @returns {Promise<void>} Resolves when execution completes.
 */
export const removeById = async (key, id) => {
  try {
    const data = await read(key);
    if (data) {
      const filtered = data.filter(item => item.id !== id);
      await write(key, filtered);
    }
  } catch {}
};

/**
 * Replaces an existing item in a cached collection array matching a given ID.
 * Used for swapping temporary offline IDs with server IDs or updating item properties.
 * 
 * @param {string} key - Target AsyncStorage key.
 * @param {string|number} id - Target item ID.
 * @param {any} newItem - New object values to merge or replace.
 * @returns {Promise<void>} Resolves when execution completes.
 */
export const replaceById = async (key, id, newItem) => {
  try {
    const data = await read(key);
    if (data) {
      const updated = data.map(item => (item.id === id ? newItem : item));
      await write(key, updated);
    }
  } catch {}
};

/**
 * Clears/removes a key from AsyncStorage.
 * 
 * @param {string} key - AsyncStorage key target.
 * @returns {Promise<void>} Resolves when execution completes.
 */
export const clear = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
};

export default { KEYS, read, write, append, removeById, replaceById, clear };
