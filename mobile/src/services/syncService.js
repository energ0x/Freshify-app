import * as syncQueue from './syncQueue';
import { productsAPI, groceryAPI, categoriesAPI } from './api';

let isDraining = false;

export const drainQueue = async (stores) => {
  if (isDraining) return;
  isDraining = true;

  try {
    // Невелика затримка, щоб дочекатися можливих завершальних записів в AsyncStorage
    await new Promise((r) => setTimeout(r, 80));

    // Пріоритети для типів операцій (менше -> виконувати раніше)
    const priorityOf = (op) => {
      // Явні пріоритети (менше значення => виконувати раніше)
      // Відповідно до вимоги: створення категорій -> створення продуктів (холодильник) -> додавання у список покупок
      // Видалення категорій має бути найнижчий пріоритет (виконується найпізніше)
      const map = {
        'category:create': 0,
        'category:update': 5,
        'category:restore_defaults': 6,
        'category:delete': 100,

        'product:create': 10,
        'product:update': 15,
        // place consume AFTER grocery:add_from_fridge so that moves from fridge -> grocery
        // are applied before consuming/decreasing fridge quantities
        'product:consume': 21,
        'product:delete': 90,

        // Додавання у корзину з холодильника має чекати на створення продуктів (тому після product:create)
        'grocery:add_from_fridge': 20,
        'grocery:create': 30,
        'grocery:toggle': 31,
        'grocery:delete': 80,
      };

      const key = `${op.entity}:${op.operation}`;
      return map[key] !== undefined ? map[key] : 50; // дефолтна середня пріоритетність
    };
    const productState = stores.product.getState();
    const categoryState = stores.category.getState();

    // Обробляємо операції по одній, переотримуючи чергу щоразу — це запобігає пропуску останніх елементів
    // Якщо черга порожня — робимо кілька коротких повторів, щоб врахувати можливі затримки запису в AsyncStorage
    let emptyRetries = 0;
    while (true) {
      let ops = await syncQueue.getAll();
      if (!ops || ops.length === 0) {
        if (emptyRetries < 3) {
          emptyRetries++;
          await new Promise((r) => setTimeout(r, 120));
          ops = await syncQueue.getAll();
          if (!ops || ops.length === 0) continue;
        }
        break;
      }

      // Сортуємо тут (priority first, then by createdAt asc)
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

      const op = ops[0];
      try {
        let response = null;

        if (op.entity === 'product') {
          if (op.operation === 'create') {
            response = await productsAPI.create(op.payload);
            productState.patchTempId('product', op.tempId, response.data.id);
            // Оновлюємо інші операції в черзі, які посилаються на тимчасовий id
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

        // Запит успішний
        await syncQueue.dequeue(op.id);
      } catch (error) {
        // Якщо є відповідь від сервера (4xx, 5xx), або це якась помилка, яку ми отримали від сервера
        if (error.response) {
          const status = error.response.status;
          if (status >= 400 && status < 500) {
            // Клієнтська помилка (404, 422, 403, 409). Запит неправильний або дані недійсні.
            // Немає сенсу його повторювати, видаляємо з черги.
            await syncQueue.dequeue(op.id);
          } else if (status >= 500) {
            // Серверна помилка (500, 502, 503). Можна спробувати ще раз.
            op.retryCount = (op.retryCount || 0) + 1;
            if (op.retryCount >= 5) {
              await syncQueue.dequeue(op.id);
            } else {
              await syncQueue.update(op);
            }
          }
        } else {
          // Мережева помилка (немає інтернету, таймаут). Можна спробувати ще раз.
          op.retryCount = (op.retryCount || 0) + 1;
          if (op.retryCount >= 5) {
            await syncQueue.dequeue(op.id);
          } else {
            await syncQueue.update(op);
          }
        }
      }

    }

    // Після всіх операцій оновлюємо дані
    productState.fetchProducts().catch(() => {});
    productState.fetchGrocery().catch(() => {});
    productState.fetchConsumedProducts().catch(() => {});
    categoryState.fetchCategories().catch(() => {});

    // Оновлюємо pendingCount
    const finalOps = await syncQueue.getAll();
    stores.product.setState({ pendingCount: finalOps.length });
  } finally {
    isDraining = false;
  }
};

async function patchLaterOps(tempId, realId) {
  // Оновлюємо всі операції в сховищі, які посилаються на тимчасовий id
  // І переставляємо залежні операції так, щоб вони йшли безпосередньо після створення
  try {
    const ops = await syncQueue.getAll();
    if (!ops || ops.length === 0) return;

    // Зберігаємо послідовність оригінальних операцій
    const referencing = [];
    let changed = false;

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      // Пропускаємо операцію, яка сама є створенням з цим tempId
      // (її будемо використовувати як опорну точку для вставки)
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

    // Тепер побудуємо новий масив операцій: при зустрічі операції-створення з tempId
    // вставимо одразу після неї всі залежні операції (в порядку їхнього оригінального з'явлення)
    const finalOps = [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op.tempId === tempId) {
        finalOps.push(op);
        // вставляємо залежні, але упевнимося, що ми не дублюємо
        for (const r of referencing) {
          // не вставляємо, якщо r === op
          if (r === op) continue;
          finalOps.push(r);
        }
      } else {
        // не додаємо ті, що ми вже вставили як referencing
        if (!referencing.includes(op)) finalOps.push(op);
      }
    }

    // Якщо не знайшли оп-створення (може бути інший тип), просто збережемо оновлені ops
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