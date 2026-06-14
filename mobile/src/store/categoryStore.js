import { create } from 'zustand';
import { categoriesAPI } from '../services/api';
import * as db from '../services/db';
import * as syncQueue from '../services/syncQueue';
import useProductStore from './productStore';

function generateTempId() {
  return 'tmp_' + 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

const useCategoryStore = create((set, get) => ({
  categories: [],
  loading: false,
  error: null,
  isOnline: true,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await categoriesAPI.list();
      set({ categories: response.data, loading: false });
      await db.write(db.KEYS.CATEGORIES, response.data);
    } catch (error) {
      set({ loading: false });
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

  createCategory: async (data) => {
    const tempId = generateTempId();
    const optimistic = { id: tempId, ...data };

    set(state => ({ categories: [...state.categories, optimistic] }));
    await db.write(db.KEYS.CATEGORIES, get().categories);

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
      get().patchTempId(tempId, response.data.id);
      return response.data;
    } catch (networkError) {
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
      set(state => ({
        categories: state.categories.filter(c => c.id !== tempId),
      }));
      await db.write(db.KEYS.CATEGORIES, get().categories);
      throw networkError;
    }
  },

  updateCategory: async (id, data) => {
    const old = get().categories.find(c => c.id === id);
    set(state => ({
      categories: state.categories.map(c => (c.id === id ? { ...c, ...data } : c)),
    }));
    await db.write(db.KEYS.CATEGORIES, get().categories);

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
      set(state => ({
        categories: state.categories.map(c => (c.id === id ? old : c)),
      }));
      await db.write(db.KEYS.CATEGORIES, get().categories);
      return { success: false, error: 'Помилка оновлення' };
    }
  },

  deleteCategory: async (id) => {
    const originalCategories = get().categories;
    const filtered = originalCategories.filter(c => c.id !== id);
    set({ categories: filtered });
    await db.write(db.KEYS.CATEGORIES, filtered);

    if (String(id).startsWith('tmp_')) {
      await syncQueue.removeByTempId(id);
      return { success: true };
    }

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

  setOnline: (isOnline) => {
    set({ isOnline });
  },
}));

export default useCategoryStore;