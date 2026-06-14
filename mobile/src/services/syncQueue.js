import * as db from './db';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const enqueue = async (op) => {
  try {
    if (!op.id) op.id = 'q_' + generateUUID().replace(/-/g, '').substring(0, 12);
    if (!op.createdAt) op.createdAt = new Date().toISOString();
    if (op.retryCount === undefined) op.retryCount = 0;

    await db.append(db.KEYS.SYNC_QUEUE, op);
  } catch (error) {
    console.error('Failed to enqueue sync operation:', error);
  }
};

export const dequeue = async (opId) => {
  try {
    await db.removeById(db.KEYS.SYNC_QUEUE, opId);
  } catch (error) {
    console.error(`Failed to dequeue operation ${opId}:`, error);
  }
};

export const removeByTempId = async (tempId) => {
  try {
    const ops = await getAll();
    const filtered = ops.filter(op => op.tempId !== tempId);
    await db.write(db.KEYS.SYNC_QUEUE, filtered);
  } catch (error) {
    console.error(`Failed to remove operation with tempId ${tempId}:`, error);
  }
};

export const getAll = async () => {
  try {
    return (await db.read(db.KEYS.SYNC_QUEUE)) || [];
  } catch (error) {
    console.error('Failed to get all sync operations:', error);
    return [];
  }
};

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

export const replaceAll = async (ops) => {
  try {
    await db.write(db.KEYS.SYNC_QUEUE, ops);
  } catch (error) {
    console.error('Failed to replace all sync operations:', error);
  }
};

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
