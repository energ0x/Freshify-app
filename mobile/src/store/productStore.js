import { create } from 'zustand';
import { productsAPI, groceryAPI } from '../services/api';
import { scheduleExpiryNotifications, scheduleLowQuantityNotification } from '../services/notifications';

const useProductStore = create((set, get) => ({
  products: [],
  groceryItems: [],
  isLoading: false,
  error: null,

  fetchProducts: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsAPI.list(params);
      set({ products: response.data, isLoading: false });
      await scheduleExpiryNotifications(response.data);
    } catch (error) {
      set({ isLoading: false, error: error.response?.data?.detail || 'Помилка завантаження' });
    }
  },

  addProduct: async (data) => {
    try {
      const response = await productsAPI.create(data);
      set((state) => ({ products: [response.data, ...state.products] }));
      return { success: true, product: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Помилка додавання' };
    }
  },

  updateProduct: async (id, data) => {
    try {
      const response = await productsAPI.update(id, data);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? response.data : p)),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Помилка оновлення' };
    }
  },

  deleteProduct: async (id) => {
    try {
      await productsAPI.delete(id);
      set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Помилка видалення' };
    }
  },

  consumeProduct: async (id, quantity) => {
    try {
      const response = await productsAPI.consume(id, quantity);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? response.data : p)),
      }));
      await scheduleLowQuantityNotification(response.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Помилка' };
    }
  },

  fetchGrocery: async () => {
    try {
      const response = await groceryAPI.list();
      set({ groceryItems: response.data });
    } catch {}
  },

  addGroceryItem: async (data) => {
    try {
      const response = await groceryAPI.create(data);
      set((state) => ({ groceryItems: [response.data, ...state.groceryItems] }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Помилка' };
    }
  },

  toggleGroceryItem: async (id, isPurchased) => {
    try {
      const response = await groceryAPI.update(id, { is_purchased: isPurchased });
      set((state) => ({
        groceryItems: state.groceryItems.map((i) => (i.id === id ? response.data : i)),
      }));
    } catch {}
  },

  deleteGroceryItem: async (id) => {
    try {
      await groceryAPI.delete(id);
      set((state) => ({ groceryItems: state.groceryItems.filter((i) => i.id !== id) }));
    } catch {}
  },

  addFromFridge: async (productIds) => {
    try {
      const response = await groceryAPI.addFromFridge(productIds);
      set((state) => ({ groceryItems: [...response.data, ...state.groceryItems] }));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Помилка' };
    }
  },
}));

export default useProductStore;
