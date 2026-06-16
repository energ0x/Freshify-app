/**
 * @file syncService.js
 * @description Synchronization service responsible for draining the offline queue.
 * Orders transactions by entity dependency (e.g., categories must be created before products referencing them),
 * communicates with the remote REST API, updates temporary client IDs with database primary keys, and patches
 * subsequent operations in the queue that depend on the newly created records.
 */

import * as syncQueue from './syncQueue';
import { productsAPI, groceryAPI, categoriesAPI } from './api';

// Lock variable to prevent concurrent queue drain executions.
let isDraining = false;

/**
 * Main queue processing loop.
 * Processes actions in the offline queue, resolving dependencies and communicating with the API.
 * 
 * @param {object} stores - Object containing product and category stores.
 * @param {object} stores.product - Product Zustand store instance.
 * @param {object} stores.category - Category Zustand store instance.
 */
export const drainQueue = async (stores) => {
  if (isDraining) return;
  isDraining = true;

  try {
    // Small timeout to allow any pending AsyncStorage operations to fully complete/persist.
    await new Promise((r) => setTimeout(r, 80));

    /**
     * Determines sorting priorities for offline actions.
     * Ensures dependent creations (e.g. Category -> Product) execute in order.
     * Lower values execute first.
     * 
     * @param {object} op - A queue operation element.
     * @returns {number} Numeric priority weight.
     */
    const priorityOf = (op) => {
      const map = {
        'category:create': 0,
        'category:update': 5,
        'category:restore_defaults': 6,
        'category:delete': 100, // Deletions of categories are delayed till the end

        'product:create': 10,
        'product:update': 15,
        // Consuming must occur AFTER grocery:add_from_fridge moves to avoid premature subtraction
        'product:consume': 21,
        'product:delete': 90,

        // Adding to grocery list from fridge relies on the product existing first
        'grocery:add_from_fridge': 20,
        'grocery:create': 30,
        'grocery:toggle': 31,
        'grocery:delete': 80,
      };

      const key = `${op.entity}:${op.operation}`;
      return map[key] !== undefined ? map[key] : 50; // Default priority for unmapped entries
    };
    
    const productState = stores.product.getState();
    const categoryState = stores.category.getState();

    // Loop through operations one by one. Re-fetching queue on each cycle avoids missing newly appended items.
    let emptyRetries = 0;
    while (true) {
      let ops = await syncQueue.getAll();
      
      // If queue is empty, attempt a few retries with delay to account for filesystem write lags.
      if (!ops || ops.length === 0) {
        if (emptyRetries < 3) {
          emptyRetries++;
          await new Promise((r) => setTimeout(r, 120));
          ops = await syncQueue.getAll();
          if (!ops || ops.length === 0) continue;
        }
        break;
      }

      // Sort queue by priority first, then by creation date.
      ops.sort((a, b) => {
        const pa = priorityOf(a);
        const pb = priorityOf(b);
        if (pa < pb) return -1;
        if (pa > pb) return 1;
        
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return 0;
      });

      // Target the highest-priority operation first.
      const op = ops[0];
      try {
        let response = null;

        // Route operation based on entity and type.
        if (op.entity === 'product') {
          if (op.operation === 'create') {
            response = await productsAPI.create(op.payload);
            // Replace temporary client ID in state with real database ID
            productState.patchTempId('product', op.tempId, response.data.id);
            // Patch references to the temp ID in other operations down the queue
            await patchLaterOps(op.tempId, response.data.id);
          } else if (op.operation === 'update') {
            response = await productsAPI.update(op.serverId, op.payload);
          } else if (op.operation === 'delete') {
            await productsAPI.delete(op.serverId);
          } else if (op.operation === 'consume') {
            response = await productsAPI.consume(op.serverId, op.payload.quantity);
          }
        } else if (op.entity === 'grocery') {
          if (op.operation === 'create') {
            response = await groceryAPI.create(op.payload);
            productState.patchTempId('grocery', op.tempId, response.data.id);
            await patchLaterOps(op.tempId, response.data.id);
          } else if (op.operation === 'toggle') {
            response = await groceryAPI.update(op.serverId, op.payload);
          } else if (op.operation === 'delete') {
            await groceryAPI.delete(op.serverId);
          } else if (op.operation === 'add_from_fridge') {
            response = await groceryAPI.addFromFridge(op.payload.product_ids);
            // Match and swap temporary list item IDs with database IDs
            if (op.tempIds && response.data) {
              for (let j = 0; j < op.tempIds.length && j < response.data.length; j++) {
                productState.patchTempId('grocery', op.tempIds[j], response.data[j].id);
              }
            }
          }
        } else if (op.entity === 'category') {
          if (op.operation === 'create') {
            response = await categoriesAPI.create(op.payload);
            categoryState.patchTempId(op.tempId, response.data.id);
            await patchLaterOps(op.tempId, response.data.id);
          } else if (op.operation === 'update') {
            response = await categoriesAPI.update(op.serverId, op.payload);
          } else if (op.operation === 'delete') {
            await categoriesAPI.delete(op.serverId);
          } else if (op.operation === 'restore_defaults') {
            response = await categoriesAPI.restoreDefaults();
            categoryState.fetchCategories();
          }
        }

        // Operation succeeded: remove it from the queue.
        await syncQueue.dequeue(op.id);
      } catch (error) {
        if (error.response) {
          const status = error.response.status;
          if (status >= 400 && status < 500) {
            // Client error (400-499): Invalid/malformed data. Discard to prevent queue blockage.
            await syncQueue.dequeue(op.id);
          } else if (status >= 500) {
            // Server error (500-599): Retry up to 5 times.
            op.retryCount = (op.retryCount || 0) + 1;
            if (op.retryCount >= 5) {
              await syncQueue.dequeue(op.id);
            } else {
              await syncQueue.update(op);
            }
          }
        } else {
          // Network connection error: Increment retry count and preserve in queue.
          op.retryCount = (op.retryCount || 0) + 1;
          if (op.retryCount >= 5) {
            await syncQueue.dequeue(op.id);
          } else {
            await syncQueue.update(op);
          }
        }
      }
    }

    // Refresh store states after finishing synchronization.
    productState.fetchProducts().catch(() => {});
    productState.fetchGrocery().catch(() => {});
    productState.fetchConsumedProducts().catch(() => {});
    categoryState.fetchCategories().catch(() => {});

    // Update pendingCount state variable.
    const finalOps = await syncQueue.getAll();
    stores.product.setState({ pendingCount: finalOps.length });
  } finally {
    isDraining = false;
  }
};

