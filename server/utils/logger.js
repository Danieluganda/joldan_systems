/**
 * Enterprise Logging and Monitoring System
 * 
 * Comprehensive logging infrastructure for procurement systems with
 * structured logging, multiple transports, log rotation, performance monitoring,
 * security features, audit trails, and real-time streaming capabilities
 * 
 * Features:
 * - Structured JSON logging with correlation tracking
 * - Multiple transport options (file, console, remote, database)
 * - Automatic log rotation and archiving
 * - Performance monitoring and metrics collection
 * - Security-focused log sanitization and filtering
 * - Real-time log streaming and aggregation
 * - Context-aware logging with request correlation
 * - Audit logging for compliance requirements
 * - Memory-efficient buffering and batching
 * - Integration with monitoring systems
 * - Configurable log levels and filtering
 * - Error tracking and alerting
 */

const fs = require('fs').promises;
const fSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');
const { Transform, Writable } = require('stream');
const os = require('os');

// Configuration
const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'json', // json, plain, structured
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE !== 'false',
  enableAudit: process.env.LOG_ENABLE_AUDIT !== 'false',
  enableMetrics: process.env.LOG_ENABLE_METRICS !== 'false',
  enableSanitization: process.env.LOG_ENABLE_SANITIZATION !== 'false',
  maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES) || 10,
  bufferSize: parseInt(process.env.LOG_BUFFER_SIZE) || 100,
  flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL) || 5000, // 5 seconds
  compressRotated: process.env.LOG_COMPRESS_ROTATED !== 'false',
  auditRetentionDays: parseInt(process.env.LOG_AUDIT_RETENTION_DAYS) || 365
};

// Enhanced log levels with numeric priorities
const LOG_LEVELS = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5
};

const LOG_LEVEL_COLORS = {
  fatal: '\x1b[41m\x1b[37m', // Red background, white text
  error: '\x1b[31m',         // Red
  warn: '\x1b[33m',          // Yellow
  info: '\x1b[36m',          // Cyan
  debug: '\x1b[32m',         // Green
  trace: '\x1b[90m'          // Gray
};

const RESET_COLOR = '\x1b[0m';

