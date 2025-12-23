/**
 * Plan Model
 * 
 * Data access layer for procurement plans optimized for Azure Cosmos DB
 * Feature 2: Procurement plan management
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Plan {
  constructor() {
    if (!Plan.instance) {
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
      this.container = this.database.container('plans');
      
      Plan.instance = this;
    }
    return Plan.instance;
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
   * Create a new procurement plan with embedded data and hierarchical partition key
   */
  async create({
    procurementId,
    planName,
    itemDescription,
    estimatedValue,
    quantity,
    deliveryDate,
    specifications,
    procurementInfo = {},
    departmentInfo = {},
    createdBy = 'system'
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const plan = {
        id,
        type: 'plan',
        // Hierarchical partition key: procurementId|department for targeted queries
        partitionKey: `${procurementId}|${departmentInfo.name || 'general'}`,
        procurementId,
        planName,
        itemDescription,
        estimatedValue: parseFloat(estimatedValue) || 0,
        quantity: parseInt(quantity) || 1,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        specifications: specifications || '',
        createdAt: now,
        updatedAt: now,
        createdBy,
        
        // Embedded procurement information for faster queries
        procurement: {
          id: procurementId,
          title: procurementInfo.title,
          status: procurementInfo.status,
          category: procurementInfo.category,
          priority: procurementInfo.priority,
          department: procurementInfo.department
        },
        
        // Plan lifecycle management
        lifecycle: {
          currentStage: 'draft',
          stages: [{
            stage: 'draft',
            completedAt: now,
            completedBy: createdBy,
            notes: 'Plan created'
          }],
          approvals: [],
          rejections: []
        },
        
        // Budget and financial tracking
        financial: {
          estimatedValue: parseFloat(estimatedValue) || 0,
          currency: 'USD', // Default currency
          budgetCode: procurementInfo.budgetCode,
          costCenter: procurementInfo.costCenter,
          approvedBudget: null,
          actualCost: null,
          variance: null
        },
        
        // Delivery and timeline management
        delivery: {
          requestedDate: deliveryDate ? new Date(deliveryDate) : null,
          confirmedDate: null,
          actualDate: null,
          location: procurementInfo.deliveryLocation,
          instructions: procurementInfo.deliveryInstructions,
          status: 'pending'
        },
        
        // Technical specifications with categorization
        technical: {
          specifications: specifications || '',
          requirements: procurementInfo.requirements || [],
          qualityStandards: procurementInfo.qualityStandards || [],
          complianceRequirements: procurementInfo.complianceRequirements || [],
          attachments: []
        },
        
        // Vendor and sourcing information
        sourcing: {
          preferredVendors: procurementInfo.preferredVendors || [],
          sourcingStrategy: procurementInfo.sourcingStrategy || 'competitive',
          marketAnalysis: null,
          riskAssessment: null
        },
        
        // Metadata for analytics and reporting
        metadata: {
          department: departmentInfo.name || procurementInfo.department,
          category: procurementInfo.category,
          subcategory: procurementInfo.subcategory,
          priority: procurementInfo.priority || 'medium',
          fiscalYear: new Date().getFullYear(),
          quarter: Math.floor((new Date().getMonth() + 3) / 3),
          tags: this._generateTags(planName, itemDescription, procurementInfo),
          lastActivity: now,
          version: 1,
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: createdBy,
            details: 'Procurement plan created'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(plan);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating plan', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plan by ID with partition key optimization
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
            WHERE c.id = @id AND c.type = 'plan'
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
      logger.error('Error finding plan by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all plans with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'plan'";
      const parameters = [];

      // Build dynamic query with proper indexing
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

      if (filters.priority) {
        whereClause += ` AND c.metadata.priority = @priority`;
        parameters.push({ name: '@priority', value: filters.priority });
      }

      if (filters.stage) {
        whereClause += ` AND c.lifecycle.currentStage = @stage`;
        parameters.push({ name: '@stage', value: filters.stage });
      }

      if (filters.fiscalYear) {
        whereClause += ` AND c.metadata.fiscalYear = @fiscalYear`;
        parameters.push({ name: '@fiscalYear', value: parseInt(filters.fiscalYear) });
      }

      if (filters.minValue) {
        whereClause += ` AND c.estimatedValue >= @minValue`;
        parameters.push({ name: '@minValue', value: parseFloat(filters.minValue) });
      }

      if (filters.maxValue) {
        whereClause += ` AND c.estimatedValue <= @maxValue`;
        parameters.push({ name: '@maxValue', value: parseFloat(filters.maxValue) });
      }

      if (filters.deliveryDateFrom) {
        whereClause += ` AND c.deliveryDate >= @deliveryDateFrom`;
        parameters.push({ name: '@deliveryDateFrom', value: filters.deliveryDateFrom });
      }

      if (filters.deliveryDateTo) {
        whereClause += ` AND c.deliveryDate <= @deliveryDateTo`;
        parameters.push({ name: '@deliveryDateTo', value: filters.deliveryDateTo });
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
      logger.error('Error getting all plans', { error: error.message });
      throw error;
    }
  }

  /**
   * Update plan with lifecycle and audit tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current plan first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Plan not found');
      }

      const now = new Date();
      
      // Handle stage changes with lifecycle tracking
      const stageChanged = updates.stage && updates.stage !== current.lifecycle.currentStage;
      
      // Handle financial updates
      const financialUpdates = {};
      if (updates.estimatedValue !== undefined) {
        financialUpdates.financial = {
          ...current.financial,
          estimatedValue: parseFloat(updates.estimatedValue)
        };
      }

      // Handle delivery updates
      const deliveryUpdates = {};
      if (updates.deliveryDate || updates.deliveryLocation) {
        deliveryUpdates.delivery = {
          ...current.delivery,
          ...(updates.deliveryDate && { requestedDate: new Date(updates.deliveryDate) }),
          ...(updates.deliveryLocation && { location: updates.deliveryLocation })
        };
      }

      // Prepare the updated plan
      const updatedPlan = {
        ...current,
        ...updates,
        ...financialUpdates,
        ...deliveryUpdates,
        updatedAt: now,
        metadata: {
          ...current.metadata,
          lastActivity: now,
          version: current.metadata.version + 1,
          auditTrail: [
            ...current.metadata.auditTrail,
            {
              action: stageChanged ? 'stage_changed' : 'updated',
              timestamp: now,
              user: updates.updatedBy || 'system',
              details: updates.updateReason || 'Plan updated',
              changes: Object.keys(updates).filter(key => 
                !['updatedBy', 'updateReason'].includes(key)
              )
            }
          ]
        }
      };

      // Handle stage change lifecycle
      if (stageChanged) {
        updatedPlan.lifecycle.stages.push({
          stage: updates.stage,
          completedAt: now,
          completedBy: updates.updatedBy || 'system',
          notes: updates.stageNotes || `Stage changed to ${updates.stage}`
        });
        updatedPlan.lifecycle.currentStage = updates.stage;
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedPlan);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating plan', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete plan (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating stage
      const updatedPlan = await this.update(id, {
        stage: 'cancelled',
        deletedAt: new Date(),
        deletedBy,
        updatedBy: deletedBy,
        updateReason: 'Plan cancelled/deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedPlan;
    } catch (error) {
      logger.error('Error deleting plan', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plans by procurement with partition-optimized query
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
            WHERE c.type = 'plan' 
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
            WHERE c.type = 'plan' 
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
      logger.error('Error getting plans by procurement', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plan analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'plan' AND c.lifecycle.currentStage != 'cancelled'";
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
            c.estimatedValue,
            c.lifecycle.currentStage,
            c.metadata.department,
            c.metadata.category,
            c.metadata.priority,
            c.delivery.requestedDate
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
        totalPlans: resources.length,
        totalValue: 0,
        stageBreakdown: {},
        departmentBreakdown: {},
        categoryBreakdown: {},
        priorityBreakdown: {},
        upcomingDeliveries: 0
      };

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      resources.forEach(plan => {
        // Total value calculation
        analytics.totalValue += plan.estimatedValue || 0;

        // Stage breakdown
        analytics.stageBreakdown[plan.lifecycle?.currentStage || 'unknown'] = 
          (analytics.stageBreakdown[plan.lifecycle?.currentStage || 'unknown'] || 0) + 1;

        // Department breakdown
        const dept = plan.metadata?.department || 'unknown';
        analytics.departmentBreakdown[dept] = {
          count: (analytics.departmentBreakdown[dept]?.count || 0) + 1,
          totalValue: (analytics.departmentBreakdown[dept]?.totalValue || 0) + (plan.estimatedValue || 0)
        };

        // Category breakdown
        const category = plan.metadata?.category || 'uncategorized';
        analytics.categoryBreakdown[category] = 
          (analytics.categoryBreakdown[category] || 0) + 1;

        // Priority breakdown
        const priority = plan.metadata?.priority || 'medium';
        analytics.priorityBreakdown[priority] = 
          (analytics.priorityBreakdown[priority] || 0) + 1;

        // Upcoming deliveries
        if (plan.delivery?.requestedDate && 
            new Date(plan.delivery.requestedDate) <= thirtyDaysFromNow) {
          analytics.upcomingDeliveries++;
        }
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting plan analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for plan service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'plan'",
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
      logger.error('Plan health check failed', { error: error.message });
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
  _generateTags(planName, itemDescription, procurementInfo) {
    const tags = [];
    
    // Add category-based tags
    if (procurementInfo.category) {
      tags.push(procurementInfo.category.toLowerCase());
    }
    
    // Add priority tags
    if (procurementInfo.priority) {
      tags.push(procurementInfo.priority);
    }
    
    // Extract keywords from plan name and description
    const text = `${planName} ${itemDescription}`.toLowerCase();
    const keywords = text.split(/\s+/).filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'with'].includes(word)
    );
    
    tags.push(...keywords.slice(0, 5)); // Limit to 5 keywords
    
    return [...new Set(tags)]; // Remove duplicates
  }
}

module.exports = new Plan();
