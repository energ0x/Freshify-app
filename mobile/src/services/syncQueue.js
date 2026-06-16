/**
 * @file syncQueue.js
 * @description Local transaction synchronization queue manager.
 * Stores offline operations in AsyncStorage, assigning unique transaction IDs and timestamps,
 * and exposes utility actions to add, update, remove, and clean up queued items.
 */

import * as db from './db';

/**
 * Helper utility to generate a standard format UUID string.
 * Used to construct unique identifiers for queued operations.
 * 
 * @returns {string} The formatted UUID.
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Appends a new operation transaction to the local sync queue.
 * Automatically initializes queue identifiers, creation timestamps, and retry counters if not set.
 * 
 * @param {object} op - The operation parameters (entity, operation, payload, tempId, etc.).
 * @returns {Promise<void>} Resolves when the append transaction completes.
 */
export const enqueue = async (op) => {
  try {
    // Generate a shorter, custom-prefixed transaction ID if not already set.
    if (!op.id) op.id = 'q_' + generateUUID().replace(/-/g, '').substring(0, 12);
    if (!op.createdAt) op.createdAt = new Date().toISOString();
    if (op.retryCount === undefined) op.retryCount = 0;

    await db.append(db.KEYS.SYNC_QUEUE, op);
  } catch (error) {
    console.error('Failed to enqueue sync operation:', error);
  }
};

/**
 * Removes an operation from the sync queue by its unique queue ID.
 * 
 * @param {string} opId - The target queue item ID.
 * @returns {Promise<void>} Resolves when the item is removed.
 */
export const dequeue = async (opId) => {
  try {
    await db.removeById(db.KEYS.SYNC_QUEUE, opId);
  } catch (error) {
    console.error(`Failed to dequeue operation ${opId}:`, error);
  }
};

/**
 * Removes all queued operations associated with a temporary client ID.
 * Used if an item created while offline is deleted before it gets synchronized with the backend.
 * 
 * @param {string} tempId - The temporary client-side ID.
 * @returns {Promise<void>} Resolves when filtering is written.
 */
export const removeByTempId = async (tempId) => {
  try {
    const ops = await getAll();
    const filtered = ops.filter(op => op.tempId !== tempId);
    await db.write(db.KEYS.SYNC_QUEUE, filtered);
  } catch (error) {
    console.error(`Failed to remove operation with tempId ${tempId}:`, error);
  }
};

/**
 * Retrieves the full list of queued offline operations.
 * 
 * @returns {Promise<Array<object>>} The array of queued operations, or an empty list if empty.
 */
export const getAll = async () => {
  try {
    return (await db.read(db.KEYS.SYNC_QUEUE)) || [];
  } catch (error) {
    console.error('Failed to get all sync operations:', error);
    return [];
  }
};

/**
 * Updates properties of a specific operation inside the queue (e.g. updating retry counts).
 * 
 * @param {object} opToUpdate - The target operation object, containing its matching ID.
 * @returns {Promise<void>} Resolves when updated.
 */
export const update = async (opToUpdate) => {
  try {
    const ops = await getAll();
    const opIndex = ops.findIndex((op) => op.id === opToUpdate.id);
    if (opIndex !== -1) {
      ops[opIndex] = opToUpdate;
      await db.write(db.KEYS.SYNC_QUEUE, ops);
    }
  } catch (error) {
    console.error(`Failed to update operation ${opToUpdate.id}:`, error);
  }
};

/**
 * Replaces the entire queue array in storage.
 * Used during batch reordering or dependency updates.
 * 
 * @param {Array<object>} ops - The new list of queue operations.
 * @returns {Promise<void>} Resolves when written.
 */
export const replaceAll = async (ops) => {
  try {
    await db.write(db.KEYS.SYNC_QUEUE, ops);
  } catch (error) {
    console.error('Failed to replace all sync operations:', error);
  }
};

/**
 * Completely clears the sync queue from storage.
 * Typically triggered when a user logs out to avoid cross-account data leaks.
 * 
 * @returns {Promise<void>} Resolves when cleared.
 */
export const clear = async () => {
  try {
    await db.clear(db.KEYS.SYNC_QUEUE);
  } catch (error) {
    console.error('Failed to clear sync queue:', error);
  }
};

export default {
  enqueue,
  dequeue,
  removeByTempId,
  getAll,
  update,
  replaceAll,
  clear,
};
