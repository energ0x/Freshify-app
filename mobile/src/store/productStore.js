import { create } from 'zustand';
import { productsAPI, groceryAPI, categoriesAPI } from '../services/api';
import { scheduleExpiryNotifications, scheduleLowQuantityNotification } from '../services/notifications';
import {
  getLocalProducts,
  saveLocalProducts,
  getLocalConsumedProducts,
  saveLocalConsumedProducts,
  getLocalGroceryItems,
  saveLocalGroceryItems,
  addToOfflineQueue,
  getOfflineQueue,
  removeActionFromQueue,
} from '../services/localDB';
import useCategoryStore from './categoryStore';

const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const useProductStore = create((set, get) => ({
  products: [],
  consumedProducts: [],
  groceryItems: [],
  isLoading: false,
  error: null,
  isSyncing: false,

  fetchProducts: async (params = {}) => {
    set({ isLoading: true, error: null });
    
    // 1. Отримати з локальної БД відразу
    const localProducts = await getLocalProducts();
    if (localProducts) {
      set({ products: localProducts, isLoading: false });
    }

    // 2. Спробувати завантажити з API
    try {
      const response = await productsAPI.list(params);
      set({ products: response.data, isLoading: false });
      await saveLocalProducts(response.data);
      await scheduleExpiryNotifications(response.data);
    } catch (error) {
      console.warn('Офлайн режим для продуктів', error);
      if (!localProducts) {
         set({ isLoading: false, error: 'Не вдалося завантажити дані. Перевірте з\'єднання.' });
      } else {
         set({ isLoading: false });
      }
    }
  },

  fetchConsumedProducts: async (limit = 100) => {
    const localConsumed = await getLocalConsumedProducts();
    if (localConsumed) {
      set({ consumedProducts: localConsumed });
    }

    try {
      const response = await productsAPI.getConsumed(limit);
      set({ consumedProducts: response.data });
      await saveLocalConsumedProducts(response.data);
    } catch (error) {
      console.warn('Офлайн режим для історії', error);
    }
  },

  addProduct: async (data) => {
    // Оптимістичне оновлення
    const tempProduct = { ...data, id: generateTempId(), isTemp: true };
    set((state) => {
      const updatedProducts = [tempProduct, ...state.products];
      saveLocalProducts(updatedProducts);
      return { products: updatedProducts };
    });

    try {
      const response = await productsAPI.create(data);
      // Замінити тимчасовий продукт на реальний з сервера
      set((state) => {
        const updatedProducts = state.products.map(p => p.id === tempProduct.id ? response.data : p);
        saveLocalProducts(updatedProducts);
        return { products: updatedProducts };
      });
      return { success: true, product: response.data };
    } catch (error) {
       // Додати в чергу офлайн
       await addToOfflineQueue({ type: 'ADD_PRODUCT', payload: { data, tempId: tempProduct.id } });
       return { success: true, product: tempProduct, offline: true };
    }
  },

  updateProduct: async (id, data) => {
    const originalProduct = get().products.find(p => p.id === id);
    
    // Оптимістичне оновлення
    set((state) => {
      const updatedProducts = state.products.map((p) => (p.id === id ? { ...p, ...data } : p));
      saveLocalProducts(updatedProducts);
      return { products: updatedProducts };
    });

    if (id.toString().startsWith('temp_')) {
      // Якщо це тимчасовий продукт (офлайн), просто оновити його в черзі або чекати синхронізації
      await addToOfflineQueue({ type: 'UPDATE_PRODUCT', payload: { id, data } });
      return { success: true, offline: true };
    }

    try {
      const response = await productsAPI.update(id, data);
      set((state) => {
        const updatedProducts = state.products.map((p) => (p.id === id ? response.data : p));
        saveLocalProducts(updatedProducts);
        return { products: updatedProducts };
      });
      return { success: true };
    } catch (error) {
      await addToOfflineQueue({ type: 'UPDATE_PRODUCT', payload: { id, data } });
      return { success: true, offline: true };
    }
  },

  deleteProduct: async (id) => {
    const originalProducts = get().products;
    
    // Оптимістичне видалення
    set((state) => {
      const updatedProducts = state.products.filter((p) => p.id !== id);
      saveLocalProducts(updatedProducts);
      return { products: updatedProducts };
    });

    if (id.toString().startsWith('temp_')) {
       // Продукт був створений офлайн і ще не на сервері
       // TODO: Прибрати з черги ADD_PRODUCT для цього ID, якщо це можливо, або додати DELETE в чергу
       await addToOfflineQueue({ type: 'DELETE_PRODUCT', payload: { id } });
       return { success: true, offline: true };
    }

    try {
      await productsAPI.delete(id);
      return { success: true };
    } catch (error) {
      await addToOfflineQueue({ type: 'DELETE_PRODUCT', payload: { id } });
      return { success: true, offline: true };
    }
  },

  consumeProduct: async (id, quantity) => {
     // TODO: Implement optimistic UI for consume
    try {
      const response = await productsAPI.consume(id, quantity);
      set((state) => {
        const updatedProducts = response.data.quantity > 0
          ? state.products.map((p) => (p.id === id ? response.data : p))
          : state.products.filter((p) => p.id !== id);
        saveLocalProducts(updatedProducts);
        return { products: updatedProducts };
      });
      get().fetchConsumedProducts();
      await scheduleLowQuantityNotification(response.data);
      return { success: true };
    } catch (error) {
      await addToOfflineQueue({ type: 'CONSUME_PRODUCT', payload: { id, quantity } });
      // Невеликий хак: оптимістично зменшити кількість локально, щоб користувач бачив результат
      set((state) => {
         const product = state.products.find(p => p.id === id);
         if (product) {
             const newQuantity = product.quantity - quantity;
             const updatedProducts = newQuantity > 0 
                ? state.products.map((p) => (p.id === id ? { ...p, quantity: newQuantity } : p))
                : state.products.filter((p) => p.id !== id);
             saveLocalProducts(updatedProducts);
             return { products: updatedProducts };
         }
         return state;
      });
      return { success: true, offline: true };
    }
  },

  fetchGrocery: async () => {
    const localGrocery = await getLocalGroceryItems();
    if (localGrocery) {
      set({ groceryItems: localGrocery });
    }

    try {
      const response = await groceryAPI.list();
      set({ groceryItems: response.data });
      await saveLocalGroceryItems(response.data);
    } catch (error) {
       console.warn('Офлайн режим для покупок', error);
    }
  },

  addGroceryItem: async (data) => {
    const tempItem = { ...data, id: generateTempId(), isTemp: true, is_purchased: false };
    
    set((state) => {
      const updatedGrocery = [tempItem, ...state.groceryItems];
      saveLocalGroceryItems(updatedGrocery);
      return { groceryItems: updatedGrocery };
    });

    try {
      const response = await groceryAPI.create(data);
      set((state) => {
        const updatedGrocery = state.groceryItems.map(i => i.id === tempItem.id ? response.data : i);
        saveLocalGroceryItems(updatedGrocery);
        return { groceryItems: updatedGrocery };
      });
      return { success: true };
    } catch (error) {
      await addToOfflineQueue({ type: 'ADD_GROCERY_ITEM', payload: { data, tempId: tempItem.id } });
      return { success: true, offline: true };
    }
  },

  toggleGroceryItem: async (id, isPurchased) => {
    set((state) => {
      const updatedGrocery = state.groceryItems.map((i) => (i.id === id ? { ...i, is_purchased: isPurchased } : i));
      saveLocalGroceryItems(updatedGrocery);
      return { groceryItems: updatedGrocery };
    });

    if (id.toString().startsWith('temp_')) {
      await addToOfflineQueue({ type: 'TOGGLE_GROCERY_ITEM', payload: { id, isPurchased } });
      return;
    }

    try {
      const response = await groceryAPI.update(id, { is_purchased: isPurchased });
      set((state) => {
         const updatedGrocery = state.groceryItems.map((i) => (i.id === id ? response.data : i));
         saveLocalGroceryItems(updatedGrocery);
         return { groceryItems: updatedGrocery };
      });
    } catch (error) {
      await addToOfflineQueue({ type: 'TOGGLE_GROCERY_ITEM', payload: { id, isPurchased } });
    }
  },

  deleteGroceryItem: async (id) => {
    set((state) => {
      const updatedGrocery = state.groceryItems.filter((i) => i.id !== id);
      saveLocalGroceryItems(updatedGrocery);
      return { groceryItems: updatedGrocery };
    });

    if (id.toString().startsWith('temp_')) {
       await addToOfflineQueue({ type: 'DELETE_GROCERY_ITEM', payload: { id } });
       return;
    }

    try {
      await groceryAPI.delete(id);
    } catch (error) {
      await addToOfflineQueue({ type: 'DELETE_GROCERY_ITEM', payload: { id } });
    }
  },

  addFromFridge: async (productIds) => {
    // Тут складніше зробити повністю оптимістично без створення об'єктів
    try {
      const response = await groceryAPI.addFromFridge(productIds);
      set((state) => {
         const updatedGrocery = [...response.data, ...state.groceryItems];
         saveLocalGroceryItems(updatedGrocery);
         return { groceryItems: updatedGrocery };
      });
      return { success: true };
    } catch (error) {
      await addToOfflineQueue({ type: 'ADD_FROM_FRIDGE', payload: { productIds } });
      // Оптимістичне створення приблизних записів
      const { products } = get();
      const newItems = productIds.map(id => {
         const product = products.find(p => p.id === id);
         return {
            id: generateTempId(),
            name: product ? product.name : 'Невідомий продукт',
            quantity: 1, // Default
            unit: product ? product.unit : 'шт',
            is_purchased: false,
            isTemp: true
         };
      });
      set((state) => {
         const updatedGrocery = [...newItems, ...state.groceryItems];
         saveLocalGroceryItems(updatedGrocery);
         return { groceryItems: updatedGrocery };
      });
      
      return { success: true, offline: true };
    }
  },

  syncOfflineQueue: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    const queue = await getOfflineQueue();
    if (!queue || queue.length === 0) {
      set({ isSyncing: false });
      return;
    }

    console.log(`[Sync] Розпочато синхронізацію: ${queue.length} елементів у черзі.`);
    
    // Map of tempIds to realIds to fix chained offline operations
    const idMap = {};

    for (const action of queue) {
      try {
        let currentPayload = { ...action.payload };
        
        // Resolve temp IDs in payload if they were created in a previous step
        if (currentPayload.id && idMap[currentPayload.id]) {
            currentPayload.id = idMap[currentPayload.id];
        }

        switch (action.type) {
          // Product actions
          case 'ADD_PRODUCT': {
            const res = await productsAPI.create(currentPayload.data);
            idMap[currentPayload.tempId] = res.data.id;
            break;
          }
          case 'UPDATE_PRODUCT':
             if (currentPayload.id && !currentPayload.id.toString().startsWith('temp_')) {
                 await productsAPI.update(currentPayload.id, currentPayload.data);
             }
             break;
          case 'DELETE_PRODUCT':
             if (currentPayload.id && !currentPayload.id.toString().startsWith('temp_')) {
                 await productsAPI.delete(currentPayload.id);
             }
             break;
          case 'CONSUME_PRODUCT':
             if (currentPayload.id && !currentPayload.id.toString().startsWith('temp_')) {
                 await productsAPI.consume(currentPayload.id, currentPayload.quantity);
             }
             break;
          
          // Grocery actions
          case 'ADD_GROCERY_ITEM': {
             const res = await groceryAPI.create(currentPayload.data);
             idMap[currentPayload.tempId] = res.data.id;
             break;
          }
          case 'TOGGLE_GROCERY_ITEM':
             if (currentPayload.id && !currentPayload.id.toString().startsWith('temp_')) {
                await groceryAPI.update(currentPayload.id, { is_purchased: currentPayload.isPurchased });
             }
             break;
          case 'DELETE_GROCERY_ITEM':
             if (currentPayload.id && !currentPayload.id.toString().startsWith('temp_')) {
                 await groceryAPI.delete(currentPayload.id);
             }
             break;
          case 'ADD_FROM_FRIDGE':
             await groceryAPI.addFromFridge(currentPayload.productIds);
             break;

          // Category actions
          case 'ADD_CATEGORY': {
            const res = await categoriesAPI.create(currentPayload.data);
            idMap[currentPayload.tempId] = res.data.id;
            break;
          }
          case 'UPDATE_CATEGORY':
            if (currentPayload.id && !currentPayload.id.toString().startsWith('temp_')) {
                await categoriesAPI.update(currentPayload.id, currentPayload.data);
            }
            break;
          case 'DELETE_CATEGORY':
            if (currentPayload.id && !currentPayload.id.toString().startsWith('temp_')) {
                await categoriesAPI.delete(currentPayload.id);
            }
            break;
        }
        
        // Успішно виконано, видаляємо з черги
        await removeActionFromQueue(action.id);
      } catch (err) {
        console.error(`[Sync] Помилка виконання дії: ${action.type}`, err);
        // Якщо помилка, припиняємо синхронізацію, щоб зберегти порядок і не зламати дані
        break; 
      }
    }

    set({ isSyncing: false });
    // Після синхронізації оновити всі дані
    get().fetchProducts();
    get().fetchGrocery();
    get().fetchConsumedProducts();
    useCategoryStore.getState().fetchCategories();
  }
}));

export default useProductStore;