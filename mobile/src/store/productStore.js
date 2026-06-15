import { create } from 'zustand';
import { productsAPI, groceryAPI } from '../services/api';
import { scheduleExpiryNotifications, scheduleLowQuantityNotification } from '../services/notifications';
import * as db from '../services/db';
import * as syncQueue from '../services/syncQueue';
import useCategoryStore from './categoryStore';

function generateTempId() {
  return 'tmp_' + 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

const useProductStore = create((set, get) => ({
  products: [],
  consumedProducts: [],
  groceryItems: [],
  isLoading: false,
  error: null,
  isOnline: true,
  pendingCount: 0,

  fetchProducts: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsAPI.list(params);
      set({ products: response.data, isLoading: false });
      await db.write(db.KEYS.PRODUCTS, response.data);
      await scheduleExpiryNotifications(response.data);
    } catch (error) {
      if (get().products.length === 0) {
        const cached = await db.read(db.KEYS.PRODUCTS);
        if (cached) {
          set({ products: cached, isLoading: false });
          return;
        }
      }
      set({ isLoading: false, error: error.response?.data?.detail || 'Помилка завантаження' });
    }
  },

  fetchConsumedProducts: async (limit = 100) => {
    try {
      const response = await productsAPI.getConsumed(limit);
      set({ consumedProducts: response.data });
      await db.write(db.KEYS.CONSUMED, response.data);
    } catch (error) {
      if (get().consumedProducts.length === 0) {
        const cached = await db.read(db.KEYS.CONSUMED);
        if (cached) {
          set({ consumedProducts: cached });
          return;
        }
      }
      set({ error: error.response?.data?.detail || 'Помилка завантаження історії' });
    }
  },

  addProduct: async (data) => {
    const tempId = generateTempId();
    const categories = useCategoryStore.getState().categories;
    const category_obj = categories.find(c => c.id === data.category_id);
    const optimistic = {
      id: tempId,
      ...data,
      quantity: parseFloat(data.quantity),
      category_obj,
    };

    set((state) => ({ products: [optimistic, ...state.products] }));
    await db.write(db.KEYS.PRODUCTS, get().products);

    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'product',
        operation: 'create',
        tempId,
        serverId: null,
        payload: data,
      });
      set(state => ({ pendingCount: state.pendingCount + 1 }));
      return { success: true, product: optimistic };
    }

    try {
      const response = await productsAPI.create(data);
      get().patchTempId(tempId, response.data.id);
      return { success: true, product: response.data };
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'product',
          operation: 'create',
          tempId,
          serverId: null,
          payload: data,
        });
        set(state => ({ pendingCount: state.pendingCount + 1 }));
        return { success: true, product: optimistic };
      }
      set((state) => ({ products: state.products.filter((p) => p.id !== tempId) }));
      await db.write(db.KEYS.PRODUCTS, get().products);
      return { success: false, error: networkError.response?.data?.detail || 'Помилка додавання' };
    }
  },

  updateProduct: async (id, data) => {
    const old = get().products.find(p => p.id === id);
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
    await db.write(db.KEYS.PRODUCTS, get().products);

    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'product',
        operation: 'update',
        tempId: null,
        serverId: id,
        payload: data,
      });
      set(state => ({ pendingCount: state.pendingCount + 1 }));
      return { success: true };
    }

    try {
      const response = await productsAPI.update(id, data);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? response.data : p)),
      }));
      await db.write(db.KEYS.PRODUCTS, get().products);
      return { success: true };
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'product',
          operation: 'update',
          tempId: null,
          serverId: id,
          payload: data,
        });
        set(state => ({ pendingCount: state.pendingCount + 1 }));
        return { success: true };
      }
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? old : p)),
      }));
      await db.write(db.KEYS.PRODUCTS, get().products);
      return { success: false, error: networkError.response?.data?.detail || 'Помилка оновлення' };
    }
  },

  deleteProduct: async (id) => {
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    await db.write(db.KEYS.PRODUCTS, get().products);

    if (String(id).startsWith('tmp_')) {
      await syncQueue.removeByTempId(id);
      return { success: true };
    }

    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'product',
        operation: 'delete',
        tempId: null,
        serverId: id,
        payload: { id },
      });
      set(state => ({ pendingCount: state.pendingCount + 1 }));
      return { success: true };
    }

    try {
      await productsAPI.delete(id);
      return { success: true };
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'product',
          operation: 'delete',
          tempId: null,
          serverId: id,
          payload: { id },
        });
        set(state => ({ pendingCount: state.pendingCount + 1 }));
        return { success: true };
      }
      return { success: false, error: networkError.response?.data?.detail || 'Помилка видалення' };
    }
  },

  consumeProduct: async (id, quantity) => {
    const product = get().products.find(p => p.id === id);
    const newQuantity = (product?.quantity || 0) - quantity;

    if (newQuantity <= 0) {
      set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    } else {
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, quantity: newQuantity } : p)),
      }));
    }
    await db.write(db.KEYS.PRODUCTS, get().products);

    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'product',
        operation: 'consume',
        tempId: null,
        serverId: id,
        payload: { quantity },
      });
      set(state => ({ pendingCount: state.pendingCount + 1 }));
      return { success: true };
    }

    try {
      const response = await productsAPI.consume(id, quantity);
      set((state) => ({
        products: response.data.quantity > 0
          ? state.products.map((p) => (p.id === id ? response.data : p))
          : state.products.filter((p) => p.id !== id),
      }));
      await db.write(db.KEYS.PRODUCTS, get().products);
      get().fetchConsumedProducts();
      await scheduleLowQuantityNotification(response.data);
      return { success: true };
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'product',
          operation: 'consume',
          tempId: null,
          serverId: id,
          payload: { quantity },
        });
        set(state => ({ pendingCount: state.pendingCount + 1 }));
        return { success: true };
      }
      return { success: false, error: networkError.response?.data?.detail || 'Помилка' };
    }
  },

  fetchGrocery: async () => {
    try {
      const response = await groceryAPI.list();
      set({ groceryItems: response.data });
      await db.write(db.KEYS.GROCERY, response.data);
    } catch (error) {
      if (get().groceryItems.length === 0) {
        const cached = await db.read(db.KEYS.GROCERY);
        if (cached) {
          set({ groceryItems: cached });
        }
      }
    }
  },

  addGroceryItem: async (data) => {
    const tempId = generateTempId();
    const optimistic = { id: tempId, ...data };

    set((state) => ({ groceryItems: [optimistic, ...state.groceryItems] }));
    await db.write(db.KEYS.GROCERY, get().groceryItems);

    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'grocery',
        operation: 'create',
        tempId,
        serverId: null,
        payload: data,
      });
      set(state => ({ pendingCount: state.pendingCount + 1 }));
      return { success: true };
    }

    try {
      const response = await groceryAPI.create(data);
      get().patchTempId(tempId, response.data.id);
      return { success: true };
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'grocery',
          operation: 'create',
          tempId,
          serverId: null,
          payload: data,
        });
        set(state => ({ pendingCount: state.pendingCount + 1 }));
        return { success: true };
      }
      set((state) => ({ groceryItems: state.groceryItems.filter((i) => i.id !== tempId) }));
      await db.write(db.KEYS.GROCERY, get().groceryItems);
      return { success: false, error: networkError.response?.data?.detail || 'Помилка' };
    }
  },

  toggleGroceryItem: async (id, isPurchased) => {
    set((state) => ({
      groceryItems: state.groceryItems.map((i) => (i.id === id ? { ...i, is_purchased: isPurchased } : i)),
    }));
    await db.write(db.KEYS.GROCERY, get().groceryItems);

    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'grocery',
        operation: 'toggle',
        tempId: null,
        serverId: id,
        payload: { is_purchased: isPurchased },
      });
      set(state => ({ pendingCount: state.pendingCount + 1 }));
      return;
    }

    try {
      const response = await groceryAPI.update(id, { is_purchased: isPurchased });
      set((state) => ({
        groceryItems: state.groceryItems.map((i) => (i.id === id ? response.data : i)),
      }));
      await db.write(db.KEYS.GROCERY, get().groceryItems);
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'grocery',
          operation: 'toggle',
          tempId: null,
          serverId: id,
          payload: { is_purchased: isPurchased },
        });
        set(state => ({ pendingCount: state.pendingCount + 1 }));
      }
    }
  },

  deleteGroceryItem: async (id) => {
    set((state) => ({ groceryItems: state.groceryItems.filter((i) => i.id !== id) }));
    await db.write(db.KEYS.GROCERY, get().groceryItems);

    if (String(id).startsWith('tmp_')) {
      await syncQueue.removeByTempId(id);
      return;
    }

    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'grocery',
        operation: 'delete',
        tempId: null,
        serverId: id,
        payload: { id },
      });
      set(state => ({ pendingCount: state.pendingCount + 1 }));
      return;
    }

    try {
      await groceryAPI.delete(id);
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'grocery',
          operation: 'delete',
          tempId: null,
          serverId: id,
          payload: { id },
        });
        set(state => ({ pendingCount: state.pendingCount + 1 }));
      }
    }
  },

  addFromFridge: async (productIds) => {
    const products = get().products;
    const tempItems = productIds.map((pid) => {
      const p = products.find((pr) => pr.id === pid);
      const tempId = generateTempId();
      return {
        id: tempId,
        name: p ? p.name : `Product ${pid}`,
        is_purchased: false,
        quantity: 1,
        unit: 'шт',
      };
    });

    set((state) => ({ groceryItems: [...tempItems, ...state.groceryItems] }));
    await db.write(db.KEYS.GROCERY, get().groceryItems);

    if (!get().isOnline) {
      await syncQueue.enqueue({
        entity: 'grocery',
        operation: 'add_from_fridge',
        tempId: null,
        serverId: null,
        payload: { product_ids: productIds },
        tempIds: tempItems.map((t) => t.id),
      });
      set(state => ({ pendingCount: state.pendingCount + 1 }));
      return { success: true };
    }

    try {
      const response = await groceryAPI.addFromFridge(productIds);
      set((state) => ({
        groceryItems: [
          ...response.data,
          ...state.groceryItems.filter((i) => !tempItems.some((t) => t.id === i.id)),
        ],
      }));
      await db.write(db.KEYS.GROCERY, get().groceryItems);
      return { success: true };
    } catch (networkError) {
      if (!networkError.response) {
        await syncQueue.enqueue({
          entity: 'grocery',
          operation: 'add_from_fridge',
          tempId: null,
          serverId: null,
          payload: { product_ids: productIds },
          tempIds: tempItems.map((t) => t.id),
        });
        set(state => ({ pendingCount: state.pendingCount + 1 }));
        return { success: true };
      }
      set((state) => ({
        groceryItems: state.groceryItems.filter((i) => !tempItems.some((t) => t.id === i.id)),
      }));
      await db.write(db.KEYS.GROCERY, get().groceryItems);
      return { success: false, error: 'Помилка' };
    }
  },

  patchTempId: (entity, tempId, realId) => {
    if (entity === 'product') {
      set((state) => ({
        products: state.products.map((p) =>
          p.id === tempId ? { ...p, id: realId } : p
        ),
      }));
      const products = get().products;
      const realItem = products.find((p) => p.id === realId);
      if (realItem) {
        db.replaceById(db.KEYS.PRODUCTS, tempId, realItem).catch(() => {});
      }
    } else if (entity === 'grocery') {
      set((state) => ({
        groceryItems: state.groceryItems.map((i) =>
          i.id === tempId ? { ...i, id: realId } : i
        ),
      }));
      const items = get().groceryItems;
      const realItem = items.find((i) => i.id === realId);
      if (realItem) {
        db.replaceById(db.KEYS.GROCERY, tempId, realItem).catch(() => {});
      }
    }
  },

  setOnline: (isOnline) => {
    set({ isOnline });
  },
}));

export default useProductStore;
