import { create } from 'zustand';
import { categoriesAPI } from '../services/api';
import {
  getLocalCategories,
  saveLocalCategories,
  addToOfflineQueue,
} from '../services/localDB';

const generateTempId = () => `temp_cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const useCategoryStore = create((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    
    // 1. Отримати з локальної БД відразу
    const localCategories = await getLocalCategories();
    if (localCategories) {
      set({ categories: localCategories, isLoading: false });
    }

    // 2. Спробувати завантажити з API
    try {
      const response = await categoriesAPI.list();
      set({ categories: response.data, isLoading: false });
      await saveLocalCategories(response.data);
    } catch (error) {
      console.warn('Офлайн режим для категорій', error);
      if (!localCategories) {
         set({ isLoading: false, error: 'Не вдалося завантажити категорії. Перевірте з\'єднання.' });
      } else {
         set({ isLoading: false });
      }
    }
  },

  createCategory: async (categoryData) => {
    const tempId = generateTempId();
    const tempCategory = { ...categoryData, id: tempId, isTemp: true };
    
    // Оптимістичне оновлення
    set((state) => {
      const updatedCategories = [...state.categories, tempCategory];
      saveLocalCategories(updatedCategories);
      return { categories: updatedCategories };
    });

    try {
      const response = await categoriesAPI.create(categoryData);
      set((state) => {
         const updatedCategories = state.categories.map((c) => (c.id === tempId ? response.data : c));
         saveLocalCategories(updatedCategories);
         return { categories: updatedCategories };
      });
      return response.data;
    } catch (err) {
      await addToOfflineQueue({ type: 'ADD_CATEGORY', payload: { data: categoryData, tempId } });
      return tempCategory;
    }
  },

  updateCategory: async (id, categoryData) => {
    // Оптимістичне оновлення
    set((state) => {
       const updatedCategories = state.categories.map((c) => (c.id === id ? { ...c, ...categoryData } : c));
       saveLocalCategories(updatedCategories);
       return { categories: updatedCategories };
    });

    if (id.toString().startsWith('temp_')) {
       await addToOfflineQueue({ type: 'UPDATE_CATEGORY', payload: { id, data: categoryData } });
       return;
    }

    try {
      const response = await categoriesAPI.update(id, categoryData);
      set((state) => {
          const updatedCategories = state.categories.map((c) => (c.id === id ? response.data : c));
          saveLocalCategories(updatedCategories);
          return { categories: updatedCategories };
      });
      return response.data;
    } catch (err) {
      await addToOfflineQueue({ type: 'UPDATE_CATEGORY', payload: { id, data: categoryData } });
      throw err; // Або повертати { success: false, offline: true }
    }
  },

  deleteCategory: async (id) => {
    // Оптимістичне видалення
    set((state) => {
       const updatedCategories = state.categories.filter((c) => c.id !== id);
       saveLocalCategories(updatedCategories);
       return { categories: updatedCategories };
    });

    if (id.toString().startsWith('temp_')) {
       await addToOfflineQueue({ type: 'DELETE_CATEGORY', payload: { id } });
       return;
    }

    try {
      await categoriesAPI.delete(id);
    } catch (err) {
      await addToOfflineQueue({ type: 'DELETE_CATEGORY', payload: { id } });
    }
  },

  restoreDefaultCategories: async () => {
    try {
      const response = await categoriesAPI.restoreDefaults();
      set({ categories: response.data });
      await saveLocalCategories(response.data);
      return response.data;
    } catch (err) {
      console.error("Failed to restore default categories", err);
      throw err;
    }
  },
}));

export default useCategoryStore;