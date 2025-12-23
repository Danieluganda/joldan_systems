const EventEmitter = require('events');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { validateInput, sanitize } = require('../utils/validation');

// In-memory storage with advanced capabilities
const storeMap = new Map();
const schemaMap = new Map();
const indexMap = new Map();
const metricsMap = new Map();

// Event emitter for store operations
const storeEmitter = new EventEmitter();

// Configuration options
const DEFAULT_OPTIONS = {
  enableAuditLogging: true,
  enableValidation: true,
  enableIndexing: true,
  enableMetrics: true,
  enableEventEmission: true,
  maxStorageSize: 10000,
  autoCleanup: true,
  cleanupInterval: 60000, // 1 minute
  enableCaching: true,
  cacheSize: 1000,
  enablePersistence: false,
  persistenceFile: null
};

// LRU Cache implementation for frequently accessed items
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Enhanced store with advanced features
function createStore(name, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Initialize store components
  if (!storeMap.has(name)) {
    storeMap.set(name, new Map());
    if (config.enableIndexing) indexMap.set(name, new Map());
    if (config.enableMetrics) metricsMap.set(name, {
      created: 0,
      updated: 0,
      deleted: 0,
      accessed: 0,
      lastAccess: null,
      startTime: new Date()
    });
  }

  const store = storeMap.get(name);
  const indexes = config.enableIndexing ? indexMap.get(name) : null;
  const metrics = config.enableMetrics ? metricsMap.get(name) : null;
  const cache = config.enableCaching ? new LRUCache(config.cacheSize) : null;

  // Schema validation
  let schema = null;
  if (schemaMap.has(name)) {
    schema = schemaMap.get(name);
  }

  // Auto-cleanup timer
  if (config.autoCleanup) {
    const cleanupTimer = setInterval(() => {
      cleanupExpiredItems(store, name);
    }, config.cleanupInterval);

    // Store cleanup timer reference
    if (!store._cleanupTimer) {
      store._cleanupTimer = cleanupTimer;
    }
  }

  // Emit store creation event
  if (config.enableEventEmission) {
    storeEmitter.emit('store:created', { name, config });
  }

  return {
    // Core CRUD operations with enhancements
    list: (filter = null, sort = null, pagination = null) => {
      try {
        updateMetrics(metrics, 'accessed');
        
        let items = Array.from(store.values());
        
        // Apply filtering
        if (filter && typeof filter === 'function') {
          items = items.filter(filter);
        } else if (filter && typeof filter === 'object') {
          items = items.filter(item => matchesFilter(item, filter));
        }
        
        // Apply sorting
        if (sort && typeof sort === 'function') {
          items = items.sort(sort);
        } else if (sort && typeof sort === 'object') {
          items = applySorting(items, sort);
        }
        
        // Apply pagination
        if (pagination) {
          const { page = 1, limit = 20 } = pagination;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          
          return {
            data: items.slice(startIndex, endIndex),
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(items.length / limit),
              totalItems: items.length,
              hasNextPage: endIndex < items.length,
              hasPrevPage: page > 1
            }
          };
        }
        
        return items;
        
      } catch (error) {
        logger.error('Error listing items from store', { 
          store: name, 
          error: error.message 
        });
        throw new Error(`Failed to list items: ${error.message}`);
      }
    },

    get: (id) => {
      try {
        updateMetrics(metrics, 'accessed');
        
        // Check cache first
        if (cache) {
          const cached = cache.get(id);
          if (cached) {
            return cached;
          }
        }
        
        const item = store.get(id) || null;
        
        // Cache the item if found
        if (item && cache) {
          cache.set(id, item);
        }
        
        // Emit access event
        if (config.enableEventEmission && item) {
          storeEmitter.emit('item:accessed', { store: name, id, item });
        }
        
        return item;
        
      } catch (error) {
        logger.error('Error getting item from store', { 
          store: name, 
          id, 
          error: error.message 
        });
        throw new Error(`Failed to get item: ${error.message}`);
      }
    },

    create: (item, userId = null) => {
      try {
        // Check storage limits
        if (store.size >= config.maxStorageSize) {
          throw new Error(`Store '${name}' has reached maximum capacity (${config.maxStorageSize})`);
        }
        
        // Validate input
        if (config.enableValidation && schema) {
          const validation = validateAgainstSchema(item, schema);
          if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
          }
        }
        
        // Generate ID if not provided
        const id = item.id || cryptoId();
        const now = new Date().toISOString();
        
        // Sanitize and prepare object
        const sanitizedItem = config.enableValidation ? sanitizeObject(item) : item;
        const obj = {
          ...sanitizedItem,
          id,
          createdAt: now,
          updatedAt: now,
          version: 1,
          ...(userId && { createdBy: userId })
        };
        
        // Check for duplicate ID
        if (store.has(id)) {
          throw new Error(`Item with ID '${id}' already exists`);
        }
        
        // Store the item
        store.set(id, obj);
        
        // Update indexes
        if (indexes) {
          updateIndexes(indexes, obj, 'create');
        }
        
        // Update cache
        if (cache) {
          cache.set(id, obj);
        }
        
        // Update metrics
        updateMetrics(metrics, 'created');
        
        // Emit creation event
        if (config.enableEventEmission) {
          storeEmitter.emit('item:created', { store: name, id, item: obj, userId });
        }
        
        // Log audit event
        if (config.enableAuditLogging) {
          logger.info('Item created in store', {
            store: name,
            id,
            userId,
            timestamp: now
          });
        }
        
        return obj;
        
      } catch (error) {
        logger.error('Error creating item in store', { 
          store: name, 
          item: { id: item?.id }, 
          userId,
          error: error.message 
        });
        throw new Error(`Failed to create item: ${error.message}`);
      }
    },

    update: (id, changes, userId = null) => {
      try {
        const existing = store.get(id);
        if (!existing) {
          throw new Error(`Item with ID '${id}' not found`);
        }
        
        // Validate changes
        if (config.enableValidation && schema) {
          const mergedItem = { ...existing, ...changes };
          const validation = validateAgainstSchema(mergedItem, schema);
          if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
          }
        }
        
        // Prepare update
        const sanitizedChanges = config.enableValidation ? sanitizeObject(changes) : changes;
        const updated = {
          ...existing,
          ...sanitizedChanges,
          id, // Ensure ID cannot be changed
          updatedAt: new Date().toISOString(),
          version: (existing.version || 1) + 1,
          ...(userId && { updatedBy: userId })
        };
        
        // Store the updated item
        store.set(id, updated);
        
        // Update indexes
        if (indexes) {
          updateIndexes(indexes, existing, 'delete');
          updateIndexes(indexes, updated, 'create');
        }
        
        // Update cache
        if (cache) {
          cache.set(id, updated);
        }
        
        // Update metrics
        updateMetrics(metrics, 'updated');
        
        // Emit update event
        if (config.enableEventEmission) {
          storeEmitter.emit('item:updated', { 
            store: name, 
            id, 
            oldItem: existing, 
            newItem: updated, 
            changes,
            userId 
          });
        }
        
        // Log audit event
        if (config.enableAuditLogging) {
          logger.info('Item updated in store', {
            store: name,
            id,
            userId,
            version: updated.version,
            timestamp: updated.updatedAt
          });
        }
        
        return updated;
        
      } catch (error) {
        logger.error('Error updating item in store', { 
          store: name, 
          id, 
          userId,
          error: error.message 
        });
        throw new Error(`Failed to update item: ${error.message}`);
      }
    },

    remove: (id, userId = null) => {
      try {
        const existing = store.get(id);
        if (!existing) {
          return false;
        }
        
        // Remove from store
        const deleted = store.delete(id);
        
        // Update indexes
        if (indexes) {
          updateIndexes(indexes, existing, 'delete');
        }
        
        // Remove from cache
        if (cache) {
          cache.delete(id);
        }
        
        // Update metrics
        updateMetrics(metrics, 'deleted');
        
        // Emit deletion event
        if (config.enableEventEmission) {
          storeEmitter.emit('item:deleted', { 
            store: name, 
            id, 
            item: existing, 
            userId 
          });
        }
        
        // Log audit event
        if (config.enableAuditLogging) {
          logger.info('Item deleted from store', {
            store: name,
            id,
            userId,
            timestamp: new Date().toISOString()
          });
        }
        
        return deleted;
        
      } catch (error) {
        logger.error('Error deleting item from store', { 
          store: name, 
          id, 
          userId,
          error: error.message 
        });
        throw new Error(`Failed to delete item: ${error.message}`);
      }
    },

    clear: (userId = null) => {
      try {
        const itemCount = store.size;
        
        store.clear();
        
        if (indexes) {
          indexes.clear();
        }
        
        if (cache) {
          cache.clear();
        }
        
        // Reset metrics
        if (metrics) {
          Object.assign(metrics, {
            created: 0,
            updated: 0,
            deleted: 0,
            accessed: 0,
            lastAccess: null,
            startTime: new Date()
          });
        }
        
        // Emit clear event
        if (config.enableEventEmission) {
          storeEmitter.emit('store:cleared', { store: name, itemCount, userId });
        }
        
        // Log audit event
        if (config.enableAuditLogging) {
          logger.info('Store cleared', {
            store: name,
            itemCount,
            userId,
            timestamp: new Date().toISOString()
          });
        }
        
        return true;
        
      } catch (error) {
        logger.error('Error clearing store', { 
          store: name, 
          userId,
          error: error.message 
        });
        throw new Error(`Failed to clear store: ${error.message}`);
      }
    },

    // Advanced query methods
    find: (query) => {
      try {
        updateMetrics(metrics, 'accessed');
        
        const items = Array.from(store.values());
        return items.filter(item => matchesQuery(item, query));
        
      } catch (error) {
        logger.error('Error finding items in store', { 
          store: name, 
          query,
          error: error.message 
        });
        throw new Error(`Failed to find items: ${error.message}`);
      }
    },

    findOne: (query) => {
      try {
        updateMetrics(metrics, 'accessed');
        
        const items = Array.from(store.values());
        return items.find(item => matchesQuery(item, query)) || null;
        
      } catch (error) {
        logger.error('Error finding item in store', { 
          store: name, 
          query,
          error: error.message 
        });
        throw new Error(`Failed to find item: ${error.message}`);
      }
    },

    count: (query = null) => {
      try {
        if (!query) return store.size;
        
        const items = Array.from(store.values());
        return items.filter(item => matchesQuery(item, query)).length;
        
      } catch (error) {
        logger.error('Error counting items in store', { 
          store: name, 
          query,
          error: error.message 
        });
        return 0;
      }
    },

    // Index management
    createIndex: (field) => {
      if (!indexes) return false;
      
      try {
        if (!indexes.has(field)) {
          indexes.set(field, new Map());
          
          // Build index from existing data
          for (const [id, item] of store) {
            const value = getNestedValue(item, field);
            if (value !== undefined) {
              if (!indexes.get(field).has(value)) {
                indexes.get(field).set(value, new Set());
              }
              indexes.get(field).get(value).add(id);
            }
          }
          
          return true;
        }
        return false;
        
      } catch (error) {
        logger.error('Error creating index', { 
          store: name, 
          field,
          error: error.message 
        });
        return false;
      }
    },

    dropIndex: (field) => {
      if (!indexes) return false;
      return indexes.delete(field);
    },

    // Schema management
    setSchema: (schemaDefinition) => {
      try {
        schemaMap.set(name, schemaDefinition);
        schema = schemaDefinition;
        
        if (config.enableEventEmission) {
          storeEmitter.emit('schema:set', { store: name, schema: schemaDefinition });
        }
        
        return true;
        
      } catch (error) {
        logger.error('Error setting schema', { 
          store: name, 
          error: error.message 
        });
        return false;
      }
    },

    getSchema: () => schema,

    // Statistics and metrics
    getMetrics: () => {
      if (!metrics) return null;
      
      return {
        ...metrics,
        currentSize: store.size,
        cacheSize: cache ? cache.size() : 0,
        indexCount: indexes ? indexes.size : 0,
        uptime: new Date() - metrics.startTime
      };
    },

    // Configuration management
    getConfig: () => ({ ...config }),
    
    updateConfig: (newOptions) => {
      Object.assign(config, newOptions);
      return config;
    },

    // Backup and restore
    backup: () => {
      return {
        data: Array.from(store.entries()),
        schema: schema,
        indexes: indexes ? Array.from(indexes.entries()) : null,
        metadata: {
          name,
          config,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
    },

    restore: (backup, userId = null) => {
      try {
        if (!backup || !backup.data) {
          throw new Error('Invalid backup data');
        }
        
        // Clear existing data
        store.clear();
        if (indexes) indexes.clear();
        if (cache) cache.clear();
        
        // Restore data
        for (const [id, item] of backup.data) {
          store.set(id, item);
        }
        
        // Restore schema
        if (backup.schema) {
          schema = backup.schema;
          schemaMap.set(name, schema);
        }
        
        // Restore indexes
        if (backup.indexes && indexes) {
          for (const [field, index] of backup.indexes) {
            indexes.set(field, new Map(index));
          }
        }
        
        // Emit restore event
        if (config.enableEventEmission) {
          storeEmitter.emit('store:restored', { 
            store: name, 
            itemCount: store.size, 
            userId,
            timestamp: backup.metadata?.timestamp 
          });
        }
        
        // Log audit event
        if (config.enableAuditLogging) {
          logger.info('Store restored from backup', {
            store: name,
            itemCount: store.size,
            userId,
            backupTimestamp: backup.metadata?.timestamp,
            timestamp: new Date().toISOString()
          });
        }
        
        return true;
        
      } catch (error) {
        logger.error('Error restoring store from backup', { 
          store: name, 
          userId,
          error: error.message 
        });
        throw new Error(`Failed to restore backup: ${error.message}`);
      }
    },

    // Event subscription
    on: (event, listener) => {
      if (config.enableEventEmission) {
        storeEmitter.on(`${name}:${event}`, listener);
      }
    },

    off: (event, listener) => {
      if (config.enableEventEmission) {
        storeEmitter.off(`${name}:${event}`, listener);
      }
    },

    // Cleanup
    destroy: () => {
      try {
        // Clean up timers
        if (store._cleanupTimer) {
          clearInterval(store._cleanupTimer);
          delete store._cleanupTimer;
        }
        
        // Clear all data
        store.clear();
        if (indexes) indexes.clear();
        if (cache) cache.clear();
        
        // Remove from global maps
        storeMap.delete(name);
        indexMap.delete(name);
        metricsMap.delete(name);
        schemaMap.delete(name);
        
        // Emit destruction event
        if (config.enableEventEmission) {
          storeEmitter.emit('store:destroyed', { store: name });
        }
        
        logger.info('Store destroyed', { store: name });
        
        return true;
        
      } catch (error) {
        logger.error('Error destroying store', { 
          store: name, 
          error: error.message 
        });
        return false;
      }
    }
  };
}

