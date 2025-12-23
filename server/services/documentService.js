const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const Document = require('../db/models/Document');
const User = require('../db/models/User');
const Procurement = require('../db/models/Procurement');
const Contract = require('../db/models/Contract');
const DocumentTemplate = require('../db/models/DocumentTemplate');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const { validateInput, sanitize } = require('../utils/validation');
const { generateSequentialId, formatDate, formatFileSize } = require('../utils/helpers');
const { scanFileForViruses, validateFileContent } = require('../utils/securityScanner');
const { generateDocumentFromTemplate, convertDocumentFormat } = require('../utils/documentGenerator');
const { extractTextContent, indexDocument } = require('../utils/documentIndexer');

// Constants for document management
const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  SUPERSEDED: 'superseded'
};

const DOCUMENT_TYPES = {
  CONTRACT: 'contract',
  PROPOSAL: 'proposal',
  SPECIFICATION: 'specification',
  DRAWING: 'drawing',
  CERTIFICATE: 'certificate',
  INVOICE: 'invoice',
  REPORT: 'report',
  CORRESPONDENCE: 'correspondence',
  LEGAL: 'legal',
  FINANCIAL: 'financial',
  TECHNICAL: 'technical',
  COMPLIANCE: 'compliance',
  TEMPLATE: 'template',
  FORM: 'form',
  POLICY: 'policy',
  PROCEDURE: 'procedure'
};

const DOCUMENT_CATEGORIES = {
  PROCUREMENT: 'procurement',
  CONTRACT: 'contract',
  SUPPLIER: 'supplier',
  FINANCIAL: 'financial',
  LEGAL: 'legal',
  TECHNICAL: 'technical',
  COMPLIANCE: 'compliance',
  ADMINISTRATIVE: 'administrative',
  MARKETING: 'marketing',
  HR: 'hr'
};

const ACCESS_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  RESTRICTED: 'restricted',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret'
};

