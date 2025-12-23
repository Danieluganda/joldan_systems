/**
 * Document Routes
 * 
 * Routes for managing procurement documents, templates, versions, and file operations
 * Feature 10: Document management, templates, and version control
 * 
 * Enhanced with authentication, validation, file security, version control, and comprehensive document lifecycle management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize, validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logStatusChange } = require('../middleware/auditLogger');

// Service imports
const documentService = require('../services/documentService');
const folderService = require('../services/folderService');
const pdfService = require('../services/pdfService');
const notificationService = require('../services/notificationService');
const complianceService = require('../services/complianceService');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 20 // Maximum 20 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types for procurement documents
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
    }
  }
});

// Validation schemas
const documentValidation = {
  create: {
    name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    category: { type: 'string', enum: ['rfq', 'proposal', 'contract', 'invoice', 'specification', 'certificate', 'report', 'correspondence', 'legal', 'financial', 'technical', 'other'], required: true },
    folderId: { type: 'string' },
    tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 20 },
    isTemplate: { type: 'boolean', default: false },
    isPublic: { type: 'boolean', default: false },
    requiresApproval: { type: 'boolean', default: false },
    retentionPeriod: { type: 'number', min: 30, max: 3650 }, // Days
    confidentialityLevel: { type: 'string', enum: ['public', 'internal', 'confidential', 'restricted'], default: 'internal' },
    relatedEntityType: { type: 'string', enum: ['rfq', 'award', 'contract', 'supplier', 'procurement'] },
    relatedEntityId: { type: 'string' },
    metadata: { type: 'object' }
  },
  update: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    category: { type: 'string', enum: ['rfq', 'proposal', 'contract', 'invoice', 'specification', 'certificate', 'report', 'correspondence', 'legal', 'financial', 'technical', 'other'] },
    folderId: { type: 'string' },
    tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 20 },
    isPublic: { type: 'boolean' },
    confidentialityLevel: { type: 'string', enum: ['public', 'internal', 'confidential', 'restricted'] },
    metadata: { type: 'object' }
  },
  approve: {
    decision: { type: 'string', enum: ['approve', 'reject'], required: true },
    comments: { type: 'string', maxLength: 1000 },
    conditions: { type: 'array', items: { type: 'string' } }
  },
  share: {
    shareType: { type: 'string', enum: ['user', 'role', 'public', 'link'], required: true },
    targetId: { type: 'string' }, // User ID, role name, or null for public/link
    permissions: { type: 'array', items: { type: 'string', enum: ['read', 'download', 'comment'] }, required: true },
    expiresAt: { type: 'string', format: 'datetime' },
    requiresPassword: { type: 'boolean', default: false },
    password: { type: 'string', minLength: 6 },
    message: { type: 'string', maxLength: 500 }
  },
  query: {
    category: { type: 'string', enum: ['rfq', 'proposal', 'contract', 'invoice', 'specification', 'certificate', 'report', 'correspondence', 'legal', 'financial', 'technical', 'other'] },
    folderId: { type: 'string' },
    isTemplate: { type: 'boolean' },
    isPublic: { type: 'boolean' },
    status: { type: 'string', enum: ['draft', 'pending_approval', 'approved', 'rejected', 'archived', 'deleted'] },
    confidentialityLevel: { type: 'string', enum: ['public', 'internal', 'confidential', 'restricted'] },
    relatedEntityType: { type: 'string', enum: ['rfq', 'award', 'contract', 'supplier', 'procurement'] },
    relatedEntityId: { type: 'string' },
    uploadedBy: { type: 'string' },
    fileType: { type: 'string' },
    minSize: { type: 'number', min: 0 },
    maxSize: { type: 'number', min: 0 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    search: { type: 'string', minLength: 3, maxLength: 100 },
    tags: { type: 'array', items: { type: 'string' } },
    hasVersions: { type: 'boolean' },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 },
    sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'name', 'size', 'downloadCount'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeVersions: { type: 'boolean', default: false },
    includeFolders: { type: 'boolean', default: false }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  },
  bulk: {
    action: { type: 'string', enum: ['move', 'delete', 'archive', 'tag', 'share'], required: true },
    documentIds: { type: 'array', items: { type: 'string' }, required: true, minItems: 1 },
    targetFolderId: { type: 'string' }, // For move action
    tags: { type: 'array', items: { type: 'string' } }, // For tag action
    shareData: { type: 'object' } // For share action
  }
};

/**
 * @route   GET /api/documents
 * @desc    Get all documents with advanced filtering and search
 * @access  Private - requires 'documents:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('documents:read'),
  validateQuery(documentValidation.query),
  sanitize(),
  logView('documents', 'list'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      folderId,
      isTemplate,
      isPublic,
      status,
      confidentialityLevel,
      relatedEntityType,
      relatedEntityId,
      uploadedBy,
      fileType,
      minSize,
      maxSize,
      startDate,
      endDate,
      search,
      tags,
      hasVersions,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeVersions = false,
      includeFolders = false
    } = req.query;

    // Build filter criteria
    const filters = {};
    if (category) filters.category = category;
    if (folderId) filters.folderId = folderId;
    if (isTemplate !== undefined) filters.isTemplate = isTemplate === 'true';
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
    if (status) filters.status = status;
    if (confidentialityLevel) filters.confidentialityLevel = confidentialityLevel;
    if (relatedEntityType) filters.relatedEntityType = relatedEntityType;
    if (relatedEntityId) filters.relatedEntityId = relatedEntityId;
    if (uploadedBy) filters.uploadedBy = uploadedBy;
    if (fileType) filters.mimeType = { $regex: fileType, $options: 'i' };
    if (hasVersions !== undefined) filters.hasVersions = hasVersions === 'true';
    
    // Size filters
    if (minSize || maxSize) {
      filters.size = {};
      if (minSize) filters.size.$gte = parseInt(minSize);
      if (maxSize) filters.size.$lte = parseInt(maxSize);
    }
    
    // Date range filters
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Tag filters
    if (tags && tags.length > 0) {
      filters.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    // Apply confidentiality filtering
    if (!req.user.permissions.includes('documents:read:all')) {
      filters.$and = [
        {
          $or: [
            { uploadedBy: req.user.id },
            { isPublic: true },
            { 'permissions.userId': req.user.id },
            { confidentialityLevel: { $in: ['public', 'internal'] } }
          ]
        }
      ];
    }

    const result = await documentService.list({
      filters,
      search,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeVersions: includeVersions === 'true',
      includeFolders: includeFolders === 'true',
      includePermissions: true
    });

    res.json({
      success: true,
      data: result.documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: result.totalPages,
        totalRecords: result.totalRecords,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      summary: {
        totalSize: result.totalSize,
        typeBreakdown: result.typeBreakdown,
        categoryBreakdown: result.categoryBreakdown,
        confidentialityBreakdown: result.confidentialityBreakdown
      },
      folders: includeFolders === 'true' ? result.folders : undefined,
      filters: filters,
      sort: { [sortBy]: sortOrder }
    });
  })
);

/**
 * @route   POST /api/documents/upload
 * @desc    Upload new documents with metadata
 * @access  Private - requires 'documents:create' permission
 */