// Utility functions
function cryptoId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString('hex');
  } catch (e) {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

function matchesFilter(item, filter) {
  for (const [key, value] of Object.entries(filter)) {
    const itemValue = getNestedValue(item, key);
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle operators like { $gt: 100 }, { $in: [1, 2, 3] }
      for (const [operator, operatorValue] of Object.entries(value)) {
        switch (operator) {
          case '$eq':
            if (itemValue !== operatorValue) return false;
            break;
          case '$ne':
            if (itemValue === operatorValue) return false;
            break;
          case '$gt':
            if (itemValue <= operatorValue) return false;
            break;
          case '$gte':
            if (itemValue < operatorValue) return false;
            break;
          case '$lt':
            if (itemValue >= operatorValue) return false;
            break;
          case '$lte':
            if (itemValue > operatorValue) return false;
            break;
          case '$in':
            if (!Array.isArray(operatorValue) || !operatorValue.includes(itemValue)) return false;
            break;
          case '$nin':
            if (Array.isArray(operatorValue) && operatorValue.includes(itemValue)) return false;
            break;
          case '$regex':
            if (typeof itemValue !== 'string' || !new RegExp(operatorValue).test(itemValue)) return false;
            break;
          default:
            if (itemValue !== operatorValue) return false;
        }
      }
    } else if (Array.isArray(value)) {
      if (!value.includes(itemValue)) return false;
    } else {
      if (itemValue !== value) return false;
    }
  }
  return true;
}

