/**
 * @file productStore.js
 * @description Zustand-based state management store for products, consumed history, and grocery items.
 * Implements offline-first features including: optimistic UI updates, local cache persistence,
 * synchronization queueing for CRUD operations when network is unavailable, and push notification scheduling.
 */

import { create } from 'zustand';
import { productsAPI, groceryAPI } from '../services/api';
import { scheduleExpiryNotifications, scheduleLowQuantityNotification } from '../services/notifications';
import * as db from '../services/db';
import * as syncQueue from '../services/syncQueue';
import useCategoryStore from './categoryStore';

/**
 * Generates a random temporary ID prefixed with 'tmp_' for optimistic UI updates.
 * Used during offline operations to represent items that have not yet been stored in the remote DB.
 * 
 * @returns {string} The generated temporary string ID.
 */
function generateTempId() {
  return 'tmp_' + 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

/**
 * Zustand product store configuration.
 * Manages active products, consumed history, grocery items, offline status, and queue status.
 */
const useProductStore = create((set, get) => ({
  // State variables
  products: [],              // Active products list
  consumedProducts: [],      // History list of consumed/expired products
  groceryItems: [],          // Shopping checklist items
  isLoading: false,          // Global loader state for product-related API transactions
  error: null,               // Holds last error message string if any
  isOnline: true,            // Tracks device network status
  pendingCount: 0,           // Total amount of unsynced offline operations in queue

  /**
   * Fetches active products from remote server.
   * Caches response in local DB and schedules push notifications for products nearing expiration.
   * Falls back to local database cache if network fails.
   * 
   * @param {object} params - Optional search/filter parameters.
   */
  fetchProducts: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsAPI.list(params);
      set({ products: response.data, isLoading: false });
      // Cache the loaded products locally.
      await db.write(db.KEYS.PRODUCTS, response.data);
      // Trigger native local notifications scheduling.
      await scheduleExpiryNotifications(response.data);
    } catch (error) {
      // Fallback: If memory state is empty, attempt reading from SQLite/AsyncStorage cache.
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

  /**
   * Fetches history of consumed products.
   * Automatically falls back to local DB cache if the request fails.
   * 
   * @param {number} limit - Maximum number of items to retrieve.
   */
  fetchConsumedProducts: async (limit = 100) => {
    try {
      const response = await productsAPI.getConsumed(limit);
      set({ consumedProducts: response.data });
      // Cache history details locally.
      await db.write(db.KEYS.CONSUMED, response.data);
    } catch (error) {
      // Fallback if empty and request fails.
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

  /**
   * Adds a new product.
   * Optimistically updates UI immediately.
   * If offline, queues the create action. If online, calls API and updates ID.
   * 
   * @param {object} data - Product creation payload.
   * @returns {Promise<object>} Status object indicating success/error and the new product details.
   */
  addProduct: async (data) => {
    const tempId = generateTempId();
    const categories = useCategoryStore.getState().categories;
    const category_obj = categories.find(c => c.id === data.category_id);
    
    // Construct optimistic item containing temp ID
    const optimistic = {
      id: tempId,
      ...data,
      quantity: parseFloat(data.quantity),
      category_obj,
    };

    // Prepend optimistic product to screen state and persist current state to cache
    set((state) => ({ products: [optimistic, ...state.products] }));
    await db.write(db.KEYS.PRODUCTS, get().products);

    // If device is offline, enqueue action to local sync queue and increment pending count
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
      // Replace temporary ID with database ID
      get().patchTempId(tempId, response.data.id);
      return { success: true, product: response.data };
    } catch (networkError) {
      // If error is network-related (no response), fallback to offline sync queue.
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
      // Revert state if the API rejected the creation with validation error
      set((state) => ({ products: state.products.filter((p) => p.id !== tempId) }));
      await db.write(db.KEYS.PRODUCTS, get().products);
      return { success: false, error: networkError.response?.data?.detail || 'Помилка додавання' };
    }
  },

  /**
   * Updates product fields.
   * Optimistically updates UI immediately and saves to cache.
   * 
   * @param {string|number} id - Product ID (temp or server).
   * @param {object} data - Fields to update.
   * @returns {Promise<object>} Status object indicating success.
   */
  updateProduct: async (id, data) => {
    const old = get().products.find(p => p.id === id);
    
    // Apply changes locally
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
    await db.write(db.KEYS.PRODUCTS, get().products);

    // Queue action if offline
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
      // Overwrite with actual response from server
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? response.data : p)),
      }));
      await db.write(db.KEYS.PRODUCTS, get().products);
      return { success: true };
    } catch (networkError) {
      // Network loss fallback
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
      // Revert to original data on API error
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? old : p)),
      }));
      await db.write(db.KEYS.PRODUCTS, get().products);
      return { success: false, error: networkError.response?.data?.detail || 'Помилка оновлення' };
    }
  },

  /**
   * Deletes a product.
   * Optimistically removes it from screen.
   * If it's a temporary local product, deletes it from offline queue; otherwise synchronizes deletion.
   * 
   * @param {string|number} id - Product ID to remove.
   * @returns {Promise<object>} Status object.
   */
  deleteProduct: async (id) => {
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    await db.write(db.KEYS.PRODUCTS, get().products);

    // If product is local only (unsynced), remove its creation from sync queue directly
    if (String(id).startsWith('tmp_')) {
      await syncQueue.removeByTempId(id);
      return { success: true };
    }

    // Queue API deletion if offline
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

  /**
   * Consumes a specific quantity of a product.
   * If the remaining quantity drops to or below 0, the product is completely removed.
   * Otherwise, updates remaining quantity.
   * 
   * @param {string|number} id - Product ID to consume.
   * @param {number} quantity - Quantity amount consumed.
   * @returns {Promise<object>} Status object.
   */
  consumeProduct: async (id, quantity) => {
    const product = get().products.find(p => p.id === id);
    const newQuantity = (product?.quantity || 0) - quantity;

    // Apply optimistic updates locally
    if (newQuantity <= 0) {
      set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    } else {
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, quantity: newQuantity } : p)),
      }));
    }
    await db.write(db.KEYS.PRODUCTS, get().products);

    // Enqueue if offline
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
      // Override state with server calculations
      set((state) => ({
        products: response.data.quantity > 0
          ? state.products.map((p) => (p.id === id ? response.data : p))
          : state.products.filter((p) => p.id !== id),
      }));
      await db.write(db.KEYS.PRODUCTS, get().products);
      // Fetch consumption history to update UI screens
      get().fetchConsumedProducts();
      // Check quantity thresholds to trigger low quantity push notification
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

  /**
   * Fetches grocery items checklist.
   * Falls back to local db cache on error.
   */
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

  /**
   * Adds a new item to the grocery shopping list.
   * Optimistically prepends the item to the current state.
   * 
   * @param {object} data - Grocery item fields.
   * @returns {Promise<object>} Status object.
   */
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
      // Revert UI changes on API error
      set((state) => ({ groceryItems: state.groceryItems.filter((i) => i.id !== tempId) }));
      await db.write(db.KEYS.GROCERY, get().groceryItems);
      return { success: false, error: networkError.response?.data?.detail || 'Помилка' };
    }
  },

  /**
   * Toggles the "purchased" status checkbox of a grocery shopping item.
   * 
   * @param {string|number} id - Grocery item target.
   * @param {boolean} isPurchased - Target purchase checkbox state.
   */
  toggleGroceryItem: async (id, isPurchased) => {
    // Optimistic toggle
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

  /**
   * Deletes a grocery checklist item.
   * 
   * @param {string|number} id - Grocery item ID.
   */
  deleteGroceryItem: async (id) => {
    // Optimistic removal
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

  /**
   * Batch creates grocery items from a list of products expiring or running low in the fridge.
   * 
   * @param {Array<string|number>} productIds - Array of product IDs to copy to grocery list.
   * @returns {Promise<object>} Status object.
   */
  addFromFridge: async (productIds) => {
    const products = get().products;
    // Build temporary objects for optimistic rendering.
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
      // Replace temporary entries with actual server responses
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
      // Revert items list on API error
      set((state) => ({
        groceryItems: state.groceryItems.filter((i) => !tempItems.some((t) => t.id === i.id)),
      }));
      await db.write(db.KEYS.GROCERY, get().groceryItems);
      return { success: false, error: 'Помилка' };
    }
  },

  /**
   * Swaps a temporary client ID with a permanent DB server ID.
   * Updates state store arrays and corresponding local database caches.
   * 
   * @param {'product'|'grocery'} entity - Target entity type.
   * @param {string} tempId - Current temporary client ID.
   * @param {string|number} realId - Assigned database primary key.
   */
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

  /**
   * Sets the online network status.
   * 
   * @param {boolean} isOnline - Network state.
   */
  setOnline: (isOnline) => {
    set({ isOnline });
  },
}));

export default useProductStore;