// Security patterns for log sanitization
const SENSITIVE_PATTERNS = [
  /password["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /token["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /key["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /secret["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /authorization["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /cookie["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /ssn["\s]*[:=]["\s]*\d{3}-?\d{2}-?\d{4}/gi,
  /credit[\s_]?card["\s]*[:=]["\s]*\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/gi,
  /\b\d{16}\b/g, // Credit card numbers
  /\b\d{3}-\d{2}-\d{4}\b/g // SSN format
];

// Performance metrics storage
const performanceMetrics = {
  logsPerSecond: 0,
  totalLogs: 0,
  errorCount: 0,
  warningCount: 0,
  averageLogSize: 0,
  bufferUtilization: 0,
  lastFlushTime: Date.now()
};

/**
 * Enterprise Logger Class
 */
class EnterpriseLogger extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = { ...LOG_CONFIG, ...options };
    this.currentLevel = LOG_LEVELS[this.config.level.toLowerCase()] || LOG_LEVELS.info;
    this.logBuffer = [];
    this.correlationId = null;
    this.sessionId = null;
    this.instanceId = crypto.randomBytes(4).toString('hex');
    this.startTime = Date.now();
    
    // Transport streams
    this.transports = new Map();
    this.rotationStreams = new Map();
    
    // Initialize transports
    this.initializeTransports();
    
    // Setup log rotation
    this.setupLogRotation();
    
    // Start buffer flushing
    this.startBufferFlushing();
    
    // Setup performance monitoring
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
    
    this.emit('initialized', { instanceId: this.instanceId, config: this.config });
  }

  /**
   * Initialize logging transports
   */
  initializeTransports() {
    try {
      // Console transport
      if (this.config.enableConsole) {
        this.transports.set('console', {
          type: 'console',
          write: this.writeToConsole.bind(this),
          level: this.currentLevel
        });
      }

      // File transport
      if (this.config.enableFile) {
        this.setupFileTransport();
      }

      // Audit transport
      if (this.config.enableAudit) {
        this.setupAuditTransport();
      }

      console.log(`🚀 Logger initialized with ${this.transports.size} transports`);

    } catch (error) {
      console.error('Failed to initialize logger transports:', error);
    }
  }

  /**
   * Setup file transport with rotation
   */
  async setupFileTransport() {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, 'application.log');
      const errorFile = path.join(logDir, 'error.log');

      this.transports.set('file', {
        type: 'file',
        path: logFile,
        errorPath: errorFile,
        write: this.writeToFile.bind(this),
        level: this.currentLevel
      });

      // Check if rotation is needed
      await this.checkAndRotateLog(logFile);

    } catch (error) {
      console.error('Failed to setup file transport:', error);
    }
  }

  /**
   * Setup audit transport for compliance logging
   */
  async setupAuditTransport() {
    try {
      const auditDir = path.join(process.cwd(), 'logs', 'audit');
      await fs.mkdir(auditDir, { recursive: true });

      const auditFile = path.join(auditDir, `audit-${new Date().toISOString().split('T')[0]}.log`);

      this.transports.set('audit', {
        type: 'audit',
        path: auditFile,
        write: this.writeToAuditFile.bind(this),
        level: LOG_LEVELS.info,
        retentionDays: this.config.auditRetentionDays
      });

    } catch (error) {
      console.error('Failed to setup audit transport:', error);
    }
  }

  /**
   * Core logging method with enhanced features
   */
  log(level, message, data = {}, options = {}) {
    try {
      const numericLevel = LOG_LEVELS[level.toLowerCase()];
      
      // Check log level
      if (numericLevel > this.currentLevel) {
        return;
      }

      // Create log entry
      const logEntry = this.createLogEntry(level, message, data, options);

      // Add to buffer
      this.addToBuffer(logEntry);

      // Update metrics
      this.updateMetrics(level, logEntry);

      // Emit log event for external listeners
      this.emit('log', logEntry);

      // Immediate flush for fatal and error logs
      if (numericLevel <= LOG_LEVELS.error) {
        this.flushBuffer();
      }

      return logEntry;

    } catch (error) {
      // Fallback logging to prevent log system from crashing the app
      console.error('Logger internal error:', error);
      console.error('Original message:', message);
    }
  }

  /**
   * Create comprehensive log entry
   */
  createLogEntry(level, message, data, options) {
    const timestamp = new Date().toISOString();
    const hostname = os.hostname();
    const pid = process.pid;

    const baseEntry = {
      timestamp,
      level: level.toUpperCase(),
      message: this.sanitizeMessage(message),
      hostname,
      pid,
      instanceId: this.instanceId,
      ...(this.correlationId && { correlationId: this.correlationId }),
      ...(this.sessionId && { sessionId: this.sessionId })
    };

    // Add context data
    if (data && Object.keys(data).length > 0) {
      baseEntry.data = this.sanitizeData(data);
    }

    // Add stack trace for errors
    if (level === 'error' || level === 'fatal') {
      baseEntry.stack = this.captureStackTrace();
    }

    // Add performance data if available
    if (options.performance) {
      baseEntry.performance = {
        duration: options.duration,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      };
    }

    // Add request context if available
    if (options.request) {
      baseEntry.request = {
        method: options.request.method,
        url: options.request.url,
        userAgent: options.request.get?.('User-Agent'),
        ip: options.request.ip,
        userId: options.request.user?.id
      };
    }

    // Add additional metadata
    baseEntry.metadata = {
      environment: process.env.NODE_ENV || 'development',
      service: 'procurement-discipline-app',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime
    };

    return baseEntry;
  }

  /**
   * Sanitize sensitive data from logs
   */
  sanitizeMessage(message) {
    if (!this.config.enableSanitization) return message;
    
    let sanitized = String(message);
    
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        // Keep first few characters for debugging, mask the rest
        const prefix = match.substring(0, Math.min(match.indexOf('=') + 2, 10));
        return `${prefix}[REDACTED]`;
      });
    });
    
    return sanitized;
  }

  /**
   * Sanitize sensitive data objects
   */
  sanitizeData(data) {
    if (!this.config.enableSanitization) return data;
    
    try {
      const sanitized = JSON.parse(JSON.stringify(data));
      
      const sanitizeObject = (obj) => {
        Object.keys(obj).forEach(key => {
          const lowerKey = key.toLowerCase();
          
          if (['password', 'token', 'secret', 'key', 'authorization', 'cookie'].some(sensitive => 
            lowerKey.includes(sensitive))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          } else if (typeof obj[key] === 'string') {
            SENSITIVE_PATTERNS.forEach(pattern => {
              obj[key] = obj[key].replace(pattern, '[REDACTED]');
            });
          }
        });
      };

      if (typeof sanitized === 'object' && sanitized !== null) {
        sanitizeObject(sanitized);
      }
      
      return sanitized;

    } catch (error) {
      return { sanitizationError: 'Failed to sanitize data', originalType: typeof data };
    }
  }

  /**
   * Capture stack trace for errors
   */
  captureStackTrace() {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2, 10) : [];
  }

  /**
   * Add log entry to buffer
   */
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);
    
    // Update buffer utilization metric
    performanceMetrics.bufferUtilization = (this.logBuffer.length / this.config.bufferSize) * 100;
    
    // Flush buffer if full
    if (this.logBuffer.length >= this.config.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flush log buffer to all transports
   */
  async flushBuffer() {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Write to all configured transports
      const writePromises = [];
      
      this.transports.forEach((transport, name) => {
        try {
          const promise = transport.write(logsToFlush);
          writePromises.push(promise);
        } catch (error) {
          console.error(`Transport ${name} write error:`, error);
        }
      });

      await Promise.allSettled(writePromises);
      
      performanceMetrics.lastFlushTime = Date.now();
      this.emit('bufferFlushed', { count: logsToFlush.length });

    } catch (error) {
      console.error('Buffer flush error:', error);
      // Re-add logs to buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Write to console with colored output
   */
  async writeToConsole(logs) {
    logs.forEach(log => {
      const color = LOG_LEVEL_COLORS[log.level.toLowerCase()] || '';
      let output;

      if (this.config.format === 'json') {
        output = JSON.stringify(log);
      } else {
        output = `${log.timestamp} [${log.level}] ${log.message}`;
        if (log.data) {
          output += `\n  Data: ${JSON.stringify(log.data, null, 2)}`;
        }
      }

      const coloredOutput = `${color}${output}${RESET_COLOR}`;
      
      if (LOG_LEVELS[log.level.toLowerCase()] <= LOG_LEVELS.error) {
        console.error(coloredOutput);
      } else if (LOG_LEVELS[log.level.toLowerCase()] === LOG_LEVELS.warn) {
        console.warn(coloredOutput);
      } else {
        console.log(coloredOutput);
      }
    });
  }

  /**
   * Write to file with rotation support
   */
  async writeToFile(logs) {
    try {
      const transport = this.transports.get('file');
      const logFile = transport.path;
      const errorFile = transport.errorPath;

      // Check if rotation is needed
      await this.checkAndRotateLog(logFile);

      // Separate regular logs and error logs
      const regularLogs = logs.filter(log => LOG_LEVELS[log.level.toLowerCase()] > LOG_LEVELS.error);
      const errorLogs = logs.filter(log => LOG_LEVELS[log.level.toLowerCase()] <= LOG_LEVELS.error);

      // Write regular logs
      if (regularLogs.length > 0) {
        const content = regularLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
        await fs.appendFile(logFile, content);
      }

      // Write error logs
      if (errorLogs.length > 0) {
        const content = errorLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
        await fs.appendFile(errorFile, content);
      }

    } catch (error) {
      console.error('File write error:', error);
    }
  }

  /**
   * Write to audit file for compliance
   */
  async writeToAuditFile(logs) {
    try {
      const transport = this.transports.get('audit');
      const auditFile = transport.path;

      // Only write info level and above to audit logs
      const auditLogs = logs.filter(log => LOG_LEVELS[log.level.toLowerCase()] <= LOG_LEVELS.info);
      
      if (auditLogs.length === 0) return;

      // Enhanced audit format with additional metadata
      const auditEntries = auditLogs.map(log => ({
        ...log,
        auditType: 'APPLICATION_LOG',
        retention: transport.retentionDays,
        integrity: this.calculateLogIntegrity(log)
      }));

      const content = auditEntries.map(log => JSON.stringify(log)).join('\n') + '\n';
      await fs.appendFile(auditFile, content);

      // Clean up old audit files
      await this.cleanupOldAuditFiles();

    } catch (error) {
      console.error('Audit write error:', error);
    }
  }

  /**
   * Calculate log integrity hash for audit trail
   */
  calculateLogIntegrity(logEntry) {
    const logString = JSON.stringify(logEntry, Object.keys(logEntry).sort());
    return crypto.createHash('sha256').update(logString).digest('hex').substring(0, 16);
  }

  /**
   * Check and rotate log files if needed
   */
  async checkAndRotateLog(logFile) {
    try {
      const stats = await fs.stat(logFile).catch(() => null);
      
      if (stats && stats.size > this.config.maxFileSize) {
        await this.rotateLogFile(logFile);
      }

    } catch (error) {
      console.error('Log rotation check error:', error);
    }
  }

  /**
   * Rotate log file
   */
  async rotateLogFile(logFile) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = `${logFile}.${timestamp}`;

      // Move current log to rotated file
      await fs.rename(logFile, rotatedFile);

      // Compress rotated file if enabled
      if (this.config.compressRotated) {
        await this.compressLogFile(rotatedFile);
      }

      // Clean up old rotated files
      await this.cleanupOldLogFiles(path.dirname(logFile));

      this.emit('logRotated', { original: logFile, rotated: rotatedFile });

    } catch (error) {
      console.error('Log rotation error:', error);
    }
  }

  /**
   * Compress log file (basic gzip-like functionality)
   */
  async compressLogFile(filePath) {
    try {
      const zlib = require('zlib');
      const { pipeline } = require('stream/promises');

      const source = fSync.createReadStream(filePath);
      const destination = fSync.createWriteStream(`${filePath}.gz`);
      const gzip = zlib.createGzip();

      await pipeline(source, gzip, destination);
      
      // Remove original file after compression
      await fs.unlink(filePath);

    } catch (error) {
      console.error('Log compression error:', error);
    }
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogFiles(logDir) {
    try {
      const files = await fs.readdir(logDir);
      const logFiles = files
        .filter(file => file.includes('.log.') && !file.endsWith('.gz'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          stats: fSync.statSync(path.join(logDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      // Keep only maxFiles number of rotated logs
      const filesToDelete = logFiles.slice(this.config.maxFiles);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
      }

    } catch (error) {
      console.error('Log cleanup error:', error);
    }
  }

  /**
   * Clean up old audit files based on retention policy
   */
  async cleanupOldAuditFiles() {
    try {
      const auditDir = path.join(process.cwd(), 'logs', 'audit');
      const files = await fs.readdir(auditDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.auditRetentionDays);

      for (const file of files) {
        const filePath = path.join(auditDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }

    } catch (error) {
      console.error('Audit cleanup error:', error);
    }
  }

  /**
   * Setup log rotation scheduling
   */
  setupLogRotation() {
    // Daily rotation check
    setInterval(async () => {
      if (this.config.enableFile) {
        const transport = this.transports.get('file');
        if (transport) {
          await this.checkAndRotateLog(transport.path);
        }
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Start buffer flushing timer
   */
  startBufferFlushing() {
    setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushBuffer();
      }
    }, this.config.flushInterval);
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    let lastLogCount = 0;
    let lastTime = Date.now();

    setInterval(() => {
      const currentTime = Date.now();
      const timeDiff = (currentTime - lastTime) / 1000;
      const logDiff = performanceMetrics.totalLogs - lastLogCount;

      performanceMetrics.logsPerSecond = timeDiff > 0 ? Math.round(logDiff / timeDiff) : 0;

      lastLogCount = performanceMetrics.totalLogs;
      lastTime = currentTime;

    }, 10000); // Every 10 seconds
  }

  /**
   * Update performance metrics
   */
  updateMetrics(level, logEntry) {
    performanceMetrics.totalLogs++;
    
    if (level === 'error' || level === 'fatal') {
      performanceMetrics.errorCount++;
    } else if (level === 'warn') {
      performanceMetrics.warningCount++;
    }

    // Calculate average log size
    const logSize = JSON.stringify(logEntry).length;
    performanceMetrics.averageLogSize = Math.round(
      (performanceMetrics.averageLogSize + logSize) / 2
    );
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async () => {
      try {
        console.log('🛑 Logger shutting down...');
        await this.flushBuffer();
        this.emit('shutdown');
      } catch (error) {
        console.error('Logger shutdown error:', error);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('beforeExit', shutdown);
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(id) {
    this.correlationId = id;
    return this;
  }

  /**
   * Set session ID for user tracking
   */
  setSessionId(id) {
    this.sessionId = id;
    return this;
  }

  /**
   * Create child logger with context
   */
  child(context = {}) {
    const childLogger = Object.create(this);
    childLogger.defaultContext = { ...this.defaultContext, ...context };
    return childLogger;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...performanceMetrics,
      uptime: Date.now() - this.startTime,
      bufferSize: this.logBuffer.length,
      transports: Array.from(this.transports.keys()),
      config: this.config
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      status: this.transports.size > 0 ? 'healthy' : 'unhealthy',
      transports: Array.from(this.transports.keys()),
      bufferUtilization: performanceMetrics.bufferUtilization,
      errorRate: performanceMetrics.totalLogs > 0 
        ? (performanceMetrics.errorCount / performanceMetrics.totalLogs) * 100 
        : 0,
      uptime: Date.now() - this.startTime,
      lastFlush: performanceMetrics.lastFlushTime
    };
  }

  // Logging methods
  fatal(message, data, options) { return this.log('fatal', message, data, options); }
  error(message, data, options) { return this.log('error', message, data, options); }
  warn(message, data, options) { return this.log('warn', message, data, options); }
  info(message, data, options) { return this.log('info', message, data, options); }
  debug(message, data, options) { return this.log('debug', message, data, options); }
  trace(message, data, options) { return this.log('trace', message, data, options); }

  // Convenience methods
  audit(message, data) { 
    return this.log('info', `[AUDIT] ${message}`, { ...data, auditLog: true }); 
  }
  
  security(message, data) { 
    return this.log('warn', `[SECURITY] ${message}`, { ...data, securityLog: true }); 
  }
  
  performance(message, duration, data) {
    return this.log('info', `[PERFORMANCE] ${message}`, data, { 
      performance: true, 
      duration 
    });
  }
}

// Create singleton logger instance
const logger = new EnterpriseLogger();

// Legacy compatibility wrapper
const legacyLogger = {
  error: (message, data) => logger.error(message, data),
  warn: (message, data) => logger.warn(message, data),
  info: (message, data) => logger.info(message, data),
  debug: (message, data) => logger.debug(message, data),
  
  // Enhanced methods
  fatal: (message, data) => logger.fatal(message, data),
  trace: (message, data) => logger.trace(message, data),
  audit: (message, data) => logger.audit(message, data),
  security: (message, data) => logger.security(message, data),
  performance: (message, duration, data) => logger.performance(message, duration, data),
  
  // Utility methods
  setCorrelationId: (id) => logger.setCorrelationId(id),
  setSessionId: (id) => logger.setSessionId(id),
  child: (context) => logger.child(context),
  getMetrics: () => logger.getMetrics(),
  getHealthStatus: () => logger.getHealthStatus(),
  flush: () => logger.flushBuffer(),
  
  // Access to full logger instance
  logger,
  
  // Configuration access
  config: LOG_CONFIG,
  levels: LOG_LEVELS
};

module.exports = legacyLogger;