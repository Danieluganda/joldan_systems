/**
 * Contract Model
 * 
 * Data access layer for contract records optimized for Azure Cosmos DB
 * Feature 9: Contract management
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Contract {
  constructor() {
    if (!Contract.instance) {
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
      this.container = this.database.container('contracts');
      
      Contract.instance = this;
    }
    return Contract.instance;
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
   * Create a new contract with embedded award and vendor data
   */
  async create({
    awardId,
    contractNumber,
    vendorId,
    startDate,
    endDate,
    value,
    status = 'active',
    paymentTerms,
    deliveryTerms,
    documentUrl,
    awardInfo = {},
    vendorInfo = {},
    rfqInfo = {},
    departmentInfo = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const contract = {
        id,
        type: 'contract',
        // Hierarchical partition key: vendorId|awardId for better distribution
        partitionKey: `${vendorId}|${awardId}`,
        awardId,
        contractNumber,
        vendorId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        value: parseFloat(value) || 0,
        status,
        paymentTerms: paymentTerms || {},
        deliveryTerms: deliveryTerms || {},
        documentUrl,
        createdAt: now,
        updatedAt: now,
        
        // Embedded award information for faster queries
        award: {
          id: awardId,
          rfqId: awardInfo.rfqId,
          rfqTitle: awardInfo.rfqTitle,
          awardDate: awardInfo.awardDate,
          awardValue: awardInfo.awardValue,
          department: awardInfo.department
        },
        
        // Embedded vendor information
        vendor: {
          id: vendorId,
          name: vendorInfo.name,
          contactPerson: vendorInfo.contactPerson,
          email: vendorInfo.email,
          phone: vendorInfo.phone,
          address: vendorInfo.address,
          registrationNumber: vendorInfo.registrationNumber,
          rating: vendorInfo.rating
        },
        
        // Contract lifecycle tracking
        lifecycle: {
          currentStage: 'active',
          stages: [{
            stage: 'created',
            completedAt: now,
            completedBy: departmentInfo.createdBy || 'system',
            notes: 'Contract created'
          }],
          milestones: [],
          amendments: [],
          renewals: []
        },
        
        // Financial tracking
        financial: {
          totalValue: parseFloat(value) || 0,
          paidAmount: 0,
          pendingAmount: parseFloat(value) || 0,
          currency: 'USD', // Default currency
          invoices: [],
          payments: [],
          penalties: [],
          bonuses: []
        },
        
        // Performance and compliance tracking
        performance: {
          deliveryStatus: 'on_track',
          qualityScore: null,
          timelinessScore: null,
          complianceScore: null,
          kpis: [],
          issues: [],
          escalations: []
        },
        
        // Document management
        documents: {
          contract: documentUrl ? [{ url: documentUrl, type: 'contract', uploadedAt: now }] : [],
          amendments: [],
          invoices: [],
          deliverables: [],
          correspondence: []
        },
        
        // Terms and conditions embedded
        terms: {
          payment: paymentTerms || {},
          delivery: deliveryTerms || {},
          warranty: {},
          penalties: {},
          termination: {},
          disputeResolution: {}
        },
        
        // Metadata for analytics and reporting
        metadata: {
          department: departmentInfo.name || awardInfo.department,
          category: rfqInfo.category,
          contractType: this._determineContractType(rfqInfo.category),
          fiscalYear: new Date(startDate || now).getFullYear(),
          quarter: Math.floor((new Date(startDate || now).getMonth() + 3) / 3),
          duration: this._calculateDuration(startDate, endDate),
          tags: [status, rfqInfo.category].filter(Boolean),
          lastActivity: now,
          complianceFlags: [],
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: departmentInfo.createdBy || 'system',
            details: 'Contract record created'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(contract);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating contract', { error: error.message });
      throw error;
    }
  }

  /**
   * Get contract by ID with partition key optimization
   */
  async findById(id, vendorId = null, awardId = null) {
    try {
      const startTime = Date.now();
      
      if (vendorId && awardId) {
        // Direct partition read - most efficient
        const partitionKey = `${vendorId}|${awardId}`;
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
            WHERE c.id = @id AND c.type = 'contract'
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
      logger.error('Error finding contract by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all contracts with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'contract'";
      const parameters = [];

      // Build dynamic query with proper indexing
      if (filters.status) {
        whereClause += ` AND c.status = @status`;
        parameters.push({ name: '@status', value: filters.status });
      }

      if (filters.vendorId) {
        whereClause += ` AND c.vendorId = @vendorId`;
        parameters.push({ name: '@vendorId', value: filters.vendorId });
      }

      if (filters.awardId) {
        whereClause += ` AND c.awardId = @awardId`;
        parameters.push({ name: '@awardId', value: filters.awardId });
      }

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.contractType) {
        whereClause += ` AND c.metadata.contractType = @contractType`;
        parameters.push({ name: '@contractType', value: filters.contractType });
      }

      if (filters.fiscalYear) {
        whereClause += ` AND c.metadata.fiscalYear = @fiscalYear`;
        parameters.push({ name: '@fiscalYear', value: parseInt(filters.fiscalYear) });
      }

      if (filters.minValue) {
        whereClause += ` AND c.value >= @minValue`;
        parameters.push({ name: '@minValue', value: parseFloat(filters.minValue) });
      }

      if (filters.maxValue) {
        whereClause += ` AND c.value <= @maxValue`;
        parameters.push({ name: '@maxValue', value: parseFloat(filters.maxValue) });
      }

      if (filters.startDateFrom) {
        whereClause += ` AND c.startDate >= @startDateFrom`;
        parameters.push({ name: '@startDateFrom', value: filters.startDateFrom });
      }

      if (filters.startDateTo) {
        whereClause += ` AND c.startDate <= @startDateTo`;
        parameters.push({ name: '@startDateTo', value: filters.startDateTo });
      }

      if (filters.expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(filters.expiringWithinDays));
        whereClause += ` AND c.endDate <= @expiringDate AND c.endDate >= @today`;
        parameters.push(
          { name: '@expiringDate', value: futureDate.toISOString() },
          { name: '@today', value: new Date().toISOString() }
        );
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
          // Use partition key when filtering by vendor and award
          partitionKey: filters.vendorId && filters.awardId ? 
            `${filters.vendorId}|${filters.awardId}` : undefined
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
      logger.error('Error getting all contracts', { error: error.message });
      throw error;
    }
  }

  /**
   * Update contract with lifecycle and audit tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current contract first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Contract not found');
      }

      const now = new Date();
      
      // Handle status changes with lifecycle tracking
      const statusChanged = updates.status && updates.status !== current.status;
      
      // Prepare the updated contract
      const updatedContract = {
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
              details: updates.updateReason || 'Contract updated',
              changes: Object.keys(updates).filter(key => 
                !['updatedBy', 'updateReason'].includes(key)
              )
            }
          ]
        }
      };

      // Handle status change lifecycle
      if (statusChanged) {
        updatedContract.lifecycle.stages.push({
          stage: updates.status,
          completedAt: now,
          completedBy: updates.updatedBy || 'system',
          notes: updates.updateReason || `Status changed to ${updates.status}`
        });
        updatedContract.lifecycle.currentStage = updates.status;
      }

      // Handle financial updates
      if (updates.paidAmount !== undefined) {
        updatedContract.financial = {
          ...current.financial,
          paidAmount: parseFloat(updates.paidAmount),
          pendingAmount: current.financial.totalValue - parseFloat(updates.paidAmount)
        };
      }

      // Handle performance updates
      if (updates.deliveryStatus || updates.qualityScore || updates.timelinessScore) {
        updatedContract.performance = {
          ...current.performance,
          ...(updates.deliveryStatus && { deliveryStatus: updates.deliveryStatus }),
          ...(updates.qualityScore !== undefined && { qualityScore: updates.qualityScore }),
          ...(updates.timelinessScore !== undefined && { timelinessScore: updates.timelinessScore })
        };
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedContract);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating contract', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete contract (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating status
      const updatedContract = await this.update(id, {
        status: 'terminated',
        deletedAt: new Date(),
        deletedBy,
        updateReason: 'Contract terminated/deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedContract;
    } catch (error) {
      logger.error('Error deleting contract', { error: error.message });
      throw error;
    }
  }

  /**
   * Get contract by award with partition-optimized query
   */
  async getByAward(awardId) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'contract' 
          AND c.awardId = @awardId
          AND c.status != 'terminated'
          ORDER BY c.createdAt DESC
        `,
        parameters: [
          { name: '@awardId', value: awardId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByAward', diagnostics, Date.now() - startTime);
      
      return resources[0]; // Return the most recent active contract for the award
    } catch (error) {
      logger.error('Error getting contract by award', { error: error.message });
      throw error;
    }
  }

  /**
   * Get contracts by vendor with efficient querying
   */
  async getByVendor(vendorId, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'contract' 
          AND c.vendorId = @vendorId
          AND c.status != 'terminated'
          ORDER BY c.createdAt DESC
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
      logger.error('Error getting contracts by vendor', { error: error.message });
      throw error;
    }
  }

  /**
   * Get expiring contracts
   */
  async getExpiringContracts(daysAhead = 30) {
    try {
      const startTime = Date.now();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'contract' 
          AND c.status = 'active'
          AND c.endDate <= @futureDate
          AND c.endDate >= @today
          ORDER BY c.endDate ASC
        `,
        parameters: [
          { name: '@futureDate', value: futureDate.toISOString() },
          { name: '@today', value: new Date().toISOString() }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getExpiringContracts', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting expiring contracts', { error: error.message });
      throw error;
    }
  }

  /**
   * Add payment record
   */
  async addPayment(contractId, paymentData, partitionKey) {
    try {
      const startTime = Date.now();
      const paymentId = uuidv4();
      
      const payment = {
        id: paymentId,
        ...paymentData,
        recordedAt: new Date()
      };

      const operations = [
        { op: 'add', path: '/financial/payments/-', value: payment },
        { op: 'incr', path: '/financial/paidAmount', value: parseFloat(paymentData.amount) },
        { op: 'incr', path: '/financial/pendingAmount', value: -parseFloat(paymentData.amount) },
        { op: 'replace', path: '/metadata/lastActivity', value: new Date() }
      ];

      const { resource, diagnostics } = await this.container
        .item(contractId, partitionKey)
        .patch(operations);

      this._logDiagnostics('addPayment', diagnostics, Date.now() - startTime);
      
      return payment;
    } catch (error) {
      logger.error('Error adding payment', { error: error.message });
      throw error;
    }
  }

  /**
   * Add milestone
   */
  async addMilestone(contractId, milestoneData, partitionKey) {
    try {
      const startTime = Date.now();
      const milestoneId = uuidv4();
      
      const milestone = {
        id: milestoneId,
        ...milestoneData,
        createdAt: new Date()
      };

      const operations = [
        { op: 'add', path: '/lifecycle/milestones/-', value: milestone },
        { op: 'replace', path: '/metadata/lastActivity', value: new Date() }
      ];

      const { resource, diagnostics } = await this.container
        .item(contractId, partitionKey)
        .patch(operations);

      this._logDiagnostics('addMilestone', diagnostics, Date.now() - startTime);
      
      return milestone;
    } catch (error) {
      logger.error('Error adding milestone', { error: error.message });
      throw error;
    }
  }

  /**
   * Get contract analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'contract' AND c.status != 'terminated'";
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
            c.value,
            c.status,
            c.metadata.department,
            c.metadata.contractType,
            c.metadata.duration,
            c.financial.paidAmount,
            c.performance.deliveryStatus,
            c.endDate
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
        totalContracts: resources.length,
        totalValue: 0,
        totalPaid: 0,
        statusBreakdown: {},
        departmentBreakdown: {},
        contractTypeBreakdown: {},
        deliveryStatusBreakdown: {},
        averageDuration: 0,
        expiringCount: 0
      };

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      let totalDuration = 0;
      let durationCount = 0;

      resources.forEach(contract => {
        // Financial calculations
        analytics.totalValue += contract.value || 0;
        analytics.totalPaid += contract.financial?.paidAmount || 0;

        // Status breakdown
        analytics.statusBreakdown[contract.status] = 
          (analytics.statusBreakdown[contract.status] || 0) + 1;

        // Department breakdown
        const dept = contract.metadata?.department || 'unknown';
        analytics.departmentBreakdown[dept] = {
          count: (analytics.departmentBreakdown[dept]?.count || 0) + 1,
          totalValue: (analytics.departmentBreakdown[dept]?.totalValue || 0) + (contract.value || 0)
        };

        // Contract type breakdown
        const type = contract.metadata?.contractType || 'other';
        analytics.contractTypeBreakdown[type] = 
          (analytics.contractTypeBreakdown[type] || 0) + 1;

        // Delivery status breakdown
        const deliveryStatus = contract.performance?.deliveryStatus || 'unknown';
        analytics.deliveryStatusBreakdown[deliveryStatus] = 
          (analytics.deliveryStatusBreakdown[deliveryStatus] || 0) + 1;

        // Duration calculation
        if (contract.metadata?.duration) {
          totalDuration += contract.metadata.duration;
          durationCount++;
        }

        // Expiring contracts count
        if (contract.endDate && new Date(contract.endDate) <= thirtyDaysFromNow) {
          analytics.expiringCount++;
        }
      });

      analytics.averageDuration = durationCount > 0 ? 
        Math.round(totalDuration / durationCount) : 0;

      return analytics;
    } catch (error) {
      logger.error('Error getting contract analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for contract service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'contract'",
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
      logger.error('Contract health check failed', { error: error.message });
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
  _calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Duration in days
  }

  _determineContractType(category) {
    if (!category) return 'other';
    
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('service')) return 'service';
    if (lowerCategory.includes('supply') || lowerCategory.includes('good')) return 'supply';
    if (lowerCategory.includes('construction') || lowerCategory.includes('building')) return 'construction';
    if (lowerCategory.includes('consulting')) return 'consulting';
    if (lowerCategory.includes('maintenance')) return 'maintenance';
    
    return 'other';
  }
}

module.exports = new Contract();