/**
 * Scans remaining items in the queue and replaces occurrences of a temporary client ID
 * with the newly acquired server database ID.
 * Orders dependent operations to run immediately after their respective creation operation.
 * 
 * @param {string} tempId - The temporary client-side ID.
 * @param {string|number} realId - The database primary key.
 */
async function patchLaterOps(tempId, realId) {
  try {
    const ops = await syncQueue.getAll();
    if (!ops || ops.length === 0) return;

    const referencing = [];
    let changed = false;

    // Replace matching IDs in payload references and updates
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      // Skip the creation operation that uses this tempId
      if (op.tempId === tempId) continue;

      let refs = false;
      if (op.serverId === tempId) {
        op.serverId = realId;
        refs = true;
      }
      if (op.payload) {
        if (op.payload.category_id === tempId) {
          op.payload.category_id = realId;
          refs = true;
        }
        if (Array.isArray(op.payload.product_ids)) {
          const newIds = op.payload.product_ids.map(id => (id === tempId ? realId : id));
          if (newIds.some((v, idx) => v !== op.payload.product_ids[idx])) {
            op.payload.product_ids = newIds;
            refs = true;
          }
        }
      }

      if (refs) {
        referencing.push(op);
        changed = true;
      }
    }

    if (!changed) return;

    // Restructure the queue order, inserting dependent operations immediately after creation.
    const finalOps = [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op.tempId === tempId) {
        finalOps.push(op);
        for (const r of referencing) {
          if (r === op) continue;
          finalOps.push(r);
        }
      } else {
        if (!referencing.includes(op)) finalOps.push(op);
      }
    }

    // Replace queue with the patched sequence if creation was present.
    const hasCreate = ops.some(o => o.tempId === tempId);
    if (hasCreate) {
      await syncQueue.replaceAll(finalOps);
    } else {
      await syncQueue.replaceAll(ops);
    }
  } catch (e) {
    console.warn('patchLaterOps failed', e);
  }
}

export default { drainQueue };