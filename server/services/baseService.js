const storeMap = new Map();

function createStore(name) {
  if (!storeMap.has(name)) storeMap.set(name, new Map());
  const store = storeMap.get(name);

  return {
    list: () => Array.from(store.values()),
    get: (id) => store.get(id) || null,
    create: (item) => {
      const id = item.id || (cryptoId());
      const now = new Date().toISOString();
      const obj = Object.assign({}, item, { id, createdAt: now, updatedAt: now });
      store.set(id, obj);
      return obj;
    },
    update: (id, changes) => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = Object.assign({}, existing, changes, { id, updatedAt: new Date().toISOString() });
      store.set(id, updated);
      return updated;
    },
    remove: (id) => store.delete(id),
    clear: () => store.clear(),
  };
}

function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  try {
    return require('crypto').randomUUID();
  } catch (e) {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  }
}

module.exports = { createStore };
