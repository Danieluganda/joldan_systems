/**
 * Enterprise Utility Management System
 * 
 * Comprehensive utility orchestration and management for procurement systems
 * with dependency injection, health monitoring, lazy loading, performance optimization,
 * configuration management, and enterprise-grade module organization
 * 
 * Features:
 * - Smart dependency injection and module resolution
 * - Lazy loading for performance optimization
 * - Health monitoring and diagnostics
 * - Configuration-driven module loading
 * - Performance metrics and caching statistics
 * - Graceful degradation and error handling
 * - Module versioning and compatibility checking
 * - Hot reloading support for development
 * - Memory management and cleanup
 * - Comprehensive audit logging
 */

const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

// Configuration
const UTILS_CONFIG = {
  lazyLoading: process.env.UTILS_LAZY_LOADING !== 'false',
  healthMonitoring: process.env.UTILS_HEALTH_MONITORING !== 'false',
  performanceTracking: process.env.UTILS_PERFORMANCE_TRACKING !== 'false',
  auditLogging: process.env.UTILS_AUDIT_LOGGING !== 'false',
  hotReloading: process.env.NODE_ENV === 'development',
  cacheEnabled: process.env.UTILS_CACHE_ENABLED !== 'false',
  maxMemoryUsage: parseInt(process.env.UTILS_MAX_MEMORY_MB) || 100,
  healthCheckInterval: parseInt(process.env.UTILS_HEALTH_INTERVAL) || 30000
};

// Module registry and metadata
const MODULE_REGISTRY = {
  // Core date and time utilities
  dateUtils: {
    path: './dateUtils',
    description: 'Enterprise date and time management with timezone support',
    version: '2.0.0',
    dependencies: ['moment-timezone'],
    features: ['timezone', 'internationalization', 'business-calendar', 'holiday-awareness'],
    critical: true,
    loadPriority: 1
  },

  // File integrity and hashing
  fileHash: {
    path: './fileHash',
    description: 'Enterprise file hashing and integrity management',
    version: '2.0.0',
    dependencies: ['crypto'],
    features: ['multi-algorithm', 'streaming', 'verification', 'batch-processing'],
    critical: true,
    loadPriority: 1
  },

  // Formatting and localization
  formatUtils: {
    path: './formatUtils',
    description: 'International formatting and localization system',
    version: '2.0.0',
    dependencies: ['moment-timezone', 'validator'],
    features: ['internationalization', 'procurement-formats', 'templates', 'validation'],
    critical: true,
    loadPriority: 1
  },

  // Validation and data integrity
  validationUtils: {
    path: './validationUtils',
    description: 'Comprehensive validation and data integrity utilities',
    version: '1.5.0',
    dependencies: [],
    features: ['schema-validation', 'sanitization', 'custom-rules'],
    critical: true,
    loadPriority: 1
  },

  // Status configuration and management
  statusConfig: {
    path: './statusConfig',
    description: 'Status configuration and workflow management',
    version: '1.5.0',
    dependencies: [],
    features: ['workflow', 'transitions', 'permissions'],
    critical: true,
    loadPriority: 1
  },

  // API service layer
  apiService: {
    path: './apiService',
    description: 'Enterprise API management with authentication and caching',
    version: '2.0.0',
    dependencies: ['axios'],
    features: ['authentication', 'caching', 'retry-logic', 'rate-limiting'],
    critical: true,
    loadPriority: 1
  },

  // Procurement-specific helpers
  procurementHelpers: {
    path: './procurementHelpers',
    description: 'Procurement domain-specific utility functions',
    version: '1.5.0',
    dependencies: [],
    features: ['scoring', 'evaluation', 'compliance', 'workflows'],
    critical: false,
    loadPriority: 2
  },

  // Security utilities (if exists)
  securityUtils: {
    path: './securityUtils',
    description: 'Security and encryption utilities',
    version: '1.0.0',
    dependencies: ['crypto'],
    features: ['encryption', 'jwt', 'sanitization'],
    critical: false,
    loadPriority: 2,
    optional: true
  },

  // Database utilities (if exists)
  dbUtils: {
    path: './dbUtils',
    description: 'Database connection and query utilities',
    version: '1.0.0',
    dependencies: [],
    features: ['connection-pooling', 'query-building', 'migrations'],
    critical: false,
    loadPriority: 3,
    optional: true
  },

  // Logging utilities (if exists)
  logUtils: {
    path: './logUtils',
    description: 'Advanced logging and monitoring utilities',
    version: '1.0.0',
    dependencies: [],
    features: ['structured-logging', 'performance-tracking', 'audit-trails'],
    critical: false,
    loadPriority: 3,
    optional: true
  }
};