router.post('/upload',
  verifyToken,
  checkPermission('documents:create'),
  upload.array('files'),
  validateBody(documentValidation.create),
  sanitize(),
  logCreate('documents'),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadData = {
      ...req.body,
      uploadedBy: req.user.id,
      status: req.body.requiresApproval ? 'pending_approval' : 'approved'
    };

    // Validate folder access if specified
    if (uploadData.folderId) {
      const hasAccess = await folderService.checkAccess(uploadData.folderId, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to specified folder'
        });
      }
    }

    const uploadedDocuments = [];
    const errors = [];

    // Process each file
    for (const file of req.files) {
      try {
        // Virus scan (if enabled)
        const virusScanResult = await documentService.scanForVirus(file.buffer);
        if (!virusScanResult.clean) {
          errors.push({
            filename: file.originalname,
            error: 'File failed virus scan'
          });
          continue;
        }

        // Generate document metadata
        const documentData = {
          ...uploadData,
          originalName: file.originalname,
          filename: `${Date.now()}-${file.originalname}`,
          mimeType: file.mimetype,
          size: file.size,
          buffer: file.buffer,
          checksum: await documentService.generateChecksum(file.buffer)
        };

        const document = await documentService.create(documentData);
        uploadedDocuments.push(document);

        // Send approval notification if required
        if (uploadData.requiresApproval) {
          await notificationService.notifyDocumentPendingApproval(document.id);
        }

      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        uploaded: uploadedDocuments,
        errors: errors
      },
      message: `${uploadedDocuments.length} documents uploaded successfully`
    });
  })
);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document by ID with detailed information
 * @access  Private - requires 'documents:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['documents:read', 'documents:read:own']),
  validateParams(documentValidation.params),
  requireOwnershipOrPermission('id', 'uploadedBy', 'documents:read:all'),
  logView('documents', 'detail'),
  asyncHandler(async (req, res) => {
    const document = await documentService.getById(req.params.id, {
      includeVersions: true,
      includePermissions: true,
      includeComments: true,
      includeAuditTrail: true,
      includeFolder: true
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check confidentiality access
    const hasConfidentialAccess = await documentService.checkConfidentialityAccess(
      document,
      req.user.id,
      req.user.permissions
    );

    if (!hasConfidentialAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to confidential document'
      });
    }

    // Log document view for analytics
    await documentService.logView(document.id, req.user.id);

    res.json({
      success: true,
      data: document
    });
  })
);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download document file
 * @access  Private - requires 'documents:read' permission
 */
