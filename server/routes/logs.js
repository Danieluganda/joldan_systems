/**
 * Log Management Routes
 * 
 * Routes for comprehensive log management, analytics, and monitoring
 * Feature 15: Advanced logging system with analytics, retention policies, and real-time monitoring
 * 
 * Enhanced with authentication, structured logging, analytics, retention policies, real-time streaming,
 * advanced filtering, export capabilities, and comprehensive log lifecycle management
 */

const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const zlib = require('zlib');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, rateLimitByUser } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logView, logDelete, logUpdate } = require('../middleware/auditLogger');

// Service imports
const logAnalyticsService = require('../services/logAnalyticsService');
const notificationService = require('../services/notificationService');
const complianceService = require('../services/complianceService');
const exportService = require('../services/exportService');

// Utility imports
const logger = require('../utils/logger');
const { formatBytes, parseLogLine, validateLogEntry } = require('../utils/logUtils');

// Log directory setup with proper error handling
const logsDir = path.join(__dirname, '../logs');
const archivedLogsDir = path.join(logsDir, 'archived');
const analyticsDir = path.join(logsDir, 'analytics');

// Ensure directories exist
const initializeDirectories = async () => {
  try {
    await fs.mkdir(logsDir, { recursive: true });
    await fs.mkdir(archivedLogsDir, { recursive: true });
    await fs.mkdir(analyticsDir, { recursive: true });
  } catch (error) {
    console.error('Failed to initialize log directories:', error);
  }
};

// Initialize on startup
initializeDirectories();

// Log retention configuration
const LOG_RETENTION = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxAge: 90, // days
  compressionAge: 7, // days
  maxTotalSize: 5 * 1024 * 1024 * 1024 // 5GB total
};

// Validation schemas
const logValidation = {
  submit: {
    logs: { 
      type: 'array', 
      required: true, 
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'datetime', required: true },
          level: { type: 'string', enum: ['error', 'warn', 'info', 'debug', 'trace'], required: true },
          message: { type: 'string', required: true, maxLength: 2000 },
          data: { type: 'object' },
          component: { type: 'string', maxLength: 100 },
          userId: { type: 'string' },
          sessionId: { type: 'string' },
          requestId: { type: 'string' },
          userAgent: { type: 'string', maxLength: 500 },
          ipAddress: { type: 'string', format: 'ip' },
          category: { type: 'string', enum: ['system', 'security', 'audit', 'performance', 'business', 'error'] },
          tags: { type: 'array', items: { type: 'string' } },
          stack: { type: 'string' },
          duration: { type: 'number', min: 0 }
        }
      },
      minItems: 1,
      maxItems: 100
    },
    sessionId: { type: 'string', required: true, minLength: 1 },
    batchId: { type: 'string' },
    source: { type: 'string', enum: ['frontend', 'backend', 'mobile', 'api', 'worker'], default: 'frontend' },
    version: { type: 'string' },
    environment: { type: 'string', enum: ['development', 'staging', 'production'], default: 'production' }
  },
  query: {
    level: { type: 'string', enum: ['error', 'warn', 'info', 'debug', 'trace'] },
    category: { type: 'string', enum: ['system', 'security', 'audit', 'performance', 'business', 'error'] },
    component: { type: 'string' },
    userId: { type: 'string' },
    sessionId: { type: 'string' },
    startDate: { type: 'string', format: 'datetime' },
    endDate: { type: 'string', format: 'datetime' },
    search: { type: 'string', minLength: 3, maxLength: 200 },
    tags: { type: 'string' }, // Comma-separated tags
    source: { type: 'string', enum: ['frontend', 'backend', 'mobile', 'api', 'worker'] },
    hasStack: { type: 'boolean' },
    minDuration: { type: 'number', min: 0 },
    maxDuration: { type: 'number', min: 0 },
    ipAddress: { type: 'string' },
    includeData: { type: 'boolean', default: false },
    format: { type: 'string', enum: ['json', 'text', 'csv'], default: 'json' },
    realTime: { type: 'boolean', default: false },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 1000, default: 100 },
    sortBy: { type: 'string', enum: ['timestamp', 'level', 'component', 'duration'], default: 'timestamp' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
  },
  params: {
    filename: { type: 'string', required: true, pattern: '^[a-zA-Z0-9_-]+\\.log(\\.gz)?$' },
    id: { type: 'string', required: true }
  },
  analytics: {
    timeframe: { type: 'string', enum: ['1h', '6h', '24h', '7d', '30d'], default: '24h' },
    groupBy: { type: 'string', enum: ['level', 'component', 'category', 'hour', 'day'], default: 'level' },
    includeMetrics: { type: 'boolean', default: true },
    includeCharts: { type: 'boolean', default: false }
  },
  export: {
    format: { type: 'string', enum: ['json', 'csv', 'xlsx', 'txt'], default: 'json' },
    compressed: { type: 'boolean', default: false },
    includeData: { type: 'boolean', default: true },
    maxRecords: { type: 'number', min: 1, max: 100000, default: 10000 }
  },
  retention: {
    maxAge: { type: 'number', min: 1, max: 365, default: 90 },
    maxSize: { type: 'number', min: 1024, max: 10737418240 }, // 1KB to 10GB
    compressionAge: { type: 'number', min: 1, max: 30, default: 7 },
    archiveOld: { type: 'boolean', default: true }
  }
};