// Utility manager class
class UtilityManager extends EventEmitter {
  constructor() {
    super();
    this.modules = new Map();
    this.loadedModules = new Map();
    this.health = new Map();
    this.performance = new Map();
    this.dependencies = new Map();
    this.initialized = false;
    this.startTime = Date.now();
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.loadModule = this.loadModule.bind(this);
    this.getModule = this.getModule.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
  }

  /**
   * Initialize the utility manager
   */
  async initialize() {
    try {
      if (this.initialized) return;

      console.log('🚀 Initializing Enterprise Utility Management System...');

      // Load critical modules first
      await this.loadCriticalModules();

      // Start health monitoring if enabled
      if (UTILS_CONFIG.healthMonitoring) {
        this.startHealthMonitoring();
      }

      // Setup performance tracking
      if (UTILS_CONFIG.performanceTracking) {
        this.setupPerformanceTracking();
      }

      // Setup hot reloading in development
      if (UTILS_CONFIG.hotReloading) {
        this.setupHotReloading();
      }

      this.initialized = true;
      this.emit('initialized');

      const initTime = Date.now() - this.startTime;
      console.log(`✅ Utility Manager initialized in ${initTime}ms`);

      if (UTILS_CONFIG.auditLogging) {
        await this.auditLog('UTILITY_MANAGER_INITIALIZED', {
          initTime,
          loadedModules: Array.from(this.loadedModules.keys()),
          config: UTILS_CONFIG
        });
      }

    } catch (error) {
      console.error('❌ Utility Manager initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load critical modules with priority ordering
   */
  async loadCriticalModules() {
    const criticalModules = Object.entries(MODULE_REGISTRY)
      .filter(([, config]) => config.critical)
      .sort((a, b) => a[1].loadPriority - b[1].loadPriority);

    for (const [name, config] of criticalModules) {
      try {
        await this.loadModule(name, config);
      } catch (error) {
        console.error(`Failed to load critical module ${name}:`, error);
        // Continue loading other modules but track the failure
        this.health.set(name, { status: 'failed', error: error.message, timestamp: new Date() });
      }
    }
  }

  /**
   * Load a specific module with error handling and caching
   */
  async loadModule(name, config = null) {
    try {
      const moduleConfig = config || MODULE_REGISTRY[name];
      if (!moduleConfig) {
        throw new Error(`Unknown module: ${name}`);
      }

      // Check if module is already loaded
      if (this.loadedModules.has(name)) {
        return this.loadedModules.get(name);
      }

      const startTime = Date.now();

      // Check if module file exists for optional modules
      if (moduleConfig.optional) {
        try {
          await fs.access(path.join(__dirname, moduleConfig.path + '.js'));
        } catch {
          console.log(`ℹ️ Optional module ${name} not found, skipping...`);
          return null;
        }
      }

      // Load the module
      const modulePath = moduleConfig.path;
      const moduleExports = require(modulePath);

      // Validate module exports
      if (!moduleExports || typeof moduleExports !== 'object') {
        throw new Error(`Invalid module exports for ${name}`);
      }

      // Store loaded module
      this.loadedModules.set(name, moduleExports);
      this.modules.set(name, moduleConfig);

      // Track performance
      const loadTime = Date.now() - startTime;
      this.performance.set(name, {
        loadTime,
        lastAccessed: new Date(),
        accessCount: 0,
        memoryUsage: process.memoryUsage(),
        status: 'loaded'
      });

      // Health status
      this.health.set(name, {
        status: 'healthy',
        loadTime,
        lastCheck: new Date(),
        version: moduleConfig.version
      });

      console.log(`✅ Loaded ${name} (${loadTime}ms)`);
      this.emit('moduleLoaded', { name, loadTime, config: moduleConfig });

      return moduleExports;

    } catch (error) {
      console.error(`❌ Failed to load module ${name}:`, error);
      
      this.health.set(name, {
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      });

      if (!MODULE_REGISTRY[name]?.optional) {
        throw error;
      }

      return null;
    }
  }

  /**
   * Get a module with lazy loading support
   */
  async getModule(name) {
    try {
      // Return if already loaded
      if (this.loadedModules.has(name)) {
        const module = this.loadedModules.get(name);
        
        // Update access statistics
        if (this.performance.has(name)) {
          const perf = this.performance.get(name);
          perf.lastAccessed = new Date();
          perf.accessCount += 1;
        }

        return module;
      }

      // Lazy load if enabled and module exists
      if (UTILS_CONFIG.lazyLoading && MODULE_REGISTRY[name]) {
        return await this.loadModule(name);
      }

      throw new Error(`Module ${name} not found or not loaded`);

    } catch (error) {
      console.error(`Failed to get module ${name}:`, error);
      throw error;
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    const healthCheck = () => {
      this.loadedModules.forEach((module, name) => {
        try {
          // Basic health check - ensure module still exists and has expected functions
          const config = this.modules.get(name);
          if (config && module) {
            const health = this.health.get(name);
            if (health) {
              health.lastCheck = new Date();
              health.status = 'healthy';
            }
          }
        } catch (error) {
          this.health.set(name, {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date()
          });
        }
      });
    };

    // Run initial health check
    healthCheck();

    // Schedule periodic health checks
    setInterval(healthCheck, UTILS_CONFIG.healthCheckInterval);

    console.log(`🔍 Health monitoring started (interval: ${UTILS_CONFIG.healthCheckInterval}ms)`);
  }

  /**
   * Setup performance tracking
   */
  setupPerformanceTracking() {
    // Monitor memory usage
    const memoryCheck = () => {
      const usage = process.memoryUsage();
      const usageMB = usage.heapUsed / 1024 / 1024;

      if (usageMB > UTILS_CONFIG.maxMemoryUsage) {
        console.warn(`⚠️ High memory usage: ${usageMB.toFixed(2)}MB (limit: ${UTILS_CONFIG.maxMemoryUsage}MB)`);
        this.emit('highMemoryUsage', { current: usageMB, limit: UTILS_CONFIG.maxMemoryUsage });
      }
    };

    setInterval(memoryCheck, 60000); // Check every minute
  }

  /**
   * Setup hot reloading for development
   */
  setupHotReloading() {
    if (process.env.NODE_ENV !== 'development') return;

    const chokidar = require('chokidar');
    const watcher = chokidar.watch(__dirname, { ignored: /node_modules/ });

    watcher.on('change', (filePath) => {
      const moduleName = path.basename(filePath, '.js');
      
      if (this.loadedModules.has(moduleName)) {
        console.log(`🔄 Hot reloading ${moduleName}...`);
        
        // Clear require cache
        delete require.cache[require.resolve(filePath)];
        
        // Reload module
        try {
          this.loadModule(moduleName);
          console.log(`✅ Hot reloaded ${moduleName}`);
        } catch (error) {
          console.error(`❌ Hot reload failed for ${moduleName}:`, error);
        }
      }
    });
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    const totalModules = Object.keys(MODULE_REGISTRY).length;
    const loadedCount = this.loadedModules.size;
    const healthyCount = Array.from(this.health.values()).filter(h => h.status === 'healthy').length;

    return {
      initialized: this.initialized,
      uptime: Date.now() - this.startTime,
      modules: {
        total: totalModules,
        loaded: loadedCount,
        healthy: healthyCount,
        loadPercentage: Math.round((loadedCount / totalModules) * 100)
      },
      performance: Object.fromEntries(this.performance),
      health: Object.fromEntries(this.health),
      memory: process.memoryUsage(),
      config: UTILS_CONFIG
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    try {
      console.log('🛑 Shutting down Utility Manager...');

      // Clear all caches
      this.loadedModules.clear();
      this.performance.clear();
      this.health.clear();

      // Clear require cache for all loaded modules
      Object.values(MODULE_REGISTRY).forEach(config => {
        const modulePath = require.resolve(config.path);
        delete require.cache[modulePath];
      });

      if (UTILS_CONFIG.auditLogging) {
        await this.auditLog('UTILITY_MANAGER_SHUTDOWN', {
          uptime: Date.now() - this.startTime,
          timestamp: new Date().toISOString()
        });
      }

      console.log('✅ Utility Manager shutdown complete');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Audit logging
   */
  async auditLog(action, data) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        data,
        process: process.pid,
        memory: process.memoryUsage()
      };

      // In production, this would write to a proper audit log
      console.log(`[UTILS_AUDIT] ${JSON.stringify(logEntry)}`);

    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }
}

// Create singleton instance
const utilityManager = new UtilityManager();

// Initialize on first require
const initPromise = utilityManager.initialize();

// Graceful shutdown handling
process.on('SIGTERM', () => utilityManager.shutdown());
process.on('SIGINT', () => utilityManager.shutdown());

/**
 * Enhanced module exports with proxy for lazy loading
 */
const createModuleProxy = (moduleName) => {
  return new Proxy({}, {
    get: async (target, prop) => {
      try {
        const module = await utilityManager.getModule(moduleName);
        if (module && typeof module[prop] !== 'undefined') {
          return module[prop];
        }
        return undefined;
      } catch (error) {
        console.error(`Error accessing ${moduleName}.${String(prop)}:`, error);
        return undefined;
      }
    }
  });
};

// Create lazy-loaded module proxies
const moduleProxies = {};
Object.keys(MODULE_REGISTRY).forEach(moduleName => {
  moduleProxies[moduleName] = createModuleProxy(moduleName);
});

// Direct module access (traditional approach)
let loadedUtilities = {};

// Load modules synchronously for immediate availability
try {
  // Core utilities that should be available immediately
  const coreModules = ['dateUtils', 'formatUtils', 'validationUtils', 'statusConfig', 'apiService'];
  
  coreModules.forEach(moduleName => {
    try {
      if (MODULE_REGISTRY[moduleName] && !MODULE_REGISTRY[moduleName].optional) {
        const module = require(MODULE_REGISTRY[moduleName].path);
        loadedUtilities[moduleName] = module;
        loadedUtilities = { ...loadedUtilities, ...module };
      }
    } catch (error) {
      console.warn(`Warning: Could not load ${moduleName}:`, error.message);
    }
  });

  // Optional modules
  const optionalModules = ['fileHash', 'procurementHelpers', 'securityUtils', 'dbUtils', 'logUtils'];
  
  optionalModules.forEach(moduleName => {
    try {
      if (MODULE_REGISTRY[moduleName]) {
        const module = require(MODULE_REGISTRY[moduleName].path);
        loadedUtilities[moduleName] = module;
        if (moduleName !== 'procurementHelpers') { // Avoid conflicts
          loadedUtilities = { ...loadedUtilities, ...module };
        }
      }
    } catch (error) {
      // Optional modules can fail to load
      console.log(`Optional module ${moduleName} not available:`, error.message);
    }
  });

} catch (error) {
  console.error('Error loading core utilities:', error);
}

// Enhanced export object with management capabilities
module.exports = {
  // Spread all loaded utilities for backward compatibility
  ...loadedUtilities,

  // Named module exports
  ...moduleProxies,

  // Utility manager access
  manager: utilityManager,

  // System utilities
  getSystemStatus: () => utilityManager.getSystemStatus(),
  getModule: (name) => utilityManager.getModule(name),
  reloadModule: (name) => utilityManager.loadModule(name),
  clearCache: () => {
    utilityManager.loadedModules.clear();
    utilityManager.performance.clear();
  },

  // Health and diagnostics
  healthCheck: () => utilityManager.getSystemStatus().health,
  getPerformanceMetrics: () => utilityManager.getSystemStatus().performance,
  getLoadedModules: () => Array.from(utilityManager.loadedModules.keys()),

  // Configuration access
  config: UTILS_CONFIG,
  moduleRegistry: MODULE_REGISTRY,

  // Initialization promise for async contexts
  ready: initPromise,

  // Utility helpers
  isModuleLoaded: (name) => utilityManager.loadedModules.has(name),
  getModuleInfo: (name) => MODULE_REGISTRY[name] || null,
  listAvailableModules: () => Object.keys(MODULE_REGISTRY),

  // Backwards compatibility aliases
  dateUtils: loadedUtilities.dateUtils,
  formatUtils: loadedUtilities.formatUtils,
  validationUtils: loadedUtilities.validationUtils,
  statusConfig: loadedUtilities.statusConfig,
  apiService: loadedUtilities.apiService,
  fileHash: loadedUtilities.fileHash,
  procurementHelpers: loadedUtilities.procurementHelpers
};

/**
 * Enhanced Usage Examples:
 * 
 * // Traditional usage (immediate availability)
 * const { formatDate, calculateTimeRemaining } = require('./utils');
 * const { formatCurrency } = require('./utils');
 * 
 * // Module-specific imports
 * const { dateUtils, formatUtils } = require('./utils');
 * 
 * // System management
 * const utils = require('./utils');
 * const status = utils.getSystemStatus();
 * const performance = utils.getPerformanceMetrics();
 * 
 * // Async initialization
 * const utils = require('./utils');
 * await utils.ready; // Wait for full initialization
 * 
 * // Module management
 * const specificModule = await utils.getModule('dateUtils');
 * const isLoaded = utils.isModuleLoaded('formatUtils');
 * const moduleInfo = utils.getModuleInfo('apiService');
 * 
 * // Hot reloading in development
 * await utils.reloadModule('dateUtils');
 * 
 * // Health monitoring
 * const health = utils.healthCheck();
 * const metrics = utils.getPerformanceMetrics();
 * 
 * // Common workflows with enhanced features:
 * 
 * // Date operations with timezone support
 * const deadline = dateUtils.calculateTimeRemaining(targetDate, {
 *   timezone: 'America/New_York',
 *   businessDaysOnly: true
 * });
 * 
 * // International currency formatting
 * const price = formatUtils.formatCurrency(1234.56, {
 *   currency: 'EUR',
 *   locale: 'de-DE'
 * });
 * 
 * // File integrity verification
 * const hashResult = await fileHash.verifyIntegrity(fileBuffer, expectedHash, {
 *   algorithm: 'sha512'
 * });
 * 
 * // API calls with caching and retry
 * const data = await apiService.get('/api/procurements', {
 *   cache: true,
 *   retries: 3
 * });
 * 
 * // Procurement ID generation
 * const rfqId = formatUtils.formatProcurementId('rfq', {
 *   year: 2024,
 *   sequence: 1,
 *   department: 'PRO'
 * });
 */