function matchesQuery(item, query) {
  if (typeof query === 'function') {
    return query(item);
  }
  return matchesFilter(item, query);
}

function applySorting(items, sort) {
  return items.sort((a, b) => {
    for (const [field, direction] of Object.entries(sort)) {
      const aValue = getNestedValue(a, field);
      const bValue = getNestedValue(b, field);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      if (comparison !== 0) {
        return direction === -1 ? -comparison : comparison;
      }
    }
    return 0;
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function validateAgainstSchema(item, schema) {
  // Basic schema validation - can be enhanced
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = getNestedValue(item, field);
    
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Field '${field}' is required`);
    }
    
    if (value !== undefined && rules.type && typeof value !== rules.type) {
      errors.push(`Field '${field}' must be of type ${rules.type}`);
    }
    
    if (value && rules.minLength && value.length < rules.minLength) {
      errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
    }
    
    if (value && rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Field '${field}' must be no more than ${rules.maxLength} characters`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function updateMetrics(metrics, operation) {
  if (metrics) {
    metrics[operation]++;
    metrics.lastAccess = new Date();
  }
}

function updateIndexes(indexes, item, operation) {
  for (const [field, index] of indexes) {
    const value = getNestedValue(item, field);
    if (value !== undefined) {
      if (operation === 'create') {
        if (!index.has(value)) {
          index.set(value, new Set());
        }
        index.get(value).add(item.id);
      } else if (operation === 'delete') {
        if (index.has(value)) {
          index.get(value).delete(item.id);
          if (index.get(value).size === 0) {
            index.delete(value);
          }
        }
      }
    }
  }
}

function cleanupExpiredItems(store, storeName) {
  try {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [id, item] of store) {
      // Clean up items with TTL
      if (item.expiresAt && new Date(item.expiresAt) < now) {
        store.delete(id);
        cleanedCount++;
      }
      
      // Clean up old temporary items
      if (item.temporary && item.createdAt) {
        const age = now - new Date(item.createdAt);
        if (age > 24 * 60 * 60 * 1000) { // 24 hours
          store.delete(id);
          cleanedCount++;
        }
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cleaned up expired items', { 
        store: storeName, 
        cleanedCount 
      });
      
      storeEmitter.emit('cleanup:completed', { 
        store: storeName, 
        cleanedCount,
        timestamp: now 
      });
    }
    
  } catch (error) {
    logger.error('Error during cleanup', { 
      store: storeName, 
      error: error.message 
    });
  }
}

// Global store management
function getAllStores() {
  return Array.from(storeMap.keys());
}

function getGlobalMetrics() {
  const metrics = {};
  for (const [storeName, storeMetrics] of metricsMap) {
    metrics[storeName] = {
      ...storeMetrics,
      currentSize: storeMap.get(storeName)?.size || 0
    };
  }
  return metrics;
}

function destroyAllStores() {
  const storeNames = Array.from(storeMap.keys());
  for (const name of storeNames) {
    const store = createStore(name);
    store.destroy();
  }
  return storeNames.length;
}

// Export enhanced base service
module.exports = { 
  createStore,
  getAllStores,
  getGlobalMetrics,
  destroyAllStores,
  storeEmitter,
  DEFAULT_OPTIONS
};
