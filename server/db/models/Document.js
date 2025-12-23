/**
 * Document Model
 * 
 * Data access layer for document records optimized for Azure Cosmos DB
 * Feature 10: Document management
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Document {
  constructor() {
    if (!Document.instance) {
      this.client = new CosmosClient({
        endpoint: config.cosmosDB.endpoint,
        key: config.cosmosDB.key,
        connectionPolicy: {
          preferredLocations: config.cosmosDB.preferredRegions,
          requestTimeout: 10000,
          retryOptions: {
            maxRetryAttemptCount: 3,
            fixedRetryIntervalInMilliseconds: 1000
          }
        }
      });
      
      this.database = this.client.database(config.cosmosDB.databaseId);
      this.container = this.database.container('documents');
      
      Document.instance = this;
    }
    return Document.instance;
  }

  // Diagnostic logging helper
  _logDiagnostics(operation, diagnostics, executionTime) {
    if (executionTime > 1000 || diagnostics.statusCode >= 400) {
      logger.warn(`Cosmos DB Performance Alert: ${operation}`, {
        executionTime,
        statusCode: diagnostics.statusCode,
        requestCharge: diagnostics.requestCharge,
        diagnostics: diagnostics.toString()
      });
    }
  }

  /**
   * Create a new document with embedded metadata and versioning
   */
  async create({
    entityType,
    entityId,
    documentType,
    title,
    fileUrl,
    fileHash,
    uploadedBy,
    description,
    version,
    uploaderInfo = {},
    metadata = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const document = {
        id,
        type: 'document',
        // Hierarchical partition key: entityType|entityId for targeted queries
        partitionKey: `${entityType}|${entityId}`,
        entityType,
        entityId,
        documentType,
        title,
        fileUrl,
        fileHash,
        uploadedBy,
        description: description || '',
        version: version || 1,
        createdAt: now,
        updatedAt: now,
        
        // File information embedded
        file: {
          url: fileUrl,
          hash: fileHash,
          size: metadata.fileSize || null,
          mimeType: metadata.mimeType || null,
          extension: this._extractFileExtension(fileUrl),
          originalName: metadata.originalName || title
        },
        
        // Embedded uploader information for faster queries
        uploader: {
          id: uploadedBy,
          name: uploaderInfo.name || 'Unknown',
          email: uploaderInfo.email,
          department: uploaderInfo.department,
          role: uploaderInfo.role
        },
        
        // Document versioning and history
        versioning: {
          currentVersion: version || 1,
          isLatest: true,
          parentVersionId: null,
          versionHistory: [{
            version: version || 1,
            uploadedAt: now,
            uploadedBy,
            changes: 'Initial upload',
            fileHash
          }]
        },
        
        // Access control and permissions
        access: {
          visibility: metadata.visibility || 'internal', // public, internal, restricted
          permissions: metadata.permissions || [],
          downloadCount: 0,
          lastAccessed: null
        },
        
        // Document status and lifecycle
        status: {
          current: 'active',
          archived: false,
          approved: metadata.requiresApproval ? false : true,
          approvedBy: null,
          approvedAt: null,
          expiryDate: metadata.expiryDate ? new Date(metadata.expiryDate) : null
        },
        
        // Classification and organization
        classification: {
          category: documentType,
          subcategory: metadata.subcategory,
          tags: metadata.tags || [],
          confidentialityLevel: metadata.confidentialityLevel || 'internal'
        },
        
        // Metadata for search and analytics
        metadata: {
          searchableContent: this._extractSearchableText(title, description),
          language: metadata.language || 'en',
          keywords: this._extractKeywords(title, description),
          relatedEntities: [],
          lastActivity: now,
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: uploadedBy,
            details: 'Document uploaded'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(document);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating document', { error: error.message });
      throw error;
    }
  }

  /**
   * Get document by ID with partition key optimization
   */
  async findById(id, entityType = null, entityId = null) {
    try {
      const startTime = Date.now();
      
      if (entityType && entityId) {
        // Direct partition read - most efficient
        const partitionKey = `${entityType}|${entityId}`;
        const { resource, diagnostics } = await this.container
          .item(id, partitionKey)
          .read();
          
        this._logDiagnostics('findById-direct', diagnostics, Date.now() - startTime);
        
        // Update access tracking
        if (resource) {
          await this._updateAccessTracking(id, partitionKey);
        }
        
        return resource;
      } else {
        // Cross-partition query when partition key unknown
        const querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.id = @id AND c.type = 'document'
          `,
          parameters: [
            { name: '@id', value: id }
          ]
        };

        const { resources, diagnostics } = await this.container.items
          .query(querySpec)
          .fetchAll();

        this._logDiagnostics('findById-query', diagnostics, Date.now() - startTime);
        
        if (resources[0]) {
          await this._updateAccessTracking(id, resources[0].partitionKey);
        }
        
        return resources[0];
      }
    } catch (error) {
      logger.error('Error finding document by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all documents with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'document' AND c.status.archived = false";
      const parameters = [];

      // Build dynamic query with proper indexing
      if (filters.entityType) {
        whereClause += ` AND c.entityType = @entityType`;
        parameters.push({ name: '@entityType', value: filters.entityType });
      }

      if (filters.entityId) {
        whereClause += ` AND c.entityId = @entityId`;
        parameters.push({ name: '@entityId', value: filters.entityId });
      }

      if (filters.documentType) {
        whereClause += ` AND c.documentType = @documentType`;
        parameters.push({ name: '@documentType', value: filters.documentType });
      }

      if (filters.uploadedBy) {
        whereClause += ` AND c.uploadedBy = @uploadedBy`;
        parameters.push({ name: '@uploadedBy', value: filters.uploadedBy });
      }

      if (filters.visibility) {
        whereClause += ` AND c.access.visibility = @visibility`;
        parameters.push({ name: '@visibility', value: filters.visibility });
      }

      if (filters.status) {
        whereClause += ` AND c.status.current = @status`;
        parameters.push({ name: '@status', value: filters.status });
      }

      if (filters.tags && filters.tags.length > 0) {
        whereClause += ` AND ARRAY_CONTAINS(@tags, c.classification.tags, true)`;
        parameters.push({ name: '@tags', value: filters.tags });
      }

      if (filters.dateFrom) {
        whereClause += ` AND c.createdAt >= @dateFrom`;
        parameters.push({ name: '@dateFrom', value: filters.dateFrom });
      }

      if (filters.dateTo) {
        whereClause += ` AND c.createdAt <= @dateTo`;
        parameters.push({ name: '@dateTo', value: filters.dateTo });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.createdAt DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, {
          // Use partition key when filtering by entity
          partitionKey: filters.entityType && filters.entityId ? 
            `${filters.entityType}|${filters.entityId}` : undefined
        })
        .fetchAll();

      this._logDiagnostics('getAll', diagnostics, Date.now() - startTime);

      // Get total count for pagination
      const countQuery = {
        query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
        parameters
      };

      const { resources: countResult } = await this.container.items
        .query(countQuery)
        .fetchAll();

      return {
        items: resources,
        total: countResult[0] || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult[0] || 0) / limit)
      };
    } catch (error) {
      logger.error('Error getting all documents', { error: error.message });
      throw error;
    }
  }

  /**
   * Update document with versioning and audit tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current document first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Document not found');
      }

      const now = new Date();
      
      // Handle file updates (create new version)
      const isFileUpdate = updates.fileUrl && updates.fileUrl !== current.fileUrl;
      
      // Prepare the updated document
      const updatedDocument = {
        ...current,
        ...updates,
        updatedAt: now,
        metadata: {
          ...current.metadata,
          lastActivity: now,
          auditTrail: [
            ...current.metadata.auditTrail,
            {
              action: isFileUpdate ? 'file_updated' : 'updated',
              timestamp: now,
              user: updates.updatedBy || 'system',
              details: updates.updateReason || 'Document updated',
              changes: Object.keys(updates).filter(key => 
                !['updatedBy', 'updateReason'].includes(key)
              )
            }
          ]
        }
      };

      // Handle file version updates
      if (isFileUpdate) {
        const newVersion = current.versioning.currentVersion + 1;
        updatedDocument.version = newVersion;
        updatedDocument.versioning = {
          ...current.versioning,
          currentVersion: newVersion,
          versionHistory: [
            ...current.versioning.versionHistory,
            {
              version: newVersion,
              uploadedAt: now,
              uploadedBy: updates.updatedBy || 'system',
              changes: updates.versionNotes || 'File updated',
              fileHash: updates.fileHash
            }
          ]
        };
        
        updatedDocument.file = {
          ...current.file,
          url: updates.fileUrl,
          hash: updates.fileHash,
          size: updates.fileSize || current.file.size,
          originalName: updates.originalName || current.file.originalName
        };
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedDocument);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating document', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete document (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating status
      const updatedDocument = await this.update(id, {
        'status.current': 'deleted',
        'status.archived': true,
        deletedAt: new Date(),
        deletedBy,
        updatedBy: deletedBy,
        updateReason: 'Document deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedDocument;
    } catch (error) {
      logger.error('Error deleting document', { error: error.message });
      throw error;
    }
  }

  /**
   * Get documents by entity with partition-optimized query
   */
  async getByEntity(entityType, entityId, includeArchived = false) {
    try {
      const startTime = Date.now();
      const partitionKey = `${entityType}|${entityId}`;
      
      let whereClause = "c.type = 'document' AND c.entityType = @entityType AND c.entityId = @entityId";
      const parameters = [
        { name: '@entityType', value: entityType },
        { name: '@entityId', value: entityId }
      ];

      if (!includeArchived) {
        whereClause += " AND c.status.archived = false";
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.createdAt DESC
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, { partitionKey })
        .fetchAll();

      this._logDiagnostics('getByEntity', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting documents by entity', { error: error.message });
      throw error;
    }
  }

  /**
   * Get document versions with partition-optimized query
   */
  async getVersions(entityType, entityId, documentType) {
    try {
      const startTime = Date.now();
      const partitionKey = `${entityType}|${entityId}`;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'document' 
          AND c.entityType = @entityType 
          AND c.entityId = @entityId
          AND c.documentType = @documentType
          ORDER BY c.versioning.currentVersion DESC
        `,
        parameters: [
          { name: '@entityType', value: entityType },
          { name: '@entityId', value: entityId },
          { name: '@documentType', value: documentType }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, { partitionKey })
        .fetchAll();

      this._logDiagnostics('getVersions', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting document versions', { error: error.message });
      throw error;
    }
  }

  /**
   * Search documents with full-text capabilities
   */
  async searchDocuments(searchCriteria) {
    try {
      const startTime = Date.now();
      const {
        keyword,
        entityTypes = [],
        documentTypes = [],
        tags = [],
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = searchCriteria;

      const offset = (page - 1) * limit;
      let whereClause = "c.type = 'document' AND c.status.archived = false";
      const parameters = [];

      // Keyword search across searchable content
      if (keyword) {
        whereClause += ` AND CONTAINS(c.metadata.searchableContent, @keyword)`;
        parameters.push({ name: '@keyword', value: keyword });
      }

      // Array-based filters
      if (entityTypes.length > 0) {
        whereClause += ` AND c.entityType IN (${entityTypes.map((_, i) => `@entityType${i}`).join(', ')})`;
        entityTypes.forEach((entityType, i) => {
          parameters.push({ name: `@entityType${i}`, value: entityType });
        });
      }

      if (documentTypes.length > 0) {
        whereClause += ` AND c.documentType IN (${documentTypes.map((_, i) => `@documentType${i}`).join(', ')})`;
        documentTypes.forEach((documentType, i) => {
          parameters.push({ name: `@documentType${i}`, value: documentType });
        });
      }

      // Date range
      if (dateFrom) {
        whereClause += ` AND c.createdAt >= @dateFrom`;
        parameters.push({ name: '@dateFrom', value: dateFrom });
      }

      if (dateTo) {
        whereClause += ` AND c.createdAt <= @dateTo`;
        parameters.push({ name: '@dateTo', value: dateTo });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.createdAt DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('searchDocuments', diagnostics, Date.now() - startTime);

      return resources;
    } catch (error) {
      logger.error('Error searching documents', { error: error.message });
      throw error;
    }
  }

  /**
   * Get document analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'document' AND c.status.archived = false";
      const parameters = [];

      if (filters.entityType) {
        whereClause += ` AND c.entityType = @entityType`;
        parameters.push({ name: '@entityType', value: filters.entityType });
      }

      if (filters.dateFrom) {
        whereClause += ` AND c.createdAt >= @dateFrom`;
        parameters.push({ name: '@dateFrom', value: filters.dateFrom });
      }

      if (filters.dateTo) {
        whereClause += ` AND c.createdAt <= @dateTo`;
        parameters.push({ name: '@dateTo', value: filters.dateTo });
      }

      const querySpec = {
        query: `
          SELECT 
            c.documentType,
            c.entityType,
            c.classification.category,
            c.access.downloadCount,
            c.uploader.department,
            c.createdAt
          FROM c 
          WHERE ${whereClause}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getAnalytics', diagnostics, Date.now() - startTime);

      // Process analytics data
      const analytics = {
        totalDocuments: resources.length,
        documentTypeBreakdown: {},
        entityTypeBreakdown: {},
        departmentBreakdown: {},
        totalDownloads: 0,
        uploadTrends: {}
      };

      resources.forEach(doc => {
        // Document type breakdown
        analytics.documentTypeBreakdown[doc.documentType] = 
          (analytics.documentTypeBreakdown[doc.documentType] || 0) + 1;

        // Entity type breakdown
        analytics.entityTypeBreakdown[doc.entityType] = 
          (analytics.entityTypeBreakdown[doc.entityType] || 0) + 1;

        // Department breakdown
        const dept = doc.uploader?.department || 'unknown';
        analytics.departmentBreakdown[dept] = 
          (analytics.departmentBreakdown[dept] || 0) + 1;

        // Downloads
        analytics.totalDownloads += doc.access?.downloadCount || 0;

        // Upload trends (monthly)
        const monthKey = new Date(doc.createdAt).toISOString().slice(0, 7); // YYYY-MM
        analytics.uploadTrends[monthKey] = 
          (analytics.uploadTrends[monthKey] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting document analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for document service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'document'",
          parameters: []
        })
        .fetchNext();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        requestCharge: diagnostics?.requestCharge || 0,
        timestamp: new Date(),
        database: {
          connected: true,
          container: this.container.id
        }
      };
    } catch (error) {
      logger.error('Document health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
        database: {
          connected: false
        }
      };
    }
  }

  // Private helper methods
  async _updateAccessTracking(id, partitionKey) {
    try {
      const operations = [
        { op: 'incr', path: '/access/downloadCount', value: 1 },
        { op: 'replace', path: '/access/lastAccessed', value: new Date() }
      ];

      await this.container
        .item(id, partitionKey)
        .patch(operations);
    } catch (error) {
      logger.warn('Error updating access tracking', { error: error.message });
    }
  }

  _extractFileExtension(fileUrl) {
    if (!fileUrl) return null;
    const parts = fileUrl.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
  }

  _extractSearchableText(title, description) {
    return `${title || ''} ${description || ''}`.trim().toLowerCase();
  }

  _extractKeywords(title, description) {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    // Simple keyword extraction - remove common words and split
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
    const words = text.split(/\s+/).filter(word => 
      word.length > 2 && !commonWords.includes(word)
    );
    return [...new Set(words)]; // Remove duplicates
  }
}

module.exports = new Document();