/**
 * @route   POST /api/logs
 * @desc    Submit logs from frontend/backend with advanced processing
 * @access  Private - requires 'logs:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('logs:create'),
  rateLimitByUser(1000, '1h'), // 1000 logs per hour per user
  validateBody(logValidation.submit),
  sanitize(),
  logCreate('logs'),
  asyncHandler(async (req, res) => {
    const { 
      logs, 
      sessionId, 
      batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source = 'frontend',
      version,
      environment = process.env.NODE_ENV || 'production'
    } = req.body;

    const processedLogs = [];
    const errors = [];

    // Enrich and validate each log entry
    for (let i = 0; i < logs.length; i++) {
      try {
        const logEntry = {
          ...logs[i],
          id: `log_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          receivedAt: new Date().toISOString(),
          processedBy: req.user.id,
          sessionId,
          batchId,
          source,
          version,
          environment,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          userId: logs[i].userId || req.user.id
        };

        // Additional validation
        const validation = validateLogEntry(logEntry);
        if (!validation.isValid) {
          errors.push({
            index: i,
            error: validation.error
          });
          continue;
        }

        // Sanitize sensitive data
        if (logEntry.data) {
          logEntry.data = sanitizeSensitiveData(logEntry.data);
        }

        // Add derived fields
        logEntry.severity = mapLevelToSeverity(logEntry.level);
        logEntry.priority = calculatePriority(logEntry);
        
        processedLogs.push(logEntry);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    // Save logs to appropriate files
    const savedResults = await saveLogEntries(processedLogs, {
      sessionId,
      batchId,
      userId: req.user.id
    });

    // Trigger real-time analytics update
    await updateRealTimeAnalytics(processedLogs);

    // Check for critical errors and send alerts
    const criticalLogs = processedLogs.filter(log => 
      ['error', 'fatal'].includes(log.level) || log.priority === 'critical'
    );

    if (criticalLogs.length > 0) {
      await handleCriticalLogs(criticalLogs);
    }

    // Update log analytics
    logAnalyticsService.processLogBatch(processedLogs);

    res.json({
      success: true,
      message: `Processed ${processedLogs.length} log entries`,
      data: {
        processed: processedLogs.length,
        errors: errors.length,
        batchId,
        sessionId,
        savedFiles: savedResults.files,
        totalSize: savedResults.totalSize,
        criticalAlerts: criticalLogs.length
      },
      errors: errors.length > 0 ? errors : undefined
    });
  })
);

/**
 * @route   GET /api/logs
 * @desc    Search and retrieve logs with advanced filtering
 * @access  Private - requires 'logs:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('logs:read'),
  validateQuery(logValidation.query),
  sanitize(),
  logView('logs', 'search'),
  asyncHandler(async (req, res) => {
    const {
      level,
      category,
      component,
      userId,
      sessionId,
      startDate,
      endDate,
      search,
      tags,
      source,
      hasStack,
      minDuration,
      maxDuration,
      ipAddress,
      includeData = false,
      format = 'json',
      realTime = false,
      page = 1,
      limit = 100,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build search criteria
    const searchCriteria = {
      level,
      category,
      component,
      userId,
      sessionId,
      source,
      hasStack: hasStack === 'true',
      ipAddress,
      dateRange: {
        start: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000), // Default 24h ago
        end: endDate ? new Date(endDate) : new Date()
      },
      textSearch: search,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      duration: {
        min: minDuration ? parseFloat(minDuration) : undefined,
        max: maxDuration ? parseFloat(maxDuration) : undefined
      }
    };

    // Apply user-level filtering if not admin
    if (!req.user.permissions.includes('logs:read:all')) {
      searchCriteria.accessibleUsers = [req.user.id];
    }

    const searchOptions = {
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeData: includeData === 'true',
      format
    };

    let results;
    if (realTime === 'true') {
      // Setup Server-Sent Events for real-time logs
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const streamId = await setupRealTimeLogStream(searchCriteria, res);
      
      // Send initial batch
      const initialLogs = await searchLogs(searchCriteria, searchOptions);
      res.write(`data: ${JSON.stringify({ type: 'initial', data: initialLogs })}\n\n`);

      // Keep connection alive
      req.on('close', () => {
        cleanupRealTimeLogStream(streamId);
      });

      return; // Keep connection open
    }

    // Regular search
    results = await searchLogs(searchCriteria, searchOptions);

    // Format response based on requested format
    if (format === 'csv') {
      const csvData = await formatLogsAsCSV(results.logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="logs_${Date.now()}.csv"`);
      return res.send(csvData);
    }

    if (format === 'text') {
      const textData = formatLogsAsText(results.logs);
      res.setHeader('Content-Type', 'text/plain');
      return res.send(textData);
    }

    res.json({
      success: true,
      data: results.logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: results.totalPages,
        totalRecords: results.totalRecords,
        hasNextPage: results.hasNextPage,
        hasPrevPage: results.hasPrevPage
      },
      summary: {
        levelBreakdown: results.levelBreakdown,
        categoryBreakdown: results.categoryBreakdown,
        componentBreakdown: results.componentBreakdown,
        timeRange: searchCriteria.dateRange,
        totalSize: results.totalSize
      },
      searchCriteria,
      performance: {
        searchTime: results.searchTime,
        resultSize: results.resultSize,
        indexesUsed: results.indexesUsed
      }
    });
  })
);

/**
 * @route   GET /api/logs/files
 * @desc    List available log files with metadata
 * @access  Private - requires 'logs:read' permission
 */
