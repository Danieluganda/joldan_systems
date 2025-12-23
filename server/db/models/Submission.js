/**
 * Submission Model
 * 
 * Data access layer for vendor submissions optimized for Azure Cosmos DB
 * Feature 4: Bid/proposal submission management
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Submission {
  constructor() {
    if (!Submission.instance) {
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
      this.container = this.database.container('submissions');
      
      Submission.instance = this;
    }
    return Submission.instance;
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
   * Create a new submission with embedded RFQ and vendor data
   */
  async create({
    rfqId,
    vendorId,
    submissionDate,
    quotedPrice,
    technicalProposal,
    financialProposal,
    attachments,
    status,
    rfqInfo = {},
    vendorInfo = {},
    submitterInfo = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const submission = {
        id,
        type: 'submission',
        // Hierarchical partition key: rfqId|vendorId for targeted queries
        partitionKey: `${rfqId}|${vendorId}`,
        rfqId,
        vendorId,
        submissionDate: submissionDate ? new Date(submissionDate) : now,
        quotedPrice: parseFloat(quotedPrice) || 0,
        technicalProposal: technicalProposal || '',
        financialProposal: financialProposal || '',
        attachments: attachments || [],
        status: status || 'submitted',
        createdAt: now,
        updatedAt: now,
        
        // Embedded RFQ information for faster queries
        rfq: {
          id: rfqId,
          title: rfqInfo.title,
          closingDate: rfqInfo.closingDate,
          estimatedValue: rfqInfo.estimatedValue,
          department: rfqInfo.department,
          category: rfqInfo.category,
          procurementId: rfqInfo.procurementId
        },
        
        // Embedded vendor information
        vendor: {
          id: vendorId,
          name: vendorInfo.name,
          registrationNumber: vendorInfo.registrationNumber,
          email: vendorInfo.email,
          phone: vendorInfo.phone,
          address: vendorInfo.address,
          category: vendorInfo.category,
          rating: vendorInfo.rating
        },
        
        // Submission lifecycle and workflow
        workflow: {
          currentStage: status || 'submitted',
          stages: [{
            stage: status || 'submitted',
            completedAt: now,
            completedBy: submitterInfo.userId || vendorId,
            notes: 'Submission created'
          }],
          evaluations: [],
          clarifications: [],
          amendments: []
        },
        
        // Technical proposal details with structured data
        technical: {
          proposal: technicalProposal || '',
          specifications: [],
          deliveryTimeline: null,
          methodology: '',
          teamComposition: [],
          previousExperience: [],
          certifications: [],
          complianceDocuments: []
        },
        
        // Financial proposal breakdown
        financial: {
          proposal: financialProposal || '',
          quotedPrice: parseFloat(quotedPrice) || 0,
          currency: 'USD', // Default currency
          breakdown: [],
          paymentTerms: '',
          validityPeriod: null,
          discounts: [],
          additionalCosts: [],
          taxDetails: {}
        },
        
        // Document and attachment management
        documents: {
          attachments: (attachments || []).map(attachment => ({
            id: uuidv4(),
            name: attachment.name || attachment,
            url: attachment.url || attachment,
            type: attachment.type || 'document',
            size: attachment.size || null,
            uploadedAt: now
          })),
          technicalDocuments: [],
          financialDocuments: [],
          complianceDocuments: [],
          amendments: []
        },
        
        // Evaluation and scoring tracking
        evaluation: {
          overallScore: null,
          technicalScore: null,
          financialScore: null,
          complianceScore: null,
          evaluationStatus: 'pending',
          evaluatedBy: [],
          evaluationDate: null,
          feedback: '',
          recommendations: []
        },
        
        // Metadata for analytics and compliance
        metadata: {
          department: rfqInfo.department,
          category: rfqInfo.category,
          fiscalYear: new Date().getFullYear(),
          submissionMethod: 'online', // online, email, physical
          isLateSubmission: submissionDate ? 
            new Date(submissionDate) > new Date(rfqInfo.closingDate) : false,
          competitiveness: null, // will be calculated after evaluation
          tags: [],
          lastActivity: now,
          version: 1,
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: submitterInfo.userId || vendorId,
            details: 'Submission record created'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(submission);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating submission', { error: error.message });
      throw error;
    }
  }

  /**
   * Get submission by ID with partition key optimization
   */
  async findById(id, rfqId = null, vendorId = null) {
    try {
      const startTime = Date.now();
      
      if (rfqId && vendorId) {
        // Direct partition read - most efficient
        const partitionKey = `${rfqId}|${vendorId}`;
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
            WHERE c.id = @id AND c.type = 'submission'
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
      logger.error('Error finding submission by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all submissions with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'submission'";
      const parameters = [];

      // Build dynamic query with proper indexing
      if (filters.rfqId) {
        whereClause += ` AND c.rfqId = @rfqId`;
        parameters.push({ name: '@rfqId', value: filters.rfqId });
      }

      if (filters.vendorId) {
        whereClause += ` AND c.vendorId = @vendorId`;
        parameters.push({ name: '@vendorId', value: filters.vendorId });
      }

      if (filters.status) {
        whereClause += ` AND c.status = @status`;
        parameters.push({ name: '@status', value: filters.status });
      }

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.category) {
        whereClause += ` AND c.metadata.category = @category`;
        parameters.push({ name: '@category', value: filters.category });
      }

      if (filters.minPrice) {
        whereClause += ` AND c.quotedPrice >= @minPrice`;
        parameters.push({ name: '@minPrice', value: parseFloat(filters.minPrice) });
      }

      if (filters.maxPrice) {
        whereClause += ` AND c.quotedPrice <= @maxPrice`;
        parameters.push({ name: '@maxPrice', value: parseFloat(filters.maxPrice) });
      }

      if (filters.submissionDateFrom) {
        whereClause += ` AND c.submissionDate >= @submissionDateFrom`;
        parameters.push({ name: '@submissionDateFrom', value: filters.submissionDateFrom });
      }

      if (filters.submissionDateTo) {
        whereClause += ` AND c.submissionDate <= @submissionDateTo`;
        parameters.push({ name: '@submissionDateTo', value: filters.submissionDateTo });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.submissionDate DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, {
          // Use partition key when filtering by RFQ and vendor
          partitionKey: filters.rfqId && filters.vendorId ? 
            `${filters.rfqId}|${filters.vendorId}` : undefined
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
      logger.error('Error getting all submissions', { error: error.message });
      throw error;
    }
  }

  /**
   * Update submission with workflow and audit tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current submission first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Submission not found');
      }

      const now = new Date();
      
      // Handle status changes with workflow tracking
      const statusChanged = updates.status && updates.status !== current.status;
      
      // Handle evaluation updates
      const evaluationUpdates = {};
      if (updates.overallScore !== undefined || updates.technicalScore !== undefined || updates.financialScore !== undefined) {
        evaluationUpdates.evaluation = {
          ...current.evaluation,
          ...(updates.overallScore !== undefined && { overallScore: updates.overallScore }),
          ...(updates.technicalScore !== undefined && { technicalScore: updates.technicalScore }),
          ...(updates.financialScore !== undefined && { financialScore: updates.financialScore }),
          evaluationDate: now,
          evaluationStatus: 'completed'
        };
      }

      // Prepare the updated submission
      const updatedSubmission = {
        ...current,
        ...updates,
        ...evaluationUpdates,
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
              details: updates.updateReason || 'Submission updated',
              changes: Object.keys(updates).filter(key => 
                !['updatedBy', 'updateReason'].includes(key)
              )
            }
          ]
        }
      };

      // Handle status change workflow
      if (statusChanged) {
        updatedSubmission.workflow.stages.push({
          stage: updates.status,
          completedAt: now,
          completedBy: updates.updatedBy || 'system',
          notes: updates.statusNotes || `Status changed to ${updates.status}`
        });
        updatedSubmission.workflow.currentStage = updates.status;
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedSubmission);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating submission', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete submission (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating status
      const updatedSubmission = await this.update(id, {
        status: 'withdrawn',
        deletedAt: new Date(),
        deletedBy,
        updatedBy: deletedBy,
        updateReason: 'Submission withdrawn/deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedSubmission;
    } catch (error) {
      logger.error('Error deleting submission', { error: error.message });
      throw error;
    }
  }

  /**
   * Get submissions by RFQ with partition-optimized query
   */
  async getByRFQ(rfqId, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'submission' 
          AND c.rfqId = @rfqId
          AND c.status != 'withdrawn'
          ORDER BY c.submissionDate DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters: [
          { name: '@rfqId', value: rfqId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByRFQ', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting submissions by RFQ', { error: error.message });
      throw error;
    }
  }

  /**
   * Get submissions by vendor with efficient querying
   */
  async getByVendor(vendorId, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'submission' 
          AND c.vendorId = @vendorId
          AND c.status != 'withdrawn'
          ORDER BY c.submissionDate DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters: [
          { name: '@vendorId', value: vendorId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByVendor', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting submissions by vendor', { error: error.message });
      throw error;
    }
  }

  /**
   * Get submission analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'submission' AND c.status != 'withdrawn'";
      const parameters = [];

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.rfqId) {
        whereClause += ` AND c.rfqId = @rfqId`;
        parameters.push({ name: '@rfqId', value: filters.rfqId });
      }

      const querySpec = {
        query: `
          SELECT 
            c.status,
            c.quotedPrice,
            c.evaluation.overallScore,
            c.metadata.department,
            c.metadata.category,
            c.metadata.isLateSubmission
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
        totalSubmissions: resources.length,
        statusBreakdown: {},
        departmentBreakdown: {},
        categoryBreakdown: {},
        averageQuotedPrice: 0,
        averageScore: 0,
        lateSubmissions: 0
      };

      let totalPrice = 0;
      let totalScore = 0;
      let scoredCount = 0;

      resources.forEach(submission => {
        // Status breakdown
        analytics.statusBreakdown[submission.status] = 
          (analytics.statusBreakdown[submission.status] || 0) + 1;

        // Department breakdown
        const dept = submission.metadata?.department || 'unknown';
        analytics.departmentBreakdown[dept] = 
          (analytics.departmentBreakdown[dept] || 0) + 1;

        // Category breakdown
        const category = submission.metadata?.category || 'uncategorized';
        analytics.categoryBreakdown[category] = 
          (analytics.categoryBreakdown[category] || 0) + 1;

        // Financial calculations
        totalPrice += submission.quotedPrice || 0;

        // Scoring calculations
        if (submission.evaluation?.overallScore !== null) {
          totalScore += submission.evaluation.overallScore;
          scoredCount++;
        }

        // Late submissions
        if (submission.metadata?.isLateSubmission) {
          analytics.lateSubmissions++;
        }
      });

      analytics.averageQuotedPrice = resources.length > 0 ? 
        Math.round((totalPrice / resources.length) * 100) / 100 : 0;

      analytics.averageScore = scoredCount > 0 ? 
        Math.round((totalScore / scoredCount) * 100) / 100 : 0;

      return analytics;
    } catch (error) {
      logger.error('Error getting submission analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for submission service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'submission'",
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
      logger.error('Submission health check failed', { error: error.message });
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
}

module.exports = new Submission();
