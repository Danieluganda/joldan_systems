/**
 * Award Model
 * 
 * Data access layer for award records optimized for Azure Cosmos DB
 * Feature 8: Award notification
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Award {
  constructor() {
    if (!Award.instance) {
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
      this.container = this.database.container('awards');
      
      Award.instance = this;
    }
    return Award.instance;
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
   * Create a new award with embedded RFQ and submission data
   */
  async create({
    rfqId,
    winningSubmissionId,
    awardDate,
    awardValue,
    contractStartDate,
    contractEndDate,
    status,
    remarks,
    rfqInfo = {},
    submissionInfo = {},
    vendorInfo = {},
    departmentInfo = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const award = {
        id,
        type: 'award',
        // Hierarchical partition key: rfqId|vendorId for better distribution
        partitionKey: `${rfqId}|${vendorInfo.id || 'unknown'}`,
        rfqId,
        winningSubmissionId,
        awardDate: awardDate ? new Date(awardDate) : now,
        awardValue: parseFloat(awardValue) || 0,
        contractStartDate: contractStartDate ? new Date(contractStartDate) : null,
        contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
        status: status || 'awarded',
        remarks: remarks || '',
        createdAt: now,
        updatedAt: now,
        
        // Embedded RFQ information for faster queries
        rfq: {
          id: rfqId,
          title: rfqInfo.title,
          description: rfqInfo.description,
          department: rfqInfo.department,
          category: rfqInfo.category,
          estimatedValue: rfqInfo.estimatedValue,
          publishDate: rfqInfo.publishDate,
          closingDate: rfqInfo.closingDate
        },
        
        // Embedded winning submission details
        winningSubmission: {
          id: winningSubmissionId,
          proposedPrice: submissionInfo.proposedPrice,
          deliveryTimeline: submissionInfo.deliveryTimeline,
          technicalScore: submissionInfo.technicalScore,
          commercialScore: submissionInfo.commercialScore,
          totalScore: submissionInfo.totalScore,
          submissionDate: submissionInfo.submissionDate
        },
        
        // Embedded vendor information
        vendor: {
          id: vendorInfo.id,
          name: vendorInfo.name,
          contactPerson: vendorInfo.contactPerson,
          email: vendorInfo.email,
          phone: vendorInfo.phone,
          address: vendorInfo.address,
          registrationNumber: vendorInfo.registrationNumber,
          rating: vendorInfo.rating
        },
        
        // Contract details
        contract: {
          value: parseFloat(awardValue) || 0,
          startDate: contractStartDate ? new Date(contractStartDate) : null,
          endDate: contractEndDate ? new Date(contractEndDate) : null,
          duration: this._calculateContractDuration(contractStartDate, contractEndDate),
          status: 'pending',
          milestones: [],
          deliverables: submissionInfo.deliverables || []
        },
        
        // Notification and workflow tracking
        notifications: {
          sent: [],
          pending: [],
          failed: []
        },
        
        // Award workflow history
        workflow: {
          currentStage: 'awarded',
          stages: [{
            stage: 'awarded',
            completedAt: now,
            completedBy: departmentInfo.awardedBy || 'system',
            notes: remarks || 'Award created'
          }],
          approvals: [],
          rejections: []
        },
        
        // Metadata for analytics and reporting
        metadata: {
          department: departmentInfo.name || rfqInfo.department,
          category: rfqInfo.category,
          fiscalYear: new Date(awardDate || now).getFullYear(),
          quarter: Math.floor((new Date(awardDate || now).getMonth() + 3) / 3),
          tags: [status, rfqInfo.category].filter(Boolean),
          lastActivity: now,
          complianceFlags: [],
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: departmentInfo.awardedBy || 'system',
            details: 'Award record created'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(award);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating award', { error: error.message });
      throw error;
    }
  }

  /**
   * Get award by ID with partition key optimization
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
            WHERE c.id = @id AND c.type = 'award'
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
      logger.error('Error finding award by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all awards with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'award'";
      const parameters = [];

      // Build dynamic query with proper indexing
      if (filters.status) {
        whereClause += ` AND c.status = @status`;
        parameters.push({ name: '@status', value: filters.status });
      }

      if (filters.rfqId) {
        whereClause += ` AND c.rfqId = @rfqId`;
        parameters.push({ name: '@rfqId', value: filters.rfqId });
      }

      if (filters.vendorId) {
        whereClause += ` AND c.vendor.id = @vendorId`;
        parameters.push({ name: '@vendorId', value: filters.vendorId });
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

      if (filters.minValue) {
        whereClause += ` AND c.awardValue >= @minValue`;
        parameters.push({ name: '@minValue', value: parseFloat(filters.minValue) });
      }

      if (filters.maxValue) {
        whereClause += ` AND c.awardValue <= @maxValue`;
        parameters.push({ name: '@maxValue', value: parseFloat(filters.maxValue) });
      }

      if (filters.dateFrom) {
        whereClause += ` AND c.awardDate >= @dateFrom`;
        parameters.push({ name: '@dateFrom', value: filters.dateFrom });
      }

      if (filters.dateTo) {
        whereClause += ` AND c.awardDate <= @dateTo`;
        parameters.push({ name: '@dateTo', value: filters.dateTo });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.awardDate DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, {
          // Use partition key when filtering by RFQ
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
      logger.error('Error getting all awards', { error: error.message });
      throw error;
    }
  }

  /**
   * Update award with workflow tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current award first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Award not found');
      }

      const now = new Date();
      
      // Handle status changes with workflow tracking
      const statusChanged = updates.status && updates.status !== current.status;
      
      // Prepare the updated award
      const updatedAward = {
        ...current,
        ...updates,
        updatedAt: now,
        metadata: {
          ...current.metadata,
          lastActivity: now,
          auditTrail: [
            ...current.metadata.auditTrail,
            {
              action: 'updated',
              timestamp: now,
              user: updates.updatedBy || 'system',
              details: updates.updateReason || 'Award updated',
              changes: Object.keys(updates).filter(key => 
                !['updatedBy', 'updateReason'].includes(key)
              )
            }
          ]
        }
      };

      // Handle status change workflow
      if (statusChanged) {
        updatedAward.workflow.stages.push({
          stage: updates.status,
          completedAt: now,
          completedBy: updates.updatedBy || 'system',
          notes: updates.updateReason || `Status changed to ${updates.status}`
        });
        updatedAward.workflow.currentStage = updates.status;
      }

      // Handle contract updates
      if (updates.contractStartDate || updates.contractEndDate || updates.awardValue) {
        updatedAward.contract = {
          ...current.contract,
          ...(updates.awardValue && { value: parseFloat(updates.awardValue) }),
          ...(updates.contractStartDate && { startDate: new Date(updates.contractStartDate) }),
          ...(updates.contractEndDate && { endDate: new Date(updates.contractEndDate) }),
          ...(updates.contractStartDate && updates.contractEndDate && {
            duration: this._calculateContractDuration(updates.contractStartDate, updates.contractEndDate)
          })
        };
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedAward);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating award', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete award (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating status
      const updatedAward = await this.update(id, {
        status: 'cancelled',
        deletedAt: new Date(),
        deletedBy,
        updateReason: 'Award cancelled/deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedAward;
    } catch (error) {
      logger.error('Error deleting award', { error: error.message });
      throw error;
    }
  }

  /**
   * Get award by RFQ with partition-optimized query
   */
  async getByRFQ(rfqId) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'award' 
          AND c.rfqId = @rfqId
          AND c.status != 'cancelled'
          ORDER BY c.awardDate DESC
        `,
        parameters: [
          { name: '@rfqId', value: rfqId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByRFQ', diagnostics, Date.now() - startTime);
      
      return resources[0]; // Return the most recent award for the RFQ
    } catch (error) {
      logger.error('Error getting award by RFQ', { error: error.message });
      throw error;
    }
  }

  /**
   * Get award by submission
   */
  async getBySubmission(submissionId) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'award' 
          AND c.winningSubmissionId = @submissionId
          AND c.status != 'cancelled'
        `,
        parameters: [
          { name: '@submissionId', value: submissionId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getBySubmission', diagnostics, Date.now() - startTime);
      
      return resources[0];
    } catch (error) {
      logger.error('Error getting award by submission', { error: error.message });
      throw error;
    }
  }

  /**
   * Get awards analytics for dashboard
   */
  async getAwardsAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'award' AND c.status != 'cancelled'";
      const parameters = [];

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.fiscalYear) {
        whereClause += ` AND c.metadata.fiscalYear = @fiscalYear`;
        parameters.push({ name: '@fiscalYear', value: parseInt(filters.fiscalYear) });
      }

      if (filters.dateFrom) {
        whereClause += ` AND c.awardDate >= @dateFrom`;
        parameters.push({ name: '@dateFrom', value: filters.dateFrom });
      }

      if (filters.dateTo) {
        whereClause += ` AND c.awardDate <= @dateTo`;
        parameters.push({ name: '@dateTo', value: filters.dateTo });
      }

      const querySpec = {
        query: `
          SELECT 
            c.awardValue,
            c.status,
            c.metadata.department,
            c.metadata.category,
            c.metadata.fiscalYear,
            c.metadata.quarter,
            c.awardDate,
            c.contract.duration
          FROM c 
          WHERE ${whereClause}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getAwardsAnalytics', diagnostics, Date.now() - startTime);

      // Process analytics data
      const analytics = {
        totalAwards: resources.length,
        totalValue: 0,
        averageValue: 0,
        statusBreakdown: {},
        departmentBreakdown: {},
        categoryBreakdown: {},
        quarterlyTrends: {},
        averageContractDuration: 0
      };

      let totalDuration = 0;
      let durationCount = 0;

      resources.forEach(award => {
        // Total value calculation
        analytics.totalValue += award.awardValue || 0;

        // Status breakdown
        analytics.statusBreakdown[award.status] = 
          (analytics.statusBreakdown[award.status] || 0) + 1;

        // Department breakdown
        const dept = award.metadata?.department || 'unknown';
        analytics.departmentBreakdown[dept] = {
          count: (analytics.departmentBreakdown[dept]?.count || 0) + 1,
          totalValue: (analytics.departmentBreakdown[dept]?.totalValue || 0) + (award.awardValue || 0)
        };

        // Category breakdown
        const category = award.metadata?.category || 'uncategorized';
        analytics.categoryBreakdown[category] = 
          (analytics.categoryBreakdown[category] || 0) + 1;

        // Quarterly trends
        const quarterKey = `${award.metadata?.fiscalYear}-Q${award.metadata?.quarter}`;
        analytics.quarterlyTrends[quarterKey] = {
          count: (analytics.quarterlyTrends[quarterKey]?.count || 0) + 1,
          totalValue: (analytics.quarterlyTrends[quarterKey]?.totalValue || 0) + (award.awardValue || 0)
        };

        // Contract duration
        if (award.contract?.duration) {
          totalDuration += award.contract.duration;
          durationCount++;
        }
      });

      analytics.averageValue = analytics.totalAwards > 0 ? 
        analytics.totalValue / analytics.totalAwards : 0;

      analytics.averageContractDuration = durationCount > 0 ? 
        Math.round(totalDuration / durationCount) : 0;

      return analytics;
    } catch (error) {
      logger.error('Error getting awards analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Add notification tracking
   */
  async addNotification(awardId, notificationData, partitionKey) {
    try {
      const startTime = Date.now();
      const notificationId = uuidv4();
      
      const notification = {
        id: notificationId,
        ...notificationData,
        createdAt: new Date()
      };

      const operations = [
        { 
          op: 'add', 
          path: `/notifications/${notificationData.status || 'sent'}/-`, 
          value: notification 
        },
        { op: 'replace', path: '/metadata/lastActivity', value: new Date() }
      ];

      const { resource, diagnostics } = await this.container
        .item(awardId, partitionKey)
        .patch(operations);

      this._logDiagnostics('addNotification', diagnostics, Date.now() - startTime);
      
      return notification;
    } catch (error) {
      logger.error('Error adding notification', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for award service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'award'",
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
      logger.error('Award health check failed', { error: error.message });
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
  _calculateContractDuration(startDate, endDate) {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Duration in days
  }
}

module.exports = new Award();