router.get('/files',
  verifyToken,
  checkPermission('logs:read'),
  validateQuery({
    includeArchived: { type: 'boolean', default: false },
    sortBy: { type: 'string', enum: ['name', 'size', 'modified', 'created'], default: 'modified' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
  }),
  logView('logs', 'files'),
  asyncHandler(async (req, res) => {
    const { includeArchived = false, sortBy = 'modified', sortOrder = 'desc' } = req.query;

    const logFiles = [];
    
    // Get current log files
    const currentFiles = await fs.readdir(logsDir);
    for (const filename of currentFiles) {
      if (!filename.endsWith('.log')) continue;

      const filePath = path.join(logsDir, filename);
      const stats = await fs.stat(filePath);
      
      logFiles.push({
        name: filename,
        path: `current/${filename}`,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        type: 'current',
        compressed: false,
        metadata: await getLogFileMetadata(filePath)
      });
    }

    // Get archived files if requested
    if (includeArchived === 'true') {
      try {
        const archivedFiles = await fs.readdir(archivedLogsDir);
        for (const filename of archivedFiles) {
          const filePath = path.join(archivedLogsDir, filename);
          const stats = await fs.stat(filePath);
          
          logFiles.push({
            name: filename,
            path: `archived/${filename}`,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
            type: 'archived',
            compressed: filename.endsWith('.gz'),
            metadata: await getLogFileMetadata(filePath)
          });
        }
      } catch (error) {
        // Archived directory might not exist
      }
    }

    // Sort files
    logFiles.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);

    res.json({
      success: true,
      data: logFiles,
      summary: {
        totalFiles: logFiles.length,
        currentFiles: logFiles.filter(f => f.type === 'current').length,
        archivedFiles: logFiles.filter(f => f.type === 'archived').length,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        oldestFile: logFiles.length > 0 ? Math.min(...logFiles.map(f => f.created)) : null,
        newestFile: logFiles.length > 0 ? Math.max(...logFiles.map(f => f.modified)) : null
      }
    });
  })
);

