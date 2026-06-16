/**
 * @file categoryStore.js
 * @description Zustand state management store for product categories.
 * Supports offline storage synchronization, caching, optimistic UI updates,
 * and automatic synchronization queue management.
 */

import { create } from 'zustand';
import { categoriesAPI } from '../services/api';
import * as db from '../services/db';
import * as syncQueue from '../services/syncQueue';
import useProductStore from './productStore';

/**
 * Generates a mock ID prefixed with 'tmp_' for optimistic UI updates in offline mode.
 * 
 * @returns {string} The temporary ID string.
 */
function generateTempId() {
  return 'tmp_' + 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

/**
 * Zustand category store configuration.
 * Manages category state collections, loaders, errors, and internet state connectivity.
 */
const useCategoryStore = create((set, get) => ({
  // State variables
  categories: [],            // List of active food categories
  loading: false,            // Indicates category operations in progress
  error: null,               // Last caught error message
  isOnline: true,            // Device network status

  /**
   * Fetches product categories.
   * On success, updates state and caches data. On failure, falls back to reading cache.
   */
  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await categoriesAPI.list();
      set({ categories: response.data, loading: false });
      // Store loaded categories list to local SQLite/AsyncStorage cache.
      await db.write(db.KEYS.CATEGORIES, response.data);
    } catch (error) {
      set({ loading: false });
      // If store is empty, look up cached database records.
      if (get().categories.length === 0) {
        const cached = await db.read(db.KEYS.CATEGORIES);
        if (cached) {
          set({ categories: cached });
        } else {
          set({ error: 'Помилка завантаження категорій' });
        }
      }
    }
  },

  /**
   * Creates a new category.
   * Optimistically appends the item immediately. Queues backend sync if offline.
   * 
   * @param {object} data - Category creation payload.
   * @returns {Promise<object>} The added category object (optimistic or real).
   */
  createCategory: async (data) => {
    const tempId = generateTempId();
    const optimistic = { id: tempId, ...data };

    // Update memory array optimistically and sync to cache.
    set(state => ({ categories: [...state.categories, optimistic] }));
    await db.write(db.KEYS.CATEGORIES, get().categories);

    // If offline, save action to local sync queue and increment pending operation counter
    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'category',
        operation: 'create',
        tempId,
        serverId: null,
        payload: data,
      });
      useProductStore.setState(s => ({ pendingCount: s.pendingCount + 1 }));
      return optimistic;
    }

    try {
      const response = await categoriesAPI.create(data);
      // Replace temporary ID with database ID
      get().patchTempId(tempId, response.data.id);
      return response.data;
    } catch (networkError) {
      // If error is network-related, delegate syncing to local queue
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'category',
          operation: 'create',
          tempId,
          serverId: null,
          payload: data,
        });
        useProductStore.setState(s => ({ pendingCount: s.pendingCount + 1 }));
        return optimistic;
      }
      // Revert state if backend returns a validation/application error
      set(state => ({
        categories: state.categories.filter(c => c.id !== tempId),
      }));
      await db.write(db.KEYS.CATEGORIES, get().categories);
      throw networkError;
    }
  },

  /**
   * Updates an existing category.
   * Optimistically alters details. Queues operations if offline.
   * 
   * @param {string|number} id - Target category ID.
   * @param {object} data - Category properties to update.
   * @returns {Promise<object>} Status object indicating success.
   */
  updateCategory: async (id, data) => {
    const old = get().categories.find(c => c.id === id);
    
    // Apply changes locally immediately
    set(state => ({
      categories: state.categories.map(c => (c.id === id ? { ...c, ...data } : c)),
    }));
    await db.write(db.KEYS.CATEGORIES, get().categories);

    // Queue operation if offline
    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'category',
        operation: 'update',
        tempId: null,
        serverId: id,
        payload: data,
      });
      useProductStore.setState(s => ({ pendingCount: s.pendingCount + 1 }));
      return { success: true };
    }

    try {
      const response = await categoriesAPI.update(id, data);
      // Override with actual response from server
      set(state => ({
        categories: state.categories.map(c => (c.id === id ? response.data : c)),
      }));
      await db.write(db.KEYS.CATEGORIES, get().categories);
      return { success: true };
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'category',
          operation: 'update',
          tempId: null,
          serverId: id,
          payload: data,
        });
        useProductStore.setState(s => ({ pendingCount: s.pendingCount + 1 }));
        return { success: true };
      }
      // Roll back changes on API failure
      set(state => ({
        categories: state.categories.map(c => (c.id === id ? old : c)),
      }));
      await db.write(db.KEYS.CATEGORIES, get().categories);
      return { success: false, error: 'Помилка оновлення' };
    }
  },

  /**
   * Deletes a category.
   * Optimistically removes it from store. Handles unsynced/synced categories appropriately.
   * 
   * @param {string|number} id - Target category ID.
   * @returns {Promise<object>} Status object.
   */
  deleteCategory: async (id) => {
    const originalCategories = get().categories;
    const filtered = originalCategories.filter(c => c.id !== id);
    
    set({ categories: filtered });
    await db.write(db.KEYS.CATEGORIES, filtered);

    // If category was local-only (unsynced), remove its creation from sync queue
    if (String(id).startsWith('tmp_')) {
      await syncQueue.removeByTempId(id);
      return { success: true };
    }

    // Queue deletion if offline
    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'category',
        operation: 'delete',
        tempId: null,
        serverId: id,
        payload: { id },
      });
      useProductStore.setState(s => ({ pendingCount: s.pendingCount + 1 }));
      return { success: true };
    }

    try {
      await categoriesAPI.delete(id);
      return { success: true };
    } catch (networkError) {
      // Revert optimism if there is a server error
      set({ categories: originalCategories });
      await db.write(db.KEYS.CATEGORIES, originalCategories);

      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'category',
          operation: 'delete',
          tempId: null,
          serverId: id,
          payload: { id },
        });
        useProductStore.setState(s => ({ pendingCount: s.pendingCount + 1 }));
        return { success: true };
      }
      return { success: false, error: 'Помилка видалення' };
    }
  },

  /**
   * Wipes custom category adjustments and restores default seeded configuration.
   * 
   * @returns {Promise<object>} Status object.
   */
  restoreDefaultCategories: async () => {
    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'category',
        operation: 'restore_defaults',
        tempId: null,
        serverId: null,
        payload: {},
      });
      useProductStore.setState(s => ({ pendingCount: s.pendingCount + 1 }));
      return { success: true };
    }

    try {
      const response = await categoriesAPI.restoreDefaults();
      set({ categories: response.data });
      await db.write(db.KEYS.CATEGORIES, response.data);
      return { success: true };
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'category',
          operation: 'restore_defaults',
          tempId: null,
          serverId: null,
          payload: {},
        });
        useProductStore.setState(s => ({ pendingCount: s.pendingCount + 1 }));
        return { success: true };
      }
      return { success: false, error: 'Помилка' };
    }
  },

  /**
   * Replaces temporary ID with real server ID for categories in memory and cache.
   * 
   * @param {string} tempId - Temporary client ID string.
   * @param {string|number} realId - Permanent DB ID.
   */
  patchTempId: (tempId, realId) => {
    set(state => ({
      categories: state.categories.map(c =>
        c.id === tempId ? { ...c, id: realId } : c
      ),
    }));
    db.replaceById(db.KEYS.CATEGORIES, tempId, {
      ...get().categories.find(c => c.id === realId),
    }).catch(() => {});
  },

  /**
   * Sets the online network status.
   * 
   * @param {boolean} isOnline - Network state.
   */
  setOnline: (isOnline) => {
    set({ isOnline });
  },
}));

export default useCategoryStore;