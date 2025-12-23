/**
 * RFQ Model
 * 
 * Data access layer for Request for Quotation records optimized for Azure Cosmos DB
 * Feature 3: RFQ creation and management
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class RFQ {
  constructor() {
    if (!RFQ.instance) {
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
      this.container = this.database.container('rfqs');
      
      RFQ.instance = this;
    }
    return RFQ.instance;
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
   * Create a new RFQ with embedded procurement data and hierarchical partition key
   */
  async create({
    procurementId,
    title,
    description,
    status,
    publishDate,
    closingDate,
    createdBy,
    evaluationCriteria,
    procurementInfo = {},
    creatorInfo = {},
    departmentInfo = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const rfq = {
        id,
        type: 'rfq',
        // Hierarchical partition key: procurementId|department for targeted queries
        partitionKey: `${procurementId}|${departmentInfo.name || procurementInfo.department || 'general'}`,
        procurementId,
        title,
        description,
        status,
        publishDate: publishDate ? new Date(publishDate) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
        createdBy,
        evaluationCriteria: evaluationCriteria || [],
        createdAt: now,
        updatedAt: now,
        
        // Embedded procurement information for faster queries
        procurement: {
          id: procurementId,
          title: procurementInfo.title,
          category: procurementInfo.category,
          department: procurementInfo.department || departmentInfo.name,
          estimatedValue: procurementInfo.estimatedValue,
          priority: procurementInfo.priority,
          budgetCode: procurementInfo.budgetCode
        },
        
        // Embedded creator information
        creator: {
          id: createdBy,
          name: creatorInfo.name,
          email: creatorInfo.email,
          department: creatorInfo.department || departmentInfo.name,
          role: creatorInfo.role
        },
        
        // RFQ lifecycle and status management
        lifecycle: {
          currentStage: status,
          stages: [{
            stage: status,
            completedAt: now,
            completedBy: createdBy,
            notes: 'RFQ created'
          }],
          amendments: [],
          extensions: []
        },
        
        // Evaluation framework
        evaluation: {
          criteria: evaluationCriteria.map(criterion => ({
            id: uuidv4(),
            name: criterion.name,
            weight: criterion.weight,
            type: criterion.type, // technical, financial, compliance
            description: criterion.description,
            scoringMethod: criterion.scoringMethod // pass/fail, numeric, weighted
          })),
          evaluators: [],
          evaluationDeadline: null,
          technicalDeadline: null,
          financialDeadline: null
        },
        
        // Vendor participation tracking
        participation: {
          invitedVendors: [],
          submittedVendors: [],
          clarificationRequests: [],
          totalSubmissions: 0,
          qualifiedSubmissions: 0
        },
        
        // Document management
        documents: {
          specifications: [],
          attachments: [],
          amendments: [],
          clarifications: []
        },
        
        // Timeline and deadline management
        timeline: {
          publishDate: publishDate ? new Date(publishDate) : null,
          closingDate: closingDate ? new Date(closingDate) : null,
          evaluationStartDate: null,
          evaluationEndDate: null,
          awardDate: null,
          milestones: []
        },
        
        // Metadata for analytics and reporting
        metadata: {
          department: departmentInfo.name || procurementInfo.department,
          category: procurementInfo.category,
          subcategory: procurementInfo.subcategory,
          fiscalYear: new Date(publishDate || now).getFullYear(),
          quarter: Math.floor((new Date(publishDate || now).getMonth() + 3) / 3),
          estimatedValue: procurementInfo.estimatedValue || 0,
          currency: 'USD', // Default currency
          tags: this._generateTags(title, description, procurementInfo),
          confidentialityLevel: 'internal',
          lastActivity: now,
          version: 1,
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: createdBy,
            details: 'RFQ record created'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(rfq);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating RFQ', { error: error.message });
      throw error;
    }
  }

  /**
   * Get RFQ by ID with partition key optimization
   */
  async findById(id, procurementId = null, department = null) {
    try {
      const startTime = Date.now();
      
      if (procurementId && department) {
        // Direct partition read - most efficient
        const partitionKey = `${procurementId}|${department}`;
        const { resource, diagnostics } = await this.container
          .item(id, partitionKey)
          .read();
          
        this._logDiagnostics('findById-direct', diagnostics, Date.now() - startTime);
        return resource;
      } else {
        // Cross-partition query when partition key unknown
        const querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.id = @id AND c.type = 'rfq'
          `,
          parameters: [
            { name: '@id', value: id }
          ]
        };

        const { resources, diagnostics } = await this.container.items
          .query(querySpec)
          .fetchAll();

        this._logDiagnostics('findById-query', diagnostics, Date.now() - startTime);
        return resources[0];
      }
    } catch (error) {
      logger.error('Error finding RFQ by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all RFQs with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'rfq'";
      const parameters = [];

      // Build dynamic query with proper indexing
      if (filters.status) {
        whereClause += ` AND c.status = @status`;
        parameters.push({ name: '@status', value: filters.status });
      }

      if (filters.procurementId) {
        whereClause += ` AND c.procurementId = @procurementId`;
        parameters.push({ name: '@procurementId', value: filters.procurementId });
      }

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.category) {
        whereClause += ` AND c.metadata.category = @category`;
        parameters.push({ name: '@category', value: filters.category });
      }

      if (filters.fiscalYear) {
        whereClause += ` AND c.metadata.fiscalYear = @fiscalYear`;
        parameters.push({ name: '@fiscalYear', value: parseInt(filters.fiscalYear) });
      }

      if (filters.publishedAfter) {
        whereClause += ` AND c.publishDate >= @publishedAfter`;
        parameters.push({ name: '@publishedAfter', value: filters.publishedAfter });
      }

      if (filters.closingBefore) {
        whereClause += ` AND c.closingDate <= @closingBefore`;
        parameters.push({ name: '@closingBefore', value: filters.closingBefore });
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
          // Use partition key when filtering by procurement and department
          partitionKey: filters.procurementId && filters.department ? 
            `${filters.procurementId}|${filters.department}` : undefined
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
      logger.error('Error getting all RFQs', { error: error.message });
      throw error;
    }
  }

  /**
   * Update RFQ with lifecycle and audit tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current RFQ first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('RFQ not found');
      }

      const now = new Date();
      
      // Handle status changes with lifecycle tracking
      const statusChanged = updates.status && updates.status !== current.status;
      
      // Handle timeline updates
      const timelineUpdates = {};
      if (updates.closingDate || updates.publishDate) {
        timelineUpdates.timeline = {
          ...current.timeline,
          ...(updates.publishDate && { publishDate: new Date(updates.publishDate) }),
          ...(updates.closingDate && { closingDate: new Date(updates.closingDate) })
        };
      }

      // Prepare the updated RFQ
      const updatedRFQ = {
        ...current,
        ...updates,
        ...timelineUpdates,
        updatedAt: now,
        metadata: {
          ...current.metadata,
          lastActivity: now,
          version: current.metadata.version + 1,
          auditTrail: [
            ...current.metadata.auditTrail,
            {
              action: statusChanged ? 'status_changed' : 'updated',
              timestamp: now,
              user: updates.updatedBy || 'system',
              details: updates.updateReason || 'RFQ updated',
              changes: Object.keys(updates).filter(key => 
                !['updatedBy', 'updateReason'].includes(key)
              )
            }
          ]
        }
      };

      // Handle status change lifecycle
      if (statusChanged) {
        updatedRFQ.lifecycle.stages.push({
          stage: updates.status,
          completedAt: now,
          completedBy: updates.updatedBy || 'system',
          notes: updates.statusNotes || `Status changed to ${updates.status}`
        });
        updatedRFQ.lifecycle.currentStage = updates.status;
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedRFQ);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating RFQ', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete RFQ (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating status
      const updatedRFQ = await this.update(id, {
        status: 'cancelled',
        deletedAt: new Date(),
        deletedBy,
        updatedBy: deletedBy,
        updateReason: 'RFQ cancelled/deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedRFQ;
    } catch (error) {
      logger.error('Error deleting RFQ', { error: error.message });
      throw error;
    }
  }

  /**
   * Get RFQs by procurement with partition-optimized query
   */
  async getByProcurement(procurementId, department = null) {
    try {
      const startTime = Date.now();
      
      let querySpec;
      let queryOptions = {};

      if (department) {
        // Partition-specific query - most efficient
        const partitionKey = `${procurementId}|${department}`;
        querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.type = 'rfq' 
            AND c.procurementId = @procurementId
            ORDER BY c.createdAt DESC
          `,
          parameters: [
            { name: '@procurementId', value: procurementId }
          ]
        };
        queryOptions.partitionKey = partitionKey;
      } else {
        // Cross-partition query for all departments
        querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.type = 'rfq' 
            AND c.procurementId = @procurementId
            ORDER BY c.createdAt DESC
          `,
          parameters: [
            { name: '@procurementId', value: procurementId }
          ]
        };
      }

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, queryOptions)
        .fetchAll();

      this._logDiagnostics('getByProcurement', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting RFQs by procurement', { error: error.message });
      throw error;
    }
  }

  /**
   * Get active RFQs with efficient filtering
   */
  async getActive(page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      const now = new Date().toISOString();
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'rfq' 
          AND c.status IN ('published', 'active')
          AND c.closingDate > @now
          ORDER BY c.closingDate ASC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters: [
          { name: '@now', value: now }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getActive', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting active RFQs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get RFQ analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'rfq'";
      const parameters = [];

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.fiscalYear) {
        whereClause += ` AND c.metadata.fiscalYear = @fiscalYear`;
        parameters.push({ name: '@fiscalYear', value: parseInt(filters.fiscalYear) });
      }

      const querySpec = {
        query: `
          SELECT 
            c.status,
            c.metadata.department,
            c.metadata.category,
            c.metadata.estimatedValue,
            c.participation.totalSubmissions,
            c.closingDate
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
        totalRFQs: resources.length,
        statusBreakdown: {},
        departmentBreakdown: {},
        categoryBreakdown: {},
        totalEstimatedValue: 0,
        averageSubmissions: 0,
        closingToday: 0
      };

      const today = new Date();
      today.setHours(23, 59, 59, 999);
      let totalSubmissions = 0;

      resources.forEach(rfq => {
        // Status breakdown
        analytics.statusBreakdown[rfq.status] = 
          (analytics.statusBreakdown[rfq.status] || 0) + 1;

        // Department breakdown
        const dept = rfq.metadata?.department || 'unknown';
        analytics.departmentBreakdown[dept] = 
          (analytics.departmentBreakdown[dept] || 0) + 1;

        // Category breakdown
        const category = rfq.metadata?.category || 'uncategorized';
        analytics.categoryBreakdown[category] = 
          (analytics.categoryBreakdown[category] || 0) + 1;

        // Financial calculations
        analytics.totalEstimatedValue += rfq.metadata?.estimatedValue || 0;

        // Submissions tracking
        totalSubmissions += rfq.participation?.totalSubmissions || 0;

        // Closing today
        if (rfq.closingDate && new Date(rfq.closingDate) <= today) {
          analytics.closingToday++;
        }
      });

      analytics.averageSubmissions = resources.length > 0 ? 
        Math.round((totalSubmissions / resources.length) * 100) / 100 : 0;

      return analytics;
    } catch (error) {
      logger.error('Error getting RFQ analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for RFQ service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'rfq'",
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
      logger.error('RFQ health check failed', { error: error.message });
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

  // Helper methods
  _generateTags(title, description, procurementInfo) {
    const tags = [];
    
    // Add category-based tags
    if (procurementInfo.category) {
      tags.push(procurementInfo.category.toLowerCase());
    }
    
    // Add priority tags
    if (procurementInfo.priority) {
      tags.push(procurementInfo.priority);
    }
    
    // Extract keywords from title and description
    const text = `${title} ${description}`.toLowerCase();
    const keywords = text.split(/\s+/).filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
    );
    
    tags.push(...keywords.slice(0, 5)); // Limit to 5 keywords
    
    return [...new Set(tags)]; // Remove duplicates
  }
}

module.exports = new RFQ();