/**
 * @route   GET /api/logs/files/:filename
 * @desc    Download or view specific log file with streaming support
 * @access  Private - requires 'logs:read' permission
 */
router.get('/files/:filename',
  verifyToken,
  checkPermission('logs:read'),
  validateParams(logValidation.params),
  validateQuery({
    download: { type: 'boolean', default: false },
    tail: { type: 'number', min: 1, max: 10000 },
    head: { type: 'number', min: 1, max: 10000 },
    stream: { type: 'boolean', default: false }
  }),
  logView('logs', 'file-access'),
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const { download = false, tail, head, stream = false } = req.query;

    // Security: Validate filename pattern
    if (!/^[a-zA-Z0-9_-]+\.log(\.gz)?$/.test(filename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename format'
      });
    }

    // Try current logs directory first
    let filePath = path.join(logsDir, filename);
    let fileType = 'current';
    
    // Check if file exists in current directory
    try {
      await fs.access(filePath);
    } catch {
      // Try archived directory
      filePath = path.join(archivedLogsDir, filename);
      fileType = 'archived';
      
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Log file not found'
        });
      }
    }

    const stats = await fs.stat(filePath);
    const isCompressed = filename.endsWith('.gz');

    // Handle streaming request
    if (stream === 'true') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const streamHandler = await setupFileStream(filePath, res, isCompressed);
      
      req.on('close', () => {
        streamHandler.cleanup();
      });

      return;
    }

    // Handle download request
    if (download === 'true') {
      const contentType = isCompressed ? 'application/gzip' : 'text/plain';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', stats.size);

      const readStream = createReadStream(filePath);
      readStream.pipe(res);
      return;
    }

    // Read file content with tail/head options
    let content;
    if (isCompressed) {
      content = await readCompressedFile(filePath);
    } else {
      content = await fs.readFile(filePath, 'utf-8');
    }

    const lines = content.split('\n').filter(line => line.trim());
    let selectedLines = lines;

    if (tail) {
      selectedLines = lines.slice(-parseInt(tail));
    } else if (head) {
      selectedLines = lines.slice(0, parseInt(head));
    }

    // Parse log lines into structured format
    const parsedLogs = selectedLines.map((line, index) => {
      try {
        return parseLogLine(line, index);
      } catch (error) {
        return {
          index,
          raw: line,
          parseError: error.message
        };
      }
    });

    res.json({
      success: true,
      data: {
        filename,
        fileType,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        modified: stats.mtime,
        compressed: isCompressed,
        totalLines: lines.length,
        displayedLines: selectedLines.length,
        content: selectedLines.join('\n'),
        parsedLogs: parsedLogs,
        metadata: await getLogFileMetadata(filePath)
      }
    });
  })
);

/**
 * @route   GET /api/logs/analytics
 * @desc    Get log analytics and insights
 * @access  Private - requires 'logs:read' permission
 */