const FILE_FORMATS = {
  DOCUMENT: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
  SPREADSHEET: ['.xls', '.xlsx', '.csv', '.ods'],
  PRESENTATION: ['.ppt', '.pptx', '.odp'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'],
  DRAWING: ['.dwg', '.dxf', '.dwf', '.pdf'],
  ARCHIVE: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  VIDEO: ['.mp4', '.avi', '.mov', '.wmv', '.flv'],
  AUDIO: ['.mp3', '.wav', '.m4a', '.wma']
};

const SIGNATURE_STATUS = {
  UNSIGNED: 'unsigned',
  PENDING: 'pending',
  SIGNED: 'signed',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

const VERSION_CONTROL = {
  MAJOR: 'major',
  MINOR: 'minor',
  PATCH: 'patch',
  DRAFT: 'draft'
};

class DocumentService {
  /**
   * Upload document with security scanning and validation
   */
  static async uploadDocument(fileData, metadata, userId, requestInfo = {}) {
    try {
      const {
        documentType = DOCUMENT_TYPES.TECHNICAL,
        category = DOCUMENT_CATEGORIES.ADMINISTRATIVE,
        title,
        description,
        accessLevel = ACCESS_LEVELS.INTERNAL,
        tags = [],
        relatedEntityType,
        relatedEntityId,
        isTemplate = false,
        requiresApproval = false,
        expiryDate,
        confidentialityLevel = 'standard',
        customMetadata = {}
      } = metadata;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!title || !fileData) {
        throw new Error('Title and file data are required');
      }

      // Validate file format
      const fileExtension = path.extname(fileData.originalname).toLowerCase();
      const isValidFormat = this.validateFileFormat(fileExtension, documentType);
      if (!isValidFormat) {
        throw new Error(`Unsupported file format for document type: ${documentType}`);
      }

      // Check file size limits
      const maxSize = this.getMaxFileSize(documentType);
      if (fileData.size > maxSize) {
        throw new Error(`File size exceeds maximum allowed: ${formatFileSize(maxSize)}`);
      }

      // Generate document number and file paths
      const documentNumber = await this.generateDocumentNumber(category);
      const fileHash = await this.calculateFileHash(fileData.buffer);
      const fileName = this.generateSecureFileName(fileData.originalname, documentNumber);
      const filePath = await this.generateFilePath(category, documentType, fileName);

      // Check for duplicate files
      const existingDocument = await Document.findOne({ 'file.hash': fileHash });
      if (existingDocument) {
        logger.warn('Duplicate file upload attempted', { 
          existingDocumentId: existingDocument._id, 
          userId 
        });
        // Could return existing document or allow duplicate based on business rules
      }

      // Security scanning
      const securityScan = await this.performSecurityScan(fileData);
      if (!securityScan.safe) {
        throw new Error(`Security scan failed: ${securityScan.reason}`);
      }

      // Content validation and extraction
      const contentAnalysis = await this.analyzeDocumentContent(fileData, documentType);

      // Get user information
      const user = await User.findById(userId).select('username firstName lastName department roles');

      // Save file to storage
      await this.saveFileToStorage(fileData.buffer, filePath);

      // Create document record
      const document = new Document({
        documentNumber,
        title: sanitize(title),
        description: sanitize(description),
        documentType,
        category,
        accessLevel,
        confidentialityLevel,
        
        // File information
        file: {
          originalName: fileData.originalname,
          fileName,
          filePath,
          size: fileData.size,
          mimeType: fileData.mimetype,
          extension: fileExtension,
          hash: fileHash,
          encoding: fileData.encoding || 'binary'
        },

        // Content analysis
        content: {
          textContent: contentAnalysis.textContent || '',
          pageCount: contentAnalysis.pageCount || 0,
          wordCount: contentAnalysis.wordCount || 0,
          language: contentAnalysis.language || 'en',
          extractedData: contentAnalysis.extractedData || {},
          searchableText: contentAnalysis.searchableText || '',
          contentType: contentAnalysis.contentType || 'unknown'
        },

        // Security and compliance
        security: {
          scanResults: securityScan,
          virusScanned: true,
          contentValidated: true,
          encryptionRequired: this.requiresEncryption(accessLevel),
          digitalRightsManagement: customMetadata.drmEnabled || false,
          classificationLevel: accessLevel,
          handlingInstructions: this.generateHandlingInstructions(accessLevel)
        },

        // Version control
        version: {
          major: 1,
          minor: 0,
          patch: 0,
          version: '1.0.0',
          isLatest: true,
          parentDocumentId: null,
          versionType: VERSION_CONTROL.MAJOR,
          changeLog: [{
            version: '1.0.0',
            changes: 'Initial document upload',
            changedBy: userId,
            changedAt: new Date()
          }]
        },

        // Approval and workflow
        workflow: {
          requiresApproval,
          approvalChain: requiresApproval ? await this.buildDocumentApprovalChain(documentType, accessLevel) : [],
          currentStage: requiresApproval ? 'pending_approval' : 'approved',
          approvals: [],
          reviews: [],
          rejections: []
        },

        // Digital signatures
        signatures: {
          required: this.requiresSignature(documentType, accessLevel),
          signatories: [],
          signatureChain: [],
          status: SIGNATURE_STATUS.UNSIGNED
        },

        // Relationships and tags
        relationships: {
          relatedEntityType,
          relatedEntityId: relatedEntityId ? new mongoose.Types.ObjectId(relatedEntityId) : null,
          parentDocuments: [],
          childDocuments: [],
          referencedDocuments: [],
          supersededDocuments: []
        },

        tags: tags.map(tag => sanitize(tag.toLowerCase())),
        customMetadata: customMetadata,

        // Lifecycle management
        lifecycle: {
          createdBy: userId,
          createdAt: new Date(),
          uploadedBy: {
            userId: new mongoose.Types.ObjectId(userId),
            username: user.username,
            name: `${user.firstName} ${user.lastName}`,
            department: user.department
          },
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          retentionPeriod: this.calculateRetentionPeriod(documentType, accessLevel),
          disposalDate: this.calculateDisposalDate(documentType, accessLevel),
          lastAccessed: new Date(),
          accessCount: 0,
          downloadCount: 0
        },

        // Status and metadata
        status: requiresApproval ? DOCUMENT_STATUS.PENDING_APPROVAL : DOCUMENT_STATUS.APPROVED,
        isTemplate,
        isActive: true,
        isPublic: accessLevel === ACCESS_LEVELS.PUBLIC,

        indexing: {
          keywords: this.extractKeywords(title, description, contentAnalysis.textContent),
          searchTerms: this.generateSearchTerms(title, description, tags),
          fullTextSearchEnabled: true,
          indexed: false,
          lastIndexed: null
        },

        metadata: {
          uploadIP: ipAddress,
          uploadUserAgent: userAgent,
          processedAt: new Date(),
          processingTime: 0, // Will be calculated
          qualityScore: contentAnalysis.qualityScore || 0,
          contentScore: contentAnalysis.contentScore || 0
        }
      });

      const startTime = Date.now();
      await document.save();

      // Update processing time
      document.metadata.processingTime = Date.now() - startTime;
      await document.save();

      // Index document for search
      await this.indexDocumentForSearch(document);

      // Initiate approval workflow if required
      if (requiresApproval) {
        await this.initiateDocumentApproval(document, userId);
      }

      // Create audit trail
      await auditService.logAuditEvent({
        action: 'document_uploaded',
        entityType: 'document',
        entityId: document._id,
        userId,
        metadata: {
          documentNumber: document.documentNumber,
          documentType,
          fileName: fileData.originalname,
          fileSize: fileData.size,
          accessLevel,
          requiresApproval,
          securityScanPassed: securityScan.safe,
          ipAddress,
          userAgent
        }
      });

      // Send notifications
      await this.sendDocumentUploadNotifications(document, user);

      return {
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: document._id,
          documentNumber: document.documentNumber,
          title: document.title,
          status: document.status,
          fileName: document.file.fileName,
          size: document.file.size,
          version: document.version.version,
          uploadedAt: document.lifecycle.createdAt
        }
      };

    } catch (error) {
      logger.error('Error uploading document', { 
        error: error.message, 
        metadata, 
        userId 
      });
      throw new Error(`Document upload failed: ${error.message}`);
    }
  }

  /**
   * Get document with access control and audit logging
   */
  static async getDocumentById(documentId, userId, includeContent = false) {
    try {
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        throw new Error('Invalid document ID');
      }

      const document = await Document.findById(documentId)
        .populate('lifecycle.uploadedBy.userId', 'username firstName lastName department')
        .populate('workflow.approvals.approver', 'username firstName lastName')
        .populate('signatures.signatories.signer', 'username firstName lastName')
        .lean();

      if (!document) {
        throw new Error('Document not found');
      }

      // Check access permissions
      const hasAccess = await this.checkDocumentAccess(document, userId);
      if (!hasAccess.allowed) {
        throw new Error(`Access denied: ${hasAccess.reason}`);
      }

      // Get document versions if this is latest
      let versions = [];
      if (document.version.isLatest) {
        versions = await this.getDocumentVersions(documentId);
      }

      // Get related documents
      const relatedDocuments = await this.getRelatedDocuments(document);

      // Get user permissions for this document
      const permissions = await this.getDocumentPermissions(document, userId);

      // Include file content if requested and permitted
      let fileContent = null;
      if (includeContent && hasAccess.level >= 2) {
        fileContent = await this.getDocumentContent(document);
      }

      // Update access tracking
      await this.updateAccessTracking(documentId, userId);

      // Log access event
      await auditService.logDataAccess({
        entityType: 'document',
        entityId: documentId,
        userId,
        action: 'read',
        metadata: { 
          documentNumber: document.documentNumber,
          accessLevel: hasAccess.level,
          includeContent
        }
      });

      return {
        ...document,
        versions,
        relatedDocuments,
        permissions,
        fileContent,
        computed: {
          isExpiringSoon: this.isDocumentExpiringSoon(document),
          needsReview: this.needsReview(document),
          hasValidSignatures: this.hasValidSignatures(document),
          complianceStatus: await this.getComplianceStatus(document),
          accessHistory: await this.getRecentAccessHistory(documentId, 10)
        }
      };

    } catch (error) {
      logger.error('Error getting document', { 
        error: error.message, 
        documentId, 
        userId 
      });
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  /**
   * List documents with advanced filtering and search
   */
  static async listDocuments(filters = {}, pagination = {}, userId) {
    try {
      const {
        status,
        documentType,
        category,
        accessLevel,
        tags,
        relatedEntityType,
        relatedEntityId,
        uploadedBy,
        dateRange,
        search,
        requiresApproval,
        hasExpired,
        isTemplate,
        signatureStatus
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'lifecycle.createdAt',
        sortOrder = -1,
        includeContent = false
      } = pagination;

      // Build base query with access controls
      const baseQuery = await this.buildDocumentAccessQuery(userId);

      // Apply filters
      if (status) {
        if (Array.isArray(status)) {
          baseQuery.status = { $in: status };
        } else {
          baseQuery.status = status;
        }
      }

      if (documentType) baseQuery.documentType = documentType;
      if (category) baseQuery.category = category;
      if (accessLevel) baseQuery.accessLevel = accessLevel;
      if (uploadedBy) baseQuery['lifecycle.uploadedBy.userId'] = new mongoose.Types.ObjectId(uploadedBy);
      if (relatedEntityType) baseQuery['relationships.relatedEntityType'] = relatedEntityType;
      if (relatedEntityId) baseQuery['relationships.relatedEntityId'] = new mongoose.Types.ObjectId(relatedEntityId);
      if (requiresApproval !== undefined) baseQuery['workflow.requiresApproval'] = requiresApproval;
      if (isTemplate !== undefined) baseQuery.isTemplate = isTemplate;
      if (signatureStatus) baseQuery['signatures.status'] = signatureStatus;

      // Tag filter
      if (tags && tags.length > 0) {
        baseQuery.tags = { $in: tags.map(tag => tag.toLowerCase()) };
      }

      // Date range filter
      if (dateRange) {
        const { startDate, endDate } = dateRange;
        if (startDate || endDate) {
          baseQuery['lifecycle.createdAt'] = {};
          if (startDate) baseQuery['lifecycle.createdAt'].$gte = new Date(startDate);
          if (endDate) baseQuery['lifecycle.createdAt'].$lte = new Date(endDate);
        }
      }

      // Expired documents filter
      if (hasExpired === true) {
        baseQuery['lifecycle.expiryDate'] = { $lt: new Date() };
      } else if (hasExpired === false) {
        baseQuery.$or = [
          { 'lifecycle.expiryDate': { $gte: new Date() } },
          { 'lifecycle.expiryDate': null }
        ];
      }

      // Search functionality
      if (search) {
        baseQuery.$or = [
          { documentNumber: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'indexing.searchTerms': { $in: [search.toLowerCase()] } },
          { 'content.searchableText': { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder;

      const [documents, totalCount] = await Promise.all([
        Document.find(baseQuery)
          .populate('lifecycle.uploadedBy.userId', 'username firstName lastName department')
          .populate('relationships.relatedEntityId', 'title name procurementNumber contractNumber')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Document.countDocuments(baseQuery)
      ]);

      // Enrich documents with computed fields
      const enrichedDocuments = await Promise.all(
        documents.map(async document => {
          const permissions = await this.getDocumentPermissions(document, userId);
          return {
            ...document,
            permissions,
            computed: {
              isExpiringSoon: this.isDocumentExpiringSoon(document),
              needsReview: this.needsReview(document),
              fileSize: formatFileSize(document.file.size),
              daysSinceUpload: this.calculateDaysSinceUpload(document.lifecycle.createdAt),
              hasValidSignatures: this.hasValidSignatures(document),
              complianceIndicator: this.getComplianceIndicator(document)
            }
          };
        })
      );

      // Calculate pagination
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Generate summary statistics
      const summary = await this.generateDocumentsSummary(baseQuery);

      // Log list access
      await auditService.logDataAccess({
        entityType: 'document',
        entityId: null,
        userId,
        action: 'list',
        metadata: {
          filters,
          pagination: { page, limit },
          resultCount: documents.length,
          totalCount
        }
      });

      return {
        documents: enrichedDocuments,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        },
        summary,
        filters: {
          applied: filters,
          available: await this.getAvailableDocumentFilters(userId)
        }
      };

    } catch (error) {
      logger.error('Error listing documents', { 
        error: error.message, 
        filters, 
        userId 
      });
      throw new Error(`Failed to list documents: ${error.message}`);
    }
  }

  /**
   * Create new version of existing document
   */
  static async createDocumentVersion(documentId, fileData, versionData, userId, requestInfo = {}) {
    try {
      const {
        versionType = VERSION_CONTROL.MINOR,
        changeLog,
        majorChanges = false,
        maintainApprovals = false
      } = versionData;

      const { ipAddress, userAgent } = requestInfo;

      // Get original document
      const originalDocument = await Document.findById(documentId);
      if (!originalDocument) {
        throw new Error('Original document not found');
      }

      // Check permissions
      const canVersion = await this.canCreateVersion(originalDocument, userId);
      if (!canVersion.allowed) {
        throw new Error(`Cannot create version: ${canVersion.reason}`);
      }

      // Mark original as not latest
      originalDocument.version.isLatest = false;
      await originalDocument.save();

      // Calculate new version number
      const newVersion = this.calculateNewVersion(
        originalDocument.version, 
        versionType, 
        majorChanges
      );

      // Create new document version
      const newDocument = new Document({
        ...originalDocument.toObject(),
        _id: new mongoose.Types.ObjectId(),
        documentNumber: originalDocument.documentNumber, // Keep same number
        
        // Update file information
        file: {
          ...originalDocument.file,
          originalName: fileData.originalname,
          fileName: this.generateSecureFileName(fileData.originalname, originalDocument.documentNumber),
          filePath: await this.generateFilePath(
            originalDocument.category, 
            originalDocument.documentType, 
            fileData.originalname
          ),
          size: fileData.size,
          mimeType: fileData.mimetype,
          hash: await this.calculateFileHash(fileData.buffer)
        },

        // Update version information
        version: {
          ...newVersion,
          parentDocumentId: originalDocument._id,
          versionType,
          changeLog: [
            ...originalDocument.version.changeLog,
            {
              version: newVersion.version,
              changes: sanitize(changeLog),
              changedBy: userId,
              changedAt: new Date()
            }
          ]
        },

        // Reset workflow unless maintaining approvals
        workflow: maintainApprovals ? originalDocument.workflow : {
          requiresApproval: originalDocument.workflow.requiresApproval,
          approvalChain: originalDocument.workflow.approvalChain,
          currentStage: originalDocument.workflow.requiresApproval ? 'pending_approval' : 'approved',
          approvals: [],
          reviews: [],
          rejections: []
        },

        // Update lifecycle
        lifecycle: {
          ...originalDocument.lifecycle,
          createdAt: new Date(),
          lastModified: new Date(),
          modifiedBy: userId,
          accessCount: 0,
          downloadCount: 0
        },

        // Update status
        status: maintainApprovals ? 
          originalDocument.status : 
          (originalDocument.workflow.requiresApproval ? DOCUMENT_STATUS.PENDING_APPROVAL : DOCUMENT_STATUS.APPROVED),

        metadata: {
          ...originalDocument.metadata,
          uploadIP: ipAddress,
          uploadUserAgent: userAgent,
          processedAt: new Date(),
          versionCreated: true,
          originalDocumentId: originalDocument._id
        }
      });

      // Security scan new version
      const securityScan = await this.performSecurityScan(fileData);
      if (!securityScan.safe) {
        throw new Error(`Security scan failed: ${securityScan.reason}`);
      }

      newDocument.security.scanResults = securityScan;

      // Save file to storage
      await this.saveFileToStorage(fileData.buffer, newDocument.file.filePath);

      // Content analysis
      const contentAnalysis = await this.analyzeDocumentContent(fileData, newDocument.documentType);
      newDocument.content = {
        ...newDocument.content,
        textContent: contentAnalysis.textContent || '',
        pageCount: contentAnalysis.pageCount || 0,
        wordCount: contentAnalysis.wordCount || 0,
        searchableText: contentAnalysis.searchableText || ''
      };

      await newDocument.save();

      // Update relationships
      await this.updateDocumentRelationships(originalDocument._id, newDocument._id, 'version_created');

      // Index new version
      await this.indexDocumentForSearch(newDocument);

      // Audit trail
      await auditService.logAuditEvent({
        action: 'document_version_created',
        entityType: 'document',
        entityId: newDocument._id,
        userId,
        metadata: {
          originalDocumentId: originalDocument._id,
          documentNumber: newDocument.documentNumber,
          oldVersion: originalDocument.version.version,
          newVersion: newVersion.version,
          versionType,
          majorChanges,
          ipAddress,
          userAgent
        }
      });

      // Send notifications
      await this.sendVersionCreationNotifications(originalDocument, newDocument, userId);

      return {
        success: true,
        message: 'Document version created successfully',
        document: {
          id: newDocument._id,
          documentNumber: newDocument.documentNumber,
          version: newVersion.version,
          status: newDocument.status,
          fileName: newDocument.file.fileName,
          createdAt: newDocument.lifecycle.createdAt
        },
        previousVersion: {
          id: originalDocument._id,
          version: originalDocument.version.version
        }
      };

    } catch (error) {
      logger.error('Error creating document version', { 
        error: error.message, 
        documentId, 
        userId 
      });
      throw new Error(`Version creation failed: ${error.message}`);
    }
  }

  /**
   * Download document with access control and audit logging
   */
  static async downloadDocument(documentId, userId, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Check download permissions
      const canDownload = await this.canDownloadDocument(document, userId);
      if (!canDownload.allowed) {
        throw new Error(`Download denied: ${canDownload.reason}`);
      }

      // Get file from storage
      const fileBuffer = await this.getFileFromStorage(document.file.filePath);
      if (!fileBuffer) {
        throw new Error('Document file not found in storage');
      }

      // Update download tracking
      await Document.findByIdAndUpdate(documentId, {
        $inc: { 'lifecycle.downloadCount': 1 },
        $set: { 'lifecycle.lastAccessed': new Date() }
      });

      // Log download event
      await auditService.logAuditEvent({
        action: 'document_downloaded',
        entityType: 'document',
        entityId: documentId,
        userId,
        metadata: {
          documentNumber: document.documentNumber,
          fileName: document.file.fileName,
          fileSize: document.file.size,
          ipAddress,
          userAgent
        }
      });

      return {
        fileBuffer,
        fileName: document.file.originalName,
        mimeType: document.file.mimeType,
        size: document.file.size,
        documentNumber: document.documentNumber
      };

    } catch (error) {
      logger.error('Error downloading document', { 
        error: error.message, 
        documentId, 
        userId 
      });
      throw new Error(`Document download failed: ${error.message}`);
    }
  }

  /**
   * Generate document reports
   */
  static async generateDocumentReport(reportType, filters = {}, userId) {
    try {
      const reportId = generateSequentialId('DRPT');
      let reportData;

      switch (reportType) {
        case 'summary':
          reportData = await this.generateDocumentSummaryReport(filters);
          break;

        case 'access_log':
          reportData = await this.generateAccessLogReport(filters);
          break;

        case 'expiry':
          reportData = await this.generateExpiryReport(filters);
          break;

        case 'compliance':
          reportData = await this.generateComplianceReport(filters);
          break;

        case 'security':
          reportData = await this.generateSecurityReport(filters);
          break;

        case 'storage':
          reportData = await this.generateStorageReport(filters);
          break;

        case 'version_control':
          reportData = await this.generateVersionControlReport(filters);
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Log report generation
      await auditService.logAuditEvent({
        action: 'document_report_generated',
        entityType: 'document',
        entityId: null,
        userId,
        metadata: {
          reportId,
          reportType,
          filters,
          recordCount: reportData.recordCount || 0
        }
      });

      return {
        reportId,
        reportType,
        generatedAt: new Date(),
        generatedBy: userId,
        data: reportData,
        summary: {
          totalRecords: reportData.recordCount || 0,
          reportPeriod: this.getReportPeriod(filters),
          generationTime: new Date()
        }
      };

    } catch (error) {
      logger.error('Error generating document report', { 
        error: error.message, 
        reportType, 
        userId 
      });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  // Helper methods for document management
  static validateFileFormat(extension, documentType) {
    const allowedFormats = this.getAllowedFormats(documentType);
    return allowedFormats.includes(extension);
  }

  static getAllowedFormats(documentType) {
    switch (documentType) {
      case DOCUMENT_TYPES.CONTRACT:
      case DOCUMENT_TYPES.LEGAL:
        return FILE_FORMATS.DOCUMENT;
      case DOCUMENT_TYPES.DRAWING:
        return [...FILE_FORMATS.DRAWING, ...FILE_FORMATS.IMAGE];
      case DOCUMENT_TYPES.FINANCIAL:
        return [...FILE_FORMATS.DOCUMENT, ...FILE_FORMATS.SPREADSHEET];
      default:
        return [
          ...FILE_FORMATS.DOCUMENT,
          ...FILE_FORMATS.SPREADSHEET,
          ...FILE_FORMATS.PRESENTATION,
          ...FILE_FORMATS.IMAGE
        ];
    }
  }

  static getMaxFileSize(documentType) {
    switch (documentType) {
      case DOCUMENT_TYPES.DRAWING:
        return 100 * 1024 * 1024; // 100MB
      case DOCUMENT_TYPES.CONTRACT:
      case DOCUMENT_TYPES.LEGAL:
        return 50 * 1024 * 1024; // 50MB
      default:
        return 25 * 1024 * 1024; // 25MB
    }
  }

  static async calculateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static generateSecureFileName(originalName, documentNumber) {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${documentNumber}_${timestamp}_${safeName}${extension}`;
  }

  static async generateDocumentNumber(category) {
    const year = new Date().getFullYear();
    const prefix = `DOC-${category.toUpperCase()}-${year}`;
    
    const lastDocument = await Document.findOne({
      documentNumber: { $regex: `^${prefix}` }
    }).sort({ documentNumber: -1 });

    let sequence = 1;
    if (lastDocument) {
      const lastSequence = parseInt(lastDocument.documentNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(5, '0')}`;
  }

  static async generateFilePath(category, documentType, fileName) {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    return path.join(
      'documents',
      category,
      documentType,
      year.toString(),
      month.toString().padStart(2, '0'),
      fileName
    );
  }

  static requiresEncryption(accessLevel) {
    return [ACCESS_LEVELS.CONFIDENTIAL, ACCESS_LEVELS.SECRET].includes(accessLevel);
  }

  static requiresSignature(documentType, accessLevel) {
    return documentType === DOCUMENT_TYPES.CONTRACT || 
           documentType === DOCUMENT_TYPES.LEGAL ||
           accessLevel === ACCESS_LEVELS.SECRET;
  }

  static generateHandlingInstructions(accessLevel) {
    const instructions = {
      [ACCESS_LEVELS.PUBLIC]: 'No special handling required',
      [ACCESS_LEVELS.INTERNAL]: 'Internal use only',
      [ACCESS_LEVELS.RESTRICTED]: 'Restricted access - authorized personnel only',
      [ACCESS_LEVELS.CONFIDENTIAL]: 'Confidential - handle with care',
      [ACCESS_LEVELS.SECRET]: 'Secret - highest security protocols required'
    };
    return instructions[accessLevel] || instructions[ACCESS_LEVELS.INTERNAL];
  }

  static calculateRetentionPeriod(documentType, accessLevel) {
    // Return retention period in years
    if (documentType === DOCUMENT_TYPES.CONTRACT) return 7;
    if (documentType === DOCUMENT_TYPES.FINANCIAL) return 7;
    if (documentType === DOCUMENT_TYPES.LEGAL) return 10;
    if (accessLevel === ACCESS_LEVELS.SECRET) return 10;
    return 5; // Default
  }

  static calculateDisposalDate(documentType, accessLevel) {
    const retentionYears = this.calculateRetentionPeriod(documentType, accessLevel);
    const disposalDate = new Date();
    disposalDate.setFullYear(disposalDate.getFullYear() + retentionYears);
    return disposalDate;
  }

  static extractKeywords(title, description, textContent) {
    const text = `${title} ${description} ${textContent || ''}`.toLowerCase();
    const words = text.match(/\b\w{3,}\b/g) || [];
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 50); // Top 50 keywords
  }

  static generateSearchTerms(title, description, tags) {
    const terms = [];
    terms.push(...title.toLowerCase().split(/\s+/));
    terms.push(...description.toLowerCase().split(/\s+/));
    terms.push(...tags.map(tag => tag.toLowerCase()));
    return [...new Set(terms.filter(term => term.length > 2))];
  }

  static calculateNewVersion(currentVersion, versionType, majorChanges) {
    let { major, minor, patch } = currentVersion;
    
    if (majorChanges || versionType === VERSION_CONTROL.MAJOR) {
      major++;
      minor = 0;
      patch = 0;
    } else if (versionType === VERSION_CONTROL.MINOR) {
      minor++;
      patch = 0;
    } else {
      patch++;
    }

    return {
      major,
      minor,
      patch,
      version: `${major}.${minor}.${patch}`,
      isLatest: true
    };
  }

  static isDocumentExpiringSoon(document, days = 30) {
    if (!document.lifecycle.expiryDate) return false;
    
    const now = new Date();
    const expiryDate = new Date(document.lifecycle.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= days && daysUntilExpiry > 0;
  }

  static needsReview(document) {
    // Check if document needs review based on age, access level, etc.
    const monthsSinceCreation = (new Date() - new Date(document.lifecycle.createdAt)) / (1000 * 60 * 60 * 24 * 30);
    
    if (document.accessLevel === ACCESS_LEVELS.SECRET && monthsSinceCreation > 6) return true;
    if (document.accessLevel === ACCESS_LEVELS.CONFIDENTIAL && monthsSinceCreation > 12) return true;
    if (monthsSinceCreation > 24) return true;
    
    return false;
  }

  static hasValidSignatures(document) {
    if (!document.signatures.required) return true;
    return document.signatures.status === SIGNATURE_STATUS.SIGNED;
  }

  static calculateDaysSinceUpload(uploadDate) {
    const now = new Date();
    const upload = new Date(uploadDate);
    return Math.floor((now - upload) / (1000 * 60 * 60 * 24));
  }

  static getComplianceIndicator(document) {
    let score = 100;
    
    if (this.isDocumentExpiringSoon(document)) score -= 20;
    if (this.needsReview(document)) score -= 15;
    if (document.signatures.required && !this.hasValidSignatures(document)) score -= 30;
    if (document.status === DOCUMENT_STATUS.DRAFT) score -= 25;
    
    if (score >= 80) return 'compliant';
    if (score >= 60) return 'minor_issues';
    if (score >= 40) return 'needs_attention';
    return 'non_compliant';
  }

  static getReportPeriod(filters) {
    if (filters.dateRange?.startDate && filters.dateRange?.endDate) {
      return `${formatDate(filters.dateRange.startDate)} to ${formatDate(filters.dateRange.endDate)}`;
    }
    return 'All time';
  }

  // Placeholder methods for complex operations (to be implemented)
  static async performSecurityScan(fileData) { 
    return { safe: true, threats: [], scanTime: new Date() }; 
  }
  static async analyzeDocumentContent(fileData, documentType) { 
    return { textContent: '', pageCount: 1, wordCount: 0, qualityScore: 80 }; 
  }
  static async saveFileToStorage(buffer, filePath) { }
  static async getFileFromStorage(filePath) { return Buffer.alloc(0); }
  static async indexDocumentForSearch(document) { }
  static async buildDocumentApprovalChain(documentType, accessLevel) { return []; }
  static async initiateDocumentApproval(document, userId) { }
  static async checkDocumentAccess(document, userId) { 
    return { allowed: true, level: 2, reason: null }; 
  }
  static async getDocumentVersions(documentId) { return []; }
  static async getRelatedDocuments(document) { return []; }
  static async getDocumentPermissions(document, userId) { return {}; }
  static async getDocumentContent(document) { return null; }
  static async updateAccessTracking(documentId, userId) { }
  static async getComplianceStatus(document) { return 'compliant'; }
  static async getRecentAccessHistory(documentId, limit) { return []; }
  static async buildDocumentAccessQuery(userId) { return {}; }
  static async generateDocumentsSummary(query) { return {}; }
  static async getAvailableDocumentFilters(userId) { return {}; }
  static async canCreateVersion(document, userId) { return { allowed: true }; }
  static async updateDocumentRelationships(originalId, newId, action) { }
  static async canDownloadDocument(document, userId) { return { allowed: true }; }

  // Notification methods
  static async sendDocumentUploadNotifications(document, user) { }
  static async sendVersionCreationNotifications(original, newDoc, userId) { }

  // Report generation methods
  static async generateDocumentSummaryReport(filters) { return { recordCount: 0 }; }
  static async generateAccessLogReport(filters) { return { recordCount: 0 }; }
  static async generateExpiryReport(filters) { return { recordCount: 0 }; }
  static async generateComplianceReport(filters) { return { recordCount: 0 }; }
  static async generateSecurityReport(filters) { return { recordCount: 0 }; }
  static async generateStorageReport(filters) { return { recordCount: 0 }; }
  static async generateVersionControlReport(filters) { return { recordCount: 0 }; }
}

module.exports = DocumentService;