router.get('/:id/download',
  verifyToken,
  checkPermission('documents:read'),
  validateParams(documentValidation.params),
  asyncHandler(async (req, res) => {
    const document = await documentService.getById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check download permissions
    const hasDownloadAccess = await documentService.checkDownloadAccess(
      document,
      req.user.id,
      req.user.permissions
    );

    if (!hasDownloadAccess) {
      return res.status(403).json({
        success: false,
        message: 'Download access denied'
      });
    }

    const fileBuffer = await documentService.getFileBuffer(document.id);
    
    // Log download for audit trail
    await documentService.logDownload(document.id, req.user.id);

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Length', document.size);
    res.send(fileBuffer);
  })
);

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document metadata
 * @access  Private - requires 'documents:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['documents:update', 'documents:update:own']),
  validateParams(documentValidation.params),
  validateBody(documentValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'uploadedBy', 'documents:update:all'),
  logUpdate('documents'),
  asyncHandler(async (req, res) => {
    const documentId = req.params.id;
    const updates = req.body;

    const existingDocument = await documentService.getById(documentId);
    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if document is in editable state
    if (existingDocument.status === 'archived' || existingDocument.status === 'deleted') {
      return res.status(400).json({
        success: false,
        message: 'Document cannot be modified in current state'
      });
    }

    // Add update metadata
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const updatedDocument = await documentService.update(documentId, updates);

    res.json({
      success: true,
      data: updatedDocument,
      message: 'Document updated successfully'
    });
  })
);

/**
 * @route   POST /api/documents/:id/versions
 * @desc    Upload new version of document
 * @access  Private - requires 'documents:update' permission
 */
router.post('/:id/versions',
  verifyToken,
  checkPermission('documents:update'),
  validateParams(documentValidation.params),
  upload.single('file'),
  validateBody({
    versionNotes: { type: 'string', maxLength: 500 },
    majorVersion: { type: 'boolean', default: false }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const documentId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const document = await documentService.getById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check update permissions
    if (document.uploadedBy !== req.user.id && 
        !req.user.permissions.includes('documents:update:all')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const versionData = {
      file: req.file,
      versionNotes: req.body.versionNotes,
      majorVersion: req.body.majorVersion === 'true',
      uploadedBy: req.user.id
    };

    const newVersion = await documentService.createVersion(documentId, versionData);

    res.status(201).json({
      success: true,
      data: newVersion,
      message: 'New version uploaded successfully'
    });
  })
);

/**
 * @route   POST /api/documents/:id/approve
 * @desc    Approve or reject document
 * @access  Private - requires 'documents:approve' permission
 */
router.post('/:id/approve',
  verifyToken,
  checkPermission('documents:approve'),
  validateParams(documentValidation.params),
  validateBody(documentValidation.approve),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { decision, comments, conditions } = req.body;

    const document = await documentService.getById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (document.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Document is not pending approval'
      });
    }

    const approvalData = {
      approverId: req.user.id,
      decision,
      comments,
      conditions,
      timestamp: new Date()
    };

    const result = await documentService.processApproval(id, approvalData);

    // Send notification to document owner
    await notificationService.notifyDocumentApproval(document.uploadedBy, {
      documentId: id,
      decision,
      comments
    });

    res.json({
      success: true,
      data: result,
      message: `Document ${decision}${decision === 'approve' ? 'd' : 'ed'} successfully`
    });
  })
);

/**
 * @route   POST /api/documents/:id/share
 * @desc    Share document with users or create public link
 * @access  Private - requires 'documents:share' permission
 */
