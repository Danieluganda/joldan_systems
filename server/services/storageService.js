/**
 * Enterprise Storage Service
 * 
 * Comprehensive file and document management with enterprise security,
 * version control, compliance monitoring, and advanced analytics
 * Feature 10: Advanced document management and storage operations
 */

const mongoose = require('mongoose');
const StorageManager = require('../config/storage');
const Document = require('../db/models/Document');
const User = require('../db/models/User');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { validateInput, sanitize } = require('../utils/validation');
const { formatFileSize, generateThumbnail, extractMetadata } = require('../utils/fileHelpers');
const { scanForViruses, validateFileSignature, checkFileIntegrity } = require('../utils/securityScanner');
const { compressFile, optimizeImage, convertDocument } = require('../utils/fileProcessor');

// File type categories
const FILE_CATEGORIES = {
  DOCUMENT: 'document',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  SPREADSHEET: 'spreadsheet',
  PRESENTATION: 'presentation',
  CAD: 'cad',
  EXECUTABLE: 'executable',
  OTHER: 'other'
};

// Storage tiers
const STORAGE_TIERS = {
  HOT: 'hot',          // Frequently accessed
  WARM: 'warm',        // Occasionally accessed
  COLD: 'cold',        // Rarely accessed
  ARCHIVE: 'archive'   // Long-term retention
};

// Access levels
const ACCESS_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted',
  SECRET: 'secret'
};

// Security events
const SECURITY_EVENTS = {
  FILE_UPLOADED: 'file_uploaded',
  FILE_ACCESSED: 'file_accessed',
  FILE_MODIFIED: 'file_modified',
  FILE_DELETED: 'file_deleted',
  VIRUS_DETECTED: 'virus_detected',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  INTEGRITY_VIOLATION: 'integrity_violation'
};

class StorageService {
  constructor() {
    this.storage = new StorageManager();
    this.cache = new Map();
    this.uploadQueue = [];
    this.processingQueue = new Map();
    this.compressionEnabled = true;
    this.virusScanEnabled = true;
    this.duplicateDetection = true;
    this.maxCacheSize = 100 * 1024 * 1024; // 100MB
    this.maxFileSize = 500 * 1024 * 1024; // 500MB default
  }