router.get('/analytics',
  verifyToken,
  checkPermission('logs:read'),
  validateQuery(logValidation.analytics),
  logView('logs', 'analytics'),
  asyncHandler(async (req, res) => {
    const {
      timeframe = '24h',
      groupBy = 'level',
      includeMetrics = true,
      includeCharts = false
    } = req.query;

    const analytics = await logAnalyticsService.getAnalytics({
      timeframe,
      groupBy,
      includeMetrics: includeMetrics === 'true',
      includeCharts: includeCharts === 'true',
      userId: req.user.permissions.includes('logs:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics,
      generatedAt: new Date().toISOString(),
      timeframe,
      groupBy
    });
  })
);

/**
 * @route   POST /api/logs/export
 * @desc    Export logs in various formats
 * @access  Private - requires 'logs:export' permission
 */
router.post('/export',
  verifyToken,
  checkPermission('logs:export'),
  validateBody({
    ...logValidation.query,
    ...logValidation.export
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const exportRequest = {
      ...req.body,
      requestedBy: req.user.id,
      requestedAt: new Date()
    };

    const exportJob = await exportService.createLogExportJob(exportRequest);

    // For small exports, process immediately
    if (exportRequest.maxRecords <= 1000) {
      const exportData = await exportService.processLogExport(exportJob.id);
      
      const contentType = getContentType(exportRequest.format);
      const filename = `logs-export-${Date.now()}.${exportRequest.format}`;
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (exportRequest.compressed === 'true') {
        const compressed = await compressData(exportData);
        res.setHeader('Content-Encoding', 'gzip');
        return res.send(compressed);
      }
      
      return res.send(exportData);
    }

    // For large exports, process asynchronously
    exportService.processLogExportAsync(exportJob.id);

    res.json({
      success: true,
      data: {
        exportId: exportJob.id,
        status: 'processing',
        estimatedTime: exportJob.estimatedTime,
        downloadUrl: `/api/logs/exports/${exportJob.id}/download`
      },
      message: 'Export job created successfully'
    });
  })
);

/**
 * @route   POST /api/logs/retention
 * @desc    Manage log retention policies
 * @access  Private - requires 'logs:manage' permission
 */
router.post('/retention',
  verifyToken,
  checkPermission('logs:manage'),
  validateBody(logValidation.retention),
  sanitize(),
  logUpdate('logs'),
  asyncHandler(async (req, res) => {
    const retentionPolicy = {
      ...req.body,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    const result = await applyRetentionPolicy(retentionPolicy);

    res.json({
      success: true,
      data: result,
      message: 'Retention policy applied successfully'
    });
  })
);

/**
 * @route   DELETE /api/logs/files/:filename
 * @desc    Delete specific log file
 * @access  Private - requires 'logs:delete' permission
 */
router.delete('/files/:filename',
  verifyToken,
  checkPermission('logs:delete'),
  validateParams(logValidation.params),
  logDelete('logs'),
  asyncHandler(async (req, res) => {
    const { filename } = req.params;

    // Security: Validate filename
    if (!/^[a-zA-Z0-9_-]+\.log(\.gz)?$/.test(filename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename format'
      });
    }

    let filePath = path.join(logsDir, filename);
    let fileType = 'current';

    // Check current directory first
    try {
      await fs.access(filePath);
    } catch {
      // Try archived directory
      filePath = path.join(archivedLogsDir, filename);
      fileType = 'archived';
      
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Log file not found'
        });
      }
    }

    const stats = await fs.stat(filePath);
    await fs.unlink(filePath);

    logger.info(`Log file deleted: ${filename}`, {
      filename,
      fileType,
      size: stats.size,
      deletedBy: req.user.id,
      deletedAt: new Date()
    });

    res.json({
      success: true,
      data: {
        filename,
        fileType,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size)
      },
      message: `Successfully deleted ${filename}`
    });
  })
);

// Helper functions

/**
 * Save log entries to appropriate files with rotation
 */
async function saveLogEntries(logs, metadata) {
  const results = { files: [], totalSize: 0 };
  
  // Group logs by date for daily rotation
  const logsByDate = groupLogsByDate(logs);
  
  for (const [dateStr, dateLogs] of Object.entries(logsByDate)) {
    const filename = `${metadata.sessionId}_${dateStr}.log`;
    const filePath = path.join(logsDir, filename);
    
    // Format logs for file storage
    const logContent = dateLogs.map(log => formatLogForFile(log)).join('\n') + '\n';
    
    // Append to file (create if doesn't exist)
    await fs.appendFile(filePath, logContent, 'utf8');
    
    // Also append to consolidated log
    const consolidatedPath = path.join(logsDir, 'consolidated.log');
    const consolidatedContent = dateLogs.map(log => 
      formatLogForFile({ ...log, sessionMetadata: metadata })
    ).join('\n') + '\n';
    
    await fs.appendFile(consolidatedPath, consolidatedContent, 'utf8');
    
    const fileSize = (await fs.stat(filePath)).size;
    
    results.files.push({
      filename,
      path: filePath,
      size: fileSize,
      logCount: dateLogs.length
    });
    
    results.totalSize += fileSize;
    
    // Check if file needs rotation
    if (fileSize > LOG_RETENTION.maxFileSize) {
      await rotateLogFile(filePath);
    }
  }
  
  return results;
}

/**
 * Additional helper functions would continue here...
 * Including: mapLevelToSeverity, calculatePriority, sanitizeSensitiveData,
 * updateRealTimeAnalytics, handleCriticalLogs, searchLogs, setupRealTimeLogStream,
 * formatLogsAsCSV, formatLogsAsText, getLogFileMetadata, readCompressedFile,
 * setupFileStream, parseLogLine, applyRetentionPolicy, rotateLogFile, etc.
 */

// ... (Additional helper functions would be implemented here)

module.exports = router;