router.post('/:id/share',
  verifyToken,
  checkPermission('documents:share'),
  validateParams(documentValidation.params),
  validateBody(documentValidation.share),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const shareData = {
      ...req.body,
      sharedBy: req.user.id,
      sharedAt: new Date()
    };

    const document = await documentService.getById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check sharing permissions
    if (document.uploadedBy !== req.user.id && 
        !req.user.permissions.includes('documents:share:all')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const shareResult = await documentService.shareDocument(id, shareData);

    // Send share notifications
    if (shareData.shareType === 'user') {
      await notificationService.notifyDocumentShared(shareData.targetId, {
        documentId: id,
        sharedBy: req.user.id,
        permissions: shareData.permissions,
        message: shareData.message
      });
    }

    res.json({
      success: true,
      data: shareResult,
      message: 'Document shared successfully'
    });
  })
);

/**
 * @route   POST /api/documents/:id/convert
 * @desc    Convert document to different format
 * @access  Private - requires 'documents:convert' permission
 */
router.post('/:id/convert',
  verifyToken,
  checkPermission('documents:convert'),
  validateParams(documentValidation.params),
  validateBody({
    targetFormat: { type: 'string', enum: ['pdf', 'docx', 'xlsx', 'pptx', 'txt'], required: true },
    saveAsNew: { type: 'boolean', default: true },
    quality: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetFormat, saveAsNew, quality } = req.body;

    const document = await documentService.getById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const convertedDocument = await documentService.convertDocument(id, {
      targetFormat,
      quality,
      saveAsNew: saveAsNew === 'true',
      convertedBy: req.user.id
    });

    res.json({
      success: true,
      data: convertedDocument,
      message: 'Document converted successfully'
    });
  })
);

/**
 * @route   GET /api/documents/templates
 * @desc    Get document templates
 * @access  Private - requires 'documents:read' permission
 */
router.get('/templates',
  verifyToken,
  checkPermission('documents:read'),
  validateQuery({
    category: { type: 'string', enum: ['rfq', 'contract', 'invoice', 'specification', 'certificate', 'report', 'correspondence', 'legal', 'financial', 'technical'] },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 50, default: 20 }
  }),
  logView('documents', 'templates'),
  asyncHandler(async (req, res) => {
    const { category, page = 1, limit = 20 } = req.query;
    
    const templates = await documentService.getTemplates({
      category,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      includePreview: true
    });

    res.json({
      success: true,
      data: templates
    });
  })
);

/**
 * @route   POST /api/documents/bulk
 * @desc    Bulk operations on documents
 * @access  Private - requires 'documents:bulk' permission
 */
router.post('/bulk',
  verifyToken,
  checkPermission('documents:bulk'),
  validateBody(documentValidation.bulk),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { action, documentIds, targetFolderId, tags, shareData } = req.body;

    // Validate all document IDs exist and user has access
    const documents = await documentService.getByIds(documentIds);
    if (documents.length !== documentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some documents not found'
      });
    }

    // Check permissions for each document
    for (const document of documents) {
      if (!req.user.permissions.includes('documents:bulk:all')) {
        if (document.uploadedBy !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to some documents'
          });
        }
      }
    }

    const bulkData = {
      targetFolderId,
      tags,
      shareData,
      performedBy: req.user.id,
      performedAt: new Date()
    };

    const result = await documentService.bulkOperation(action, documentIds, bulkData);

    res.json({
      success: true,
      data: result,
      message: `Bulk ${action} operation completed successfully`
    });
  })
);

/**
 * @route   GET /api/documents/analytics/dashboard
 * @desc    Get document analytics for dashboard
 * @access  Private - requires 'documents:read' permission
 */
router.get('/analytics/dashboard',
  verifyToken,
  checkPermission('documents:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['7d', '30d', '90d', '180d', '1y'], default: '30d' }
  }),
  logView('documents', 'analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '30d' } = req.query;
    
    const analytics = await documentService.getAnalytics({
      timeframe,
      userId: req.user.permissions.includes('documents:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document (soft delete or archive)
 * @access  Private - requires 'documents:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['documents:delete', 'documents:delete:own']),
  validateParams(documentValidation.params),
  requireOwnershipOrPermission('id', 'uploadedBy', 'documents:delete:all'),
  logDelete('documents'),
  asyncHandler(async (req, res) => {
    const documentId = req.params.id;

    const document = await documentService.getById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const result = await documentService.softDelete(documentId, {
      deletedBy: req.user.id,
      reason: req.body.reason || 'Deleted by user',
      deletionDate: new Date()
    });

    res.json({
      success: true,
      data: result,
      message: 'Document deleted successfully'
    });
  })
);

module.exports = router;