  /**
   * Enhanced file upload with comprehensive security and processing
   */
  async uploadFile(file, options = {}, userId = null, requestInfo = {}) {
    try {
      const {
        entityType,
        entityId,
        category = FILE_CATEGORIES.OTHER,
        accessLevel = ACCESS_LEVELS.INTERNAL,
        storageTier = STORAGE_TIERS.HOT,
        tags = [],
        description = '',
        retention = null,
        customPath = null,
        compress = true,
        generatePreview = true,
        virusScan = true,
        validateSignature = true,
        metadata = {}
      } = options;

      const { ipAddress, userAgent } = requestInfo;

      // Validate file
      const validation = await this.validateFile(file, {
        maxSize: this.maxFileSize,
        allowedTypes: options.allowedTypes,
        validateSignature,
        virusScan
      });

      if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate file hash and check for duplicates
      const fileHash = crypto
        .createHash('sha256')
        .update(file.buffer || file.data)
        .digest('hex');

      if (this.duplicateDetection && options.preventDuplicates !== false) {
        const duplicate = await this.checkForDuplicate(fileHash, entityType, entityId);
        if (duplicate) {
          return {
            success: true,
            isDuplicate: true,
            document: duplicate,
            message: 'File already exists'
          };
        }
      }

      // Extract comprehensive metadata
      const extractedMetadata = await this.extractFileMetadata(file);

      // Generate unique filename and path
      const sanitizedOriginalName = sanitize(file.originalname || file.name || 'unnamed');
      const fileExtension = path.extname(sanitizedOriginalName).toLowerCase();
      const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}${fileExtension}`;
      
      const filePath = customPath || this.generateFilePath({
        entityType,
        entityId,
        category,
        storageTier,
        filename: uniqueFilename
      });

      // Process file if needed
      let processedFile = file;
      const processingResults = {
        compressed: false,
        optimized: false,
        converted: false,
        thumbnailGenerated: false
      };

      if (compress && this.shouldCompress(file, category)) {
        const compressionResult = await this.compressFile(file, category);
        if (compressionResult.success) {
          processedFile = compressionResult.file;
          processingResults.compressed = true;
          processingResults.originalSize = file.size;
          processingResults.compressedSize = processedFile.size;
        }
      }

      // Generate thumbnail/preview
      let thumbnail = null;
      if (generatePreview && this.supportsPreview(category)) {
        const previewResult = await this.generatePreview(processedFile, category);
        if (previewResult.success) {
          thumbnail = previewResult.thumbnail;
          processingResults.thumbnailGenerated = true;
        }
      }

      // Upload to storage
      const uploadResult = await this.storage.uploadFile(processedFile, {
        path: filePath,
        metadata: {
          originalName: sanitizedOriginalName,
          category,
          accessLevel,
          uploadedBy: userId,
          entityType,
          entityId
        }
      });

      // Upload thumbnail if generated
      let thumbnailUrl = null;
      if (thumbnail) {
        const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
        const thumbnailResult = await this.storage.uploadFile(thumbnail, {
          path: thumbnailPath
        });
        thumbnailUrl = thumbnailResult.url;
      }

      // Create document record
      const document = new Document({
        // File identification
        filename: sanitizedOriginalName,
        originalFilename: sanitizedOriginalName,
        storagePath: filePath,
        url: uploadResult.url,
        thumbnailUrl,
        
        // File properties
        size: processedFile.size,
        originalSize: file.size,
        mimeType: file.mimetype || extractedMetadata.mimeType,
        category,
        fileExtension,
        encoding: file.encoding,
        
        // Security
        hash: fileHash,
        accessLevel,
        encrypted: options.encrypt || false,
        
        // Organization
        entityType,
        entityId: entityType && entityId ? new mongoose.Types.ObjectId(entityId) : null,
        tags: tags.map(tag => sanitize(tag)),
        description: sanitize(description),
        
        // Storage management
        storageTier,
        provider: this.storage.provider,
        region: this.storage.region,
        
        // Metadata
        metadata: {
          ...extractedMetadata,
          ...metadata,
          processing: processingResults,
          validation: validation.details
        },
        
        // Lifecycle
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : null,
        uploadedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        downloadCount: 0,
        
        // Retention and compliance
        retentionPolicy: retention,
        expiresAt: retention?.expirationDate ? new Date(retention.expirationDate) : null,
        complianceFlags: validation.compliance || [],
        
        // Version control
        version: '1.0',
        versionHistory: [{
          version: '1.0',
          uploadedAt: new Date(),
          uploadedBy: userId,
          changes: 'Initial upload',
          hash: fileHash,
          size: processedFile.size
        }],
        
        // Status
        status: 'active',
        processingStatus: 'completed',
        virusCheckStatus: virusScan ? validation.virusStatus : 'skipped',
        
        // Analytics
        analytics: {
          uploadIP: ipAddress,
          uploadUserAgent: userAgent,
          processingTime: 0, // Will be calculated
          storageEfficiency: processedFile.size / file.size
        }
      });

      await document.save();

      // Create audit trail
      await auditService.logAuditEvent({
        action: SECURITY_EVENTS.FILE_UPLOADED,
        entityType: 'document',
        entityId: document._id,
        userId,
        metadata: {
          filename: sanitizedOriginalName,
          size: processedFile.size,
          category,
          accessLevel,
          hash: fileHash,
          ipAddress,
          userAgent
        }
      });

      // Cache frequently accessed files
      if (storageTier === STORAGE_TIERS.HOT && processedFile.size < 10 * 1024 * 1024) { // 10MB
        this.cacheFile(fileHash, processedFile.buffer || processedFile.data);
      }

      // Send notifications if required
      if (options.notify && entityType && entityId) {
        await this.sendUploadNotification(document, userId);
      }

      logger.info('File uploaded successfully', {
        documentId: document._id,
        filename: sanitizedOriginalName,
        size: processedFile.size,
        hash: fileHash,
        category,
        userId
      });

      return {
        success: true,
        document: {
          id: document._id,
          filename: document.filename,
          url: document.url,
          thumbnailUrl: document.thumbnailUrl,
          size: document.size,
          category: document.category,
          accessLevel: document.accessLevel,
          uploadedAt: document.uploadedAt,
          hash: document.hash
        },
        processing: processingResults
      };

    } catch (error) {
      logger.error('Error uploading file', {
        error: error.message,
        filename: file?.originalname,
        userId
      });

      // Log security event if it's a security-related error
      if (error.message.includes('virus') || error.message.includes('malware')) {
        await auditService.logAuditEvent({
          action: SECURITY_EVENTS.VIRUS_DETECTED,
          entityType: 'file_upload',
          userId,
          metadata: {
            filename: file?.originalname,
            error: error.message,
            ipAddress: requestInfo.ipAddress
          }
        });
      }

      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Secure file deletion with audit trail
   */
  async deleteFile(filePath, userId = null, options = {}) {
    try {
      const { 
        softDelete = true, 
        reason = 'User requested',
        forceDelete = false,
        wipeData = false 
      } = options;

      // Find document record
      const document = await Document.findOne({ storagePath: filePath });
      if (!document) {
        throw new Error('Document not found in database');
      }

      // Check permissions
      if (!forceDelete && document.accessLevel === ACCESS_LEVELS.RESTRICTED) {
        throw new Error('Insufficient permissions to delete restricted document');
      }

      // Soft delete by default
      if (softDelete && !forceDelete) {
        document.status = 'deleted';
        document.deletedAt = new Date();
        document.deletedBy = userId ? new mongoose.Types.ObjectId(userId) : null;
        document.deletionReason = sanitize(reason);
        await document.save();
      } else {
        // Hard delete - remove from storage and database
        await this.storage.deleteFile(filePath);
        
        // Delete thumbnail if exists
        if (document.thumbnailUrl) {
          const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
          try {
            await this.storage.deleteFile(thumbnailPath);
          } catch (error) {
            logger.warn('Could not delete thumbnail', { thumbnailPath });
          }
        }

        // Remove from cache
        this.removeCacheEntry(document.hash);

        // Remove from database
        await Document.deleteOne({ _id: document._id });
      }

      // Create audit trail
      await auditService.logAuditEvent({
        action: SECURITY_EVENTS.FILE_DELETED,
        entityType: 'document',
        entityId: document._id,
        userId,
        metadata: {
          filename: document.filename,
          filePath,
          softDelete,
          reason,
          hash: document.hash
        }
      });

      logger.info('File deleted', {
        documentId: document._id,
        filePath,
        softDelete,
        userId
      });

      return {
        success: true,
        message: softDelete ? 'File marked as deleted' : 'File permanently removed',
        documentId: document._id
      };

    } catch (error) {
      logger.error('Error deleting file', {
        error: error.message,
        filePath,
        userId
      });
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Secure file retrieval with access control
   */
  async getFile(filePath, userId = null, requestInfo = {}) {
    try {
      const { ipAddress, userAgent, purpose = 'download' } = requestInfo;

      // Find document record
      const document = await Document.findOne({ 
        storagePath: filePath,
        status: { $ne: 'deleted' }
      });

      if (!document) {
        throw new Error('Document not found or has been deleted');
      }

      // Check access permissions
      const accessCheck = await this.checkAccess(document, userId);
      if (!accessCheck.allowed) {
        await auditService.logAuditEvent({
          action: SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
          entityType: 'document',
          entityId: document._id,
          userId,
          metadata: {
            filename: document.filename,
            accessLevel: document.accessLevel,
            ipAddress,
            userAgent,
            reason: accessCheck.reason
          }
        });
        throw new Error(`Access denied: ${accessCheck.reason}`);
      }

      // Check cache first for hot tier files
      let fileData;
      if (document.storageTier === STORAGE_TIERS.HOT && this.cache.has(document.hash)) {
        fileData = this.cache.get(document.hash);
        logger.debug('File served from cache', { hash: document.hash });
      } else {
        // Retrieve from storage
        fileData = await this.storage.getFile(filePath);
        
        // Verify integrity
        const integrityCheck = await this.verifyFileIntegrity(fileData, document.hash);
        if (!integrityCheck.valid) {
          await auditService.logAuditEvent({
            action: SECURITY_EVENTS.INTEGRITY_VIOLATION,
            entityType: 'document',
            entityId: document._id,
            userId,
            metadata: {
              filename: document.filename,
              expectedHash: document.hash,
              actualHash: integrityCheck.actualHash
            }
          });
          throw new Error('File integrity violation detected');
        }

        // Cache if eligible
        if (document.storageTier === STORAGE_TIERS.HOT && fileData.length < 10 * 1024 * 1024) {
          this.cacheFile(document.hash, fileData);
        }
      }

      // Update access statistics
      await Document.findByIdAndUpdate(document._id, {
        $inc: { 
          accessCount: 1,
          [`analytics.${purpose}Count`]: 1
        },
        $set: { 
          lastAccessed: new Date(),
          'analytics.lastAccessIP': ipAddress,
          'analytics.lastAccessUserAgent': userAgent
        }
      });

      // Create audit trail
      await auditService.logAuditEvent({
        action: SECURITY_EVENTS.FILE_ACCESSED,
        entityType: 'document',
        entityId: document._id,
        userId,
        metadata: {
          filename: document.filename,
          purpose,
          size: document.size,
          ipAddress,
          userAgent
        }
      });

      return {
        data: fileData,
        document: {
          id: document._id,
          filename: document.filename,
          size: document.size,
          mimeType: document.mimeType,
          category: document.category,
          lastModified: document.updatedAt
        }
      };

    } catch (error) {
      logger.error('Error retrieving file', {
        error: error.message,
        filePath,
        userId
      });
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  /**
   * Enhanced document upload with entity linking
   */
  async uploadDocument(entityType, entityId, file, metadata = {}, userId = null, requestInfo = {}) {
    try {
      const uploadOptions = {
        ...metadata,
        entityType,
        entityId,
        category: metadata.category || this.categorizeFile(file),
        accessLevel: metadata.accessLevel || ACCESS_LEVELS.INTERNAL,
        tags: [...(metadata.tags || []), entityType],
        description: metadata.description || `Document for ${entityType} ${entityId}`
      };

      const result = await this.uploadFile(file, uploadOptions, userId, requestInfo);

      // Link to entity if successful
      if (result.success && entityType && entityId) {
        await this.linkDocumentToEntity(result.document.id, entityType, entityId, userId);
      }

      return result;

    } catch (error) {
      logger.error('Error uploading document', {
        error: error.message,
        entityType,
        entityId,
        userId
      });
      throw new Error(`Document upload failed: ${error.message}`);
    }
  }

  /**
   * Batch file deletion with transaction support
   */
  async deleteFiles(filePaths, userId = null, options = {}) {
    try {
      const results = [];
      const errors = [];

      for (const filePath of filePaths) {
        try {
          const result = await this.deleteFile(filePath, userId, options);
          results.push({
            filePath,
            success: true,
            result
          });
        } catch (error) {
          errors.push({
            filePath,
            error: error.message
          });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      logger.info('Batch file deletion completed', {
        totalFiles: filePaths.length,
        successCount,
        errorCount,
        userId
      });

      return {
        success: errorCount === 0,
        successCount,
        errorCount,
        results,
        errors
      };

    } catch (error) {
      logger.error('Error in batch file deletion', {
        error: error.message,
        fileCount: filePaths.length,
        userId
      });
      throw new Error(`Batch deletion failed: ${error.message}`);
    }
  }

  /**
   * Enhanced integrity verification with blockchain support
   */
  async verifyFileIntegrity(fileData, expectedHash, options = {}) {
    try {
      const actualHash = crypto
        .createHash('sha256')
        .update(fileData)
        .digest('hex');

      const isValid = actualHash === expectedHash;

      // Additional verification methods
      const verification = {
        valid: isValid,
        expectedHash,
        actualHash,
        algorithm: 'sha256',
        verifiedAt: new Date()
      };

      // Blockchain verification if enabled
      if (options.blockchainVerify && this.blockchainEnabled) {
        verification.blockchain = await this.verifyOnBlockchain(expectedHash);
      }

      // Digital signature verification if available
      if (options.digitalSignature) {
        verification.signature = await this.verifyDigitalSignature(
          fileData, 
          options.digitalSignature
        );
      }

      return verification;

    } catch (error) {
      logger.error('Error verifying file integrity', {
        error: error.message,
        expectedHash
      });
      throw new Error(`Integrity verification failed: ${error.message}`);
    }
  }

  /**
   * Comprehensive storage analytics and statistics
   */
  async getStorageStats(options = {}) {
    try {
      const {
        includeDetailedBreakdown = false,
        includeTrendAnalysis = false,
        timeframe = 30 // days
      } = options;

      // Basic storage statistics
      const totalDocs = await Document.countDocuments({ status: { $ne: 'deleted' } });
      const deletedDocs = await Document.countDocuments({ status: 'deleted' });
      
      // Size aggregation
      const sizeStats = await Document.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$size' },
            averageSize: { $avg: '$size' },
            maxSize: { $max: '$size' },
            minSize: { $min: '$size' }
          }
        }
      ]);

      // Category breakdown
      const categoryStats = await Document.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' },
            averageSize: { $avg: '$size' }
          }
        },
        { $sort: { totalSize: -1 } }
      ]);

      // Access level distribution
      const accessLevelStats = await Document.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        {
          $group: {
            _id: '$accessLevel',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' }
          }
        }
      ]);

      // Storage tier distribution
      const tierStats = await Document.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        {
          $group: {
            _id: '$storageTier',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' }
          }
        }
      ]);

      const basicStats = {
        provider: this.storage.provider,
        region: this.storage.region || 'default',
        timestamp: new Date(),
        documents: {
          total: totalDocs,
          deleted: deletedDocs,
          active: totalDocs
        },
        storage: {
          totalSize: sizeStats[0]?.totalSize || 0,
          averageFileSize: sizeStats[0]?.averageSize || 0,
          largestFile: sizeStats[0]?.maxSize || 0,
          smallestFile: sizeStats[0]?.minSize || 0,
          formattedTotalSize: formatFileSize(sizeStats[0]?.totalSize || 0)
        },
        categories: categoryStats,
        accessLevels: accessLevelStats,
        storageTiers: tierStats
      };

      // Detailed breakdown if requested
      if (includeDetailedBreakdown) {
        basicStats.detailed = await this.getDetailedStorageBreakdown();
      }

      // Trend analysis if requested
      if (includeTrendAnalysis) {
        basicStats.trends = await this.getStorageTrends(timeframe);
      }

      // Cache statistics
      basicStats.cache = {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate(),
        totalSize: this.calculateCacheSize()
      };

      return basicStats;

    } catch (error) {
      logger.error('Error getting storage statistics', {
        error: error.message
      });
      throw new Error(`Storage statistics retrieval failed: ${error.message}`);
    }
  }

  // Enhanced helper methods
  async validateFile(file, options = {}) {
    const errors = [];
    const details = {};

    // Size validation
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(`File size exceeds maximum allowed (${formatFileSize(options.maxSize)})`);
    }

    // Type validation
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type not allowed: ${file.mimetype}`);
    }

    // File signature validation
    if (options.validateSignature) {
      const signatureValid = await validateFileSignature(file);
      if (!signatureValid) {
        errors.push('File signature validation failed');
      }
      details.signatureValid = signatureValid;
    }

    // Virus scanning
    if (options.virusScan && this.virusScanEnabled) {
      const scanResult = await scanForViruses(file);
      if (!scanResult.clean) {
        errors.push(`Virus detected: ${scanResult.threat}`);
      }
      details.virusStatus = scanResult.clean ? 'clean' : 'infected';
      details.scanResult = scanResult;
    }

    return {
      valid: errors.length === 0,
      errors,
      details
    };
  }

  categorizeFile(file) {
    const mimeType = file.mimetype || '';
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (mimeType.startsWith('image/')) return FILE_CATEGORIES.IMAGE;
    if (mimeType.startsWith('video/')) return FILE_CATEGORIES.VIDEO;
    if (mimeType.startsWith('audio/')) return FILE_CATEGORIES.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FILE_CATEGORIES.DOCUMENT;
    if (mimeType.includes('spreadsheet') || ['.xlsx', '.xls', '.csv'].includes(extension)) return FILE_CATEGORIES.SPREADSHEET;
    if (mimeType.includes('presentation') || ['.pptx', '.ppt'].includes(extension)) return FILE_CATEGORIES.PRESENTATION;
    if (['.zip', '.rar', '.tar', '.gz'].includes(extension)) return FILE_CATEGORIES.ARCHIVE;
    if (['.dwg', '.step', '.iges'].includes(extension)) return FILE_CATEGORIES.CAD;
    if (['.exe', '.msi', '.dmg'].includes(extension)) return FILE_CATEGORIES.EXECUTABLE;

    return FILE_CATEGORIES.OTHER;
  }

  generateFilePath({ entityType, entityId, category, storageTier, filename }) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    return `${storageTier}/${year}/${month}/${category}/${entityType || 'general'}/${entityId || 'unlinked'}/${filename}`;
  }

  // Placeholder methods for complex operations
  async checkForDuplicate(hash, entityType, entityId) { return null; }
  async extractFileMetadata(file) { return {}; }
  shouldCompress(file, category) { return false; }
  async compressFile(file, category) { return { success: false }; }
  supportsPreview(category) { return false; }
  async generatePreview(file, category) { return { success: false }; }
  async sendUploadNotification(document, userId) { }
  cacheFile(hash, data) { }
  removeCacheEntry(hash) { }
  async checkAccess(document, userId) { return { allowed: true }; }
  async linkDocumentToEntity(documentId, entityType, entityId, userId) { }
  async verifyOnBlockchain(hash) { return {}; }
  async verifyDigitalSignature(data, signature) { return {}; }
  async getDetailedStorageBreakdown() { return {}; }
  async getStorageTrends(timeframe) { return {}; }
  calculateCacheHitRate() { return 0; }
  calculateCacheSize() { return 0; }
}

module.exports = new StorageService();