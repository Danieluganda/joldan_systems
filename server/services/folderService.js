/**
 * Folder Service
 * 
 * Comprehensive document folder management with enterprise-grade hierarchy,
 * organization, security, versioning, and advanced document lifecycle management
 * Feature 10: Document management with advanced folder operations
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const Folder = require('../db/models/Folder');
const Document = require('../db/models/Document');
const Procurement = require('../db/models/Procurement');
const User = require('../db/models/User');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const { validateInput, sanitize } = require('../utils/validation');
const { generateSequentialId, formatDate, calculateSize, formatPath } = require('../utils/helpers');
const { assessFolderSecurity, validateFolderPermissions } = require('../utils/securityScanner');
const { generateFolderReport } = require('../utils/reportGenerator');

// Constants for folder management
const FOLDER_TYPES = {
  ROOT: 'root',
  PROCUREMENT: 'procurement',
  WORKFLOW: 'workflow',
  DOCUMENT_TYPE: 'document_type',
  ENTITY: 'entity',
  ARCHIVE: 'archive',
  TEMPLATE: 'template',
  SHARED: 'shared',
  PRIVATE: 'private',
  SYSTEM: 'system'
};

const FOLDER_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  LOCKED: 'locked',
  DELETED: 'deleted',
  HIDDEN: 'hidden',
  READONLY: 'readonly',
  MAINTENANCE: 'maintenance'
};

const ACCESS_LEVELS = {
  NO_ACCESS: 'no_access',
  READ_ONLY: 'read_only',
  READ_WRITE: 'read_write',
  FULL_CONTROL: 'full_control',
  ADMIN: 'admin'
};

const FOLDER_PERMISSIONS = {
  VIEW: 'view',
  CREATE: 'create',
  MODIFY: 'modify',
  DELETE: 'delete',
  MANAGE: 'manage',
  SHARE: 'share',
  ARCHIVE: 'archive'
};

const RETENTION_POLICIES = {
  SHORT_TERM: 'short_term', // 1 year
  MEDIUM_TERM: 'medium_term', // 5 years
  LONG_TERM: 'long_term', // 10 years
  PERMANENT: 'permanent',
  LEGAL_HOLD: 'legal_hold'
};

const FOLDER_EVENTS = {
  CREATED: 'folder_created',
  MODIFIED: 'folder_modified',
  MOVED: 'folder_moved',
  DELETED: 'folder_deleted',
  ARCHIVED: 'folder_archived',
  SHARED: 'folder_shared',
  ACCESSED: 'folder_accessed',
  LOCKED: 'folder_locked'
};

class FolderService {
  /**
   * Create comprehensive folder structure
   */
  static async createFolder(folderData, userId, requestInfo = {}) {
    try {
      const {
        name,
        description = '',
        parentId = null,
        folderType = FOLDER_TYPES.DOCUMENT_TYPE,
        procurementId = null,
        entityType = null,
        entityId = null,
        accessLevel = ACCESS_LEVELS.READ_WRITE,
        permissions = [FOLDER_PERMISSIONS.VIEW, FOLDER_PERMISSIONS.CREATE],
        retentionPolicy = RETENTION_POLICIES.MEDIUM_TERM,
        tags = [],
        metadata = {},
        isTemplate = false,
        templateId = null,
        autoOrganize = false,
        inheritPermissions = true,
        notifyOnChanges = true
      } = folderData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!name) {
        throw new Error('Folder name is required');
      }

      // Sanitize inputs
      const sanitizedName = sanitize(name);
      const sanitizedDescription = sanitize(description);

      // Validate parent folder if specified
      let parentFolder = null;
      if (parentId) {
        parentFolder = await Folder.findById(parentId);
        if (!parentFolder) {
          throw new Error('Parent folder not found');
        }

        // Check permissions on parent folder
        const canCreateIn = await this.checkFolderPermission(parentFolder, userId, FOLDER_PERMISSIONS.CREATE);
        if (!canCreateIn) {
          throw new Error('Insufficient permissions to create folder in parent location');
        }
      }

      // Generate folder path
      const folderPath = await this.generateFolderPath(sanitizedName, parentFolder, procurementId, entityType, entityId);

      // Check for path conflicts
      const existingFolder = await Folder.findOne({ path: folderPath });
      if (existingFolder) {
        throw new Error('A folder with this path already exists');
      }

      // Validate security constraints
      const securityCheck = await assessFolderSecurity(folderPath, folderType, userId);
      if (!securityCheck.allowed) {
        throw new Error(`Security validation failed: ${securityCheck.reason}`);
      }

      // Generate folder structure based on template if specified
      let templateStructure = null;
      if (templateId) {
        templateStructure = await this.loadFolderTemplate(templateId);
      } else if (isTemplate) {
        templateStructure = await this.generateDefaultTemplate(folderType, procurementId);
      }

      // Calculate folder permissions
      const calculatedPermissions = await this.calculateFolderPermissions(
        parentFolder,
        permissions,
        accessLevel,
        inheritPermissions,
        userId
      );

      // Create folder record
      const folder = new Folder({
        name: sanitizedName,
        displayName: sanitizedName,
        description: sanitizedDescription,
        path: folderPath,
        parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
        
        // Folder classification
        folderType,
        entityType,
        entityId: entityId ? new mongoose.Types.ObjectId(entityId) : null,
        procurementId: procurementId ? new mongoose.Types.ObjectId(procurementId) : null,
        
        // Access control
        accessLevel,
        permissions: calculatedPermissions,
        owners: [userId],
        collaborators: [],
        viewers: [],
        
        // Organization features
        structure: {
          isTemplate,
          templateId: templateId ? new mongoose.Types.ObjectId(templateId) : null,
          autoOrganize,
          sortOrder: 0,
          displayOrder: await this.getNextDisplayOrder(parentId),
          hierarchy: await this.calculateHierarchy(parentFolder)
        },
        
        // Content management
        content: {
          documentCount: 0,
          subfolderCount: 0,
          totalSize: 0,
          lastActivity: new Date(),
          fileTypes: new Map(),
          searchIndex: this.generateSearchIndex(sanitizedName, sanitizedDescription, tags)
        },
        
        // Security and compliance
        security: {
          encryptionEnabled: securityCheck.requiresEncryption,
          accessRestricted: securityCheck.restrictAccess,
          auditLevel: securityCheck.auditLevel,
          retentionPolicy,
          legalHold: false,
          complianceFlags: [],
          securityLabels: securityCheck.labels || []
        },
        
        // Lifecycle management
        lifecycle: {
          status: FOLDER_STATUS.ACTIVE,
          version: '1.0',
          createdAt: new Date(),
          createdBy: userId,
          lastModified: new Date(),
          modifiedBy: userId,
          archivedAt: null,
          deletedAt: null,
          statusHistory: [{
            status: FOLDER_STATUS.ACTIVE,
            changedAt: new Date(),
            changedBy: userId,
            reason: 'Initial creation'
          }]
        },
        
        // Workflow and automation
        workflow: {
          autoArchive: false,
          archiveAfterDays: 0,
          notifyOnChanges,
          escalationRules: [],
          automationRules: []
        },
        
        // Integration and references
        integration: {
          externalReferences: [],
          syncedSystems: [],
          webhooks: [],
          apiKeys: []
        },
        
        // Metadata and tagging
        metadata: {
          tags: tags.map(tag => sanitize(tag.toLowerCase())),
          customFields: metadata,
          keywords: this.extractKeywords(sanitizedName, sanitizedDescription),
          categories: [],
          labels: []
        },
        
        // Activity tracking
        activity: {
          accessCount: 0,
          lastAccessed: null,
          modificationCount: 0,
          shareCount: 0,
          downloadCount: 0,
          uploadCount: 0
        },
        
        // System tracking
        system: {
          creationIP: ipAddress,
          creationUserAgent: userAgent,
          checksums: {
            structure: '',
            permissions: '',
            content: ''
          },
          backupInfo: {
            lastBackup: null,
            backupLocation: null,
            restorePoints: []
          }
        }
      });

      await folder.save();

      // Create template structure if needed
      if (templateStructure) {
        await this.createTemplateStructure(folder, templateStructure, userId);
      }

      // Set up folder workspace
      await this.setupFolderWorkspace(folder);

      // Create default subfolders for specific types
      if (folderType === FOLDER_TYPES.PROCUREMENT && procurementId) {
        await this.createProcurementSubfolders(folder, procurementId, userId);
      }

      // Send creation notifications
      if (notifyOnChanges) {
        await this.sendFolderCreationNotifications(folder, userId);
      }

      // Create audit trail
      await auditService.logAuditEvent({
        action: FOLDER_EVENTS.CREATED,
        entityType: 'folder',
        entityId: folder._id,
        userId,
        metadata: {
          folderName: folder.name,
          folderPath: folder.path,
          folderType,
          parentId,
          procurementId,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: 'Folder created successfully',
        folder: {
          id: folder._id,
          name: folder.name,
          path: folder.path,
          type: folder.folderType,
          permissions: folder.permissions,
          status: folder.lifecycle.status
        }
      };

    } catch (error) {
      logger.error('Error creating folder', { 
        error: error.message, 
        folderData, 
        userId 
      });
      throw new Error(`Folder creation failed: ${error.message}`);
    }
  }

  /**
   * Generate folder path for entity (enhanced legacy compatibility method)
   */
  static async generateFolderPath(name, parentFolder = null, procurementId = null, entityType = null, entityId = null) {
    try {
      // Enhanced path generation with sanitization and validation
      const sanitizedName = sanitize(name).replace(/[^a-zA-Z0-9-_\s]/g, '').trim();
      const pathName = sanitizedName.replace(/\s+/g, '_').toLowerCase();

      if (parentFolder) {
        return `${parentFolder.path}/${pathName}`;
      }

      if (procurementId && entityType && entityId) {
        return `procurements/${procurementId}/${entityType}/${entityId}/${pathName}`;
      }

      if (procurementId && entityType) {
        return `procurements/${procurementId}/${entityType}/${pathName}`;
      }

      if (procurementId) {
        return `procurements/${procurementId}/${pathName}`;
      }

      return `folders/${pathName}`;

    } catch (error) {
      logger.error('Error generating folder path', { 
        error: error.message, 
        name, 
        parentFolder, 
        procurementId, 
        entityType, 
        entityId 
      });
      throw new Error(`Path generation failed: ${error.message}`);
    }
  }

  /**
   * Generate procurement folder structure (enhanced legacy compatibility method)
   */
  static async generateProcurementFolderStructure(procurementId, userId) {
    try {
      const procurement = await Procurement.findById(procurementId);
      if (!procurement) {
        throw new Error('Procurement not found');
      }

      const basePath = `procurements/${procurementId}`;
      
      const structure = {
        root: basePath,
        planning: `${basePath}/planning`,
        rfq: `${basePath}/rfqs`,
        submissions: `${basePath}/submissions`,
        evaluations: `${basePath}/evaluations`,
        approvals: `${basePath}/approvals`,
        awards: `${basePath}/awards`,
        contracts: `${basePath}/contracts`,
        documents: `${basePath}/documents`,
        archive: `${basePath}/archive`,
        templates: `${basePath}/templates`,
        correspondence: `${basePath}/correspondence`,
        reports: `${basePath}/reports`
      };

      // Create all folders in the structure
      const createdFolders = {};
      for (const [key, path] of Object.entries(structure)) {
        if (key !== 'root') {
          const folderName = key.charAt(0).toUpperCase() + key.slice(1);
          const folder = await this.createFolder({
            name: folderName,
            description: `${folderName} folder for procurement ${procurement.procurementNumber}`,
            folderType: FOLDER_TYPES.WORKFLOW,
            procurementId: procurementId,
            autoOrganize: true,
            notifyOnChanges: false
          }, userId, {});

          createdFolders[key] = folder.folder;
        }
      }

      return {
        procurementId,
        structure,
        createdFolders,
        createdAt: new Date()
      };

    } catch (error) {
      logger.error('Error generating procurement folder structure', { 
        error: error.message, 
        procurementId, 
        userId 
      });
      throw new Error(`Procurement folder structure generation failed: ${error.message}`);
    }
  }

  /**
   * Organize folders by document type (enhanced legacy compatibility method)
   */
  static async organizeFoldersByDocumentType(procurementId, userId) {
    try {
      const basePath = `procurements/${procurementId}/documents`;
      
      const documentTypeStructure = {
        specifications: `${basePath}/specifications`,
        termsConditions: `${basePath}/terms_conditions`,
        evaluationCriteria: `${basePath}/evaluation_criteria`,
        tenderDocument: `${basePath}/tender`,
        submissions: `${basePath}/submissions`,
        evaluationReports: `${basePath}/evaluation_reports`,
        awardNotice: `${basePath}/award_notice`,
        contracts: `${basePath}/contracts`,
        amendments: `${basePath}/amendments`,
        correspondences: `${basePath}/correspondences`,
        legalDocuments: `${basePath}/legal`,
        financialDocuments: `${basePath}/financial`,
        technicalDocuments: `${basePath}/technical`
      };

      // Create document type folders
      const createdFolders = {};
      for (const [type, path] of Object.entries(documentTypeStructure)) {
        const folderName = type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const folder = await this.createFolder({
          name: folderName,
          description: `${folderName} for procurement documents`,
          folderType: FOLDER_TYPES.DOCUMENT_TYPE,
          procurementId: procurementId,
          autoOrganize: true,
          notifyOnChanges: false
        }, userId, {});

        createdFolders[type] = folder.folder;
      }

      return {
        procurementId,
        documentTypes: documentTypeStructure,
        createdFolders,
        organizationDate: new Date()
      };

    } catch (error) {
      logger.error('Error organizing folders by document type', { 
        error: error.message, 
        procurementId, 
        userId 
      });
      throw new Error(`Document type organization failed: ${error.message}`);
    }
  }

  /**
   * Enhanced folder metadata retrieval (enhanced legacy compatibility method)
   */
  static async getFolderMetadata(entityType, entityId, procurementId) {
    try {
      const path = await this.generateFolderPath('metadata', null, procurementId, entityType, entityId);
      
      const folder = await Folder.findOne({ path });
      if (!folder) {
        return {
          path,
          entityType,
          entityId,
          procurementId,
          exists: false,
          createdAt: null,
          files: [],
          subfolders: []
        };
      }

      const contents = await this.getFolderContents(folder);
      
      return {
        ...folder.toObject(),
        exists: true,
        files: contents.documents || [],
        subfolders: contents.subfolders || []
      };

    } catch (error) {
      logger.error('Error getting folder metadata', { 
        error: error.message, 
        entityType, 
        entityId, 
        procurementId 
      });
      throw new Error(`Metadata retrieval failed: ${error.message}`);
    }
  }

  /**
   * Build complete folder tree for procurement (enhanced legacy compatibility method)
   */
  static async buildFolderTree(procurementId, userId, maxDepth = 5) {
    try {
      const procurement = await Procurement.findById(procurementId);
      if (!procurement) {
        throw new Error('Procurement not found');
      }

      // Get or create root procurement folder
      let rootFolder = await Folder.findOne({
        procurementId: procurementId,
        folderType: FOLDER_TYPES.PROCUREMENT,
        parentId: null
      });

      if (!rootFolder) {
        const createResult = await this.createFolder({
          name: `Procurement ${procurement.procurementNumber}`,
          description: `Root folder for procurement ${procurement.title}`,
          folderType: FOLDER_TYPES.PROCUREMENT,
          procurementId: procurementId,
          autoOrganize: true
        }, userId, {});
        rootFolder = await Folder.findById(createResult.folder.id);
      }

      // Build hierarchical tree structure
      const tree = await this.buildFolderHierarchy(rootFolder, userId, maxDepth, 0);

      // Generate folder statistics
      const statistics = await this.generateTreeStatistics(tree);

      return {
        procurementId,
        procurement: {
          number: procurement.procurementNumber,
          title: procurement.title,
          status: procurement.status
        },
        rootFolder: {
          id: rootFolder._id,
          name: rootFolder.name,
          path: rootFolder.path
        },
        tree,
        statistics,
        generatedAt: new Date(),
        maxDepth
      };

    } catch (error) {
      logger.error('Error building folder tree', { 
        error: error.message, 
        procurementId, 
        userId 
      });
      throw new Error(`Folder tree build failed: ${error.message}`);
    }
  }

  /**
   * Enhanced folder path validation (enhanced legacy compatibility method)
   */
  static validateFolderPath(path) {
    try {
      // Comprehensive security validation
      if (!path || typeof path !== 'string') {
        return { valid: false, reason: 'Invalid path format' };
      }

      // Check for directory traversal attempts
      if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
        return { valid: false, reason: 'Directory traversal attempt detected' };
      }

      // Check for invalid characters
      const invalidChars = /[<>:"|?*\x00-\x1f]/;
      if (invalidChars.test(path)) {
        return { valid: false, reason: 'Invalid characters in path' };
      }

      // Check path length
      if (path.length > 260) {
        return { valid: false, reason: 'Path too long' };
      }

      // Check for reserved names
      const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
      const pathParts = path.toLowerCase().split('/');
      for (const part of pathParts) {
        if (reservedNames.includes(part) || part.endsWith('.')) {
          return { valid: false, reason: 'Reserved name or invalid format' };
        }
      }

      return { valid: true, reason: null };

    } catch (error) {
      logger.error('Error validating folder path', { error: error.message, path });
      return { valid: false, reason: 'Validation error occurred' };
    }
  }

  /**
   * Enhanced folder statistics (enhanced legacy compatibility method)
   */
  static async getFolderStats(folderPath) {
    try {
      const folder = await Folder.findOne({ path: folderPath });
      if (!folder) {
        return {
          path: folderPath,
          exists: false,
          fileCount: 0,
          totalSize: 0,
          lastModified: null
        };
      }

      const size = await this.calculateFolderSize(folder);
      const contents = await this.getFolderContents(folder);

      return {
        path: folderPath,
        exists: true,
        folderId: folder._id,
        folderType: folder.folderType,
        status: folder.lifecycle.status,
        fileCount: contents.documents?.length || 0,
        subfolderCount: contents.subfolders?.length || 0,
        totalSize: size.bytes,
        formattedSize: size.formatted,
        lastModified: folder.lifecycle.lastModified,
        lastAccessed: folder.activity.lastAccessed,
        createdAt: folder.lifecycle.createdAt,
        permissions: folder.permissions,
        accessLevel: folder.accessLevel,
        isShared: folder.collaborators?.length > 0,
        tags: folder.metadata.tags
      };

    } catch (error) {
      logger.error('Error getting folder stats', { error: error.message, folderPath });
      throw new Error(`Stats retrieval failed: ${error.message}`);
    }
  }

  // Helper methods for complex operations
  static async calculateHierarchy(parentFolder) { 
    if (!parentFolder) return [];
    const hierarchy = [];
    let current = parentFolder;
    while (current) {
      hierarchy.unshift({
        id: current._id,
        name: current.name,
        path: current.path
      });
      if (current.parentId) {
        current = await Folder.findById(current.parentId);
      } else {
        current = null;
      }
    }
    return hierarchy;
  }

  static async getNextDisplayOrder(parentId) {
    const lastFolder = await Folder.findOne({ parentId })
      .sort({ 'structure.displayOrder': -1 });
    return lastFolder ? lastFolder.structure.displayOrder + 1 : 1;
  }

  static generateSearchIndex(name, description, tags) {
    const text = `${name} ${description} ${tags.join(' ')}`.toLowerCase();
    const words = text.match(/\b\w{3,}\b/g) || [];
    return [...new Set(words)];
  }

  static extractKeywords(name, description) {
    const text = `${name} ${description}`.toLowerCase();
    const words = text.match(/\b\w{3,}\b/g) || [];
    return [...new Set(words)].slice(0, 20);
  }

  static calculateRetentionExpiry(archivedDate, retentionPeriod) {
    const date = new Date(archivedDate);
    switch (retentionPeriod) {
      case RETENTION_POLICIES.SHORT_TERM: return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
      case RETENTION_POLICIES.MEDIUM_TERM: return new Date(date.getFullYear() + 5, date.getMonth(), date.getDate());
      case RETENTION_POLICIES.LONG_TERM: return new Date(date.getFullYear() + 10, date.getMonth(), date.getDate());
      case RETENTION_POLICIES.PERMANENT: return null;
      case RETENTION_POLICIES.LEGAL_HOLD: return null;
      default: return new Date(date.getFullYear() + 5, date.getMonth(), date.getDate());
    }
  }

  // Placeholder methods for complex operations (to be implemented)
  static async loadFolderTemplate(templateId) { return null; }
  static async generateDefaultTemplate(folderType, procurementId) { return null; }
  static async calculateFolderPermissions(parentFolder, permissions, accessLevel, inherit, userId) { return permissions; }
  static async setupFolderWorkspace(folder) { }
  static async createTemplateStructure(folder, template, userId) { }
  static async createProcurementSubfolders(folder, procurementId, userId) { }
  static async checkFolderAccess(folder, userId) { return { allowed: true, level: 2 }; }
  static async checkFolderPermission(folder, userId, permission) { return true; }
  static async getFolderHierarchy(folder, maxDepth) { return []; }
  static async getFolderSubfolders(folder, userId, includeHidden) { return []; }
  static async getFolderContents(folder, userId = null) { return { documents: [], subfolders: [] }; }
  static async getFolderUserPermissions(folder, userId) { return {}; }
  static async getFolderActivity(folder, userId) { return {}; }
  static async getFolderAnalytics(folder) { return {}; }
  static async updateFolderAccess(folderId, userId) { }
  static async generateBreadcrumbs(folder) { return []; }
  static async getFullPath(folder) { return folder.path; }
  static async calculateFolderSize(folder) { return { bytes: 0, formatted: '0 B' }; }
  static assessFolderSecurityLevel(folder) { return 'standard'; }
  static async buildFolderAccessQuery(userId) { return {}; }
  static async generateFoldersSummary(query) { return {}; }
  static async getAvailableFolderFilters(userId) { return {}; }
  static async isDescendantFolder(folderId, potentialParentId) { return false; }
  static async updateFolderPaths(folder, newPath, newParentId) { }
  static async updateFolderStatistics(folderId) { }
  static async buildFolderHierarchy(rootFolder, userId, maxDepth, currentDepth) { return {}; }
  static async generateTreeStatistics(tree) { return {}; }
  static getSecurityIndicator(folder) { return 'standard'; }

  // Notification methods
  static async sendFolderCreationNotifications(folder, userId) { }
  static async sendFolderMoveNotifications(folder, oldPath, newPath, userId) { }
  static async sendFolderArchiveNotifications(folder, archiveData, userId) { }

  // Report generation methods
  static async generateFolderSummaryReport(folder) { return {}; }
  static async generateContentInventoryReport(folder) { return {}; }
  static async generateAccessReport(folder) { return {}; }
  static async generateActivityReport(folder) { return {}; }
  static async generateSecurityAuditReport(folder) { return {}; }
  static async generateComplianceReport(folder) { return {}; }
}

module.exports = FolderService;