/**
 * Procurement Model
 * Data access layer for procurement records
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Procurement {
  constructor() {
    if (!Procurement.instance) {
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
      this.container = this.database.container('procurements');
      this.templatesContainer = this.database.container('procurement-templates');
      
      Procurement.instance = this;
    }
    return Procurement.instance;
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

  // Enhanced create with hierarchical partition key
  async create(data) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const procurement = {
        id,
        type: 'procurement',
        partitionKey: `${data.department}|${data.createdBy}`, // Hierarchical partition key
        ...data,
        createdAt: now,
        updatedAt: now,
        version: 1,
        // Embedded collections for frequently accessed data
        comments: [],
        budgetEntries: [],
        notifications: {
          subscriptions: [],
          history: []
        },
        approvals: {
          workflow: null,
          history: []
        },
        vendors: [],
        attachments: [],
        metadata: {
          totalComments: 0,
          totalBudgetEntries: 0,
          lastActivity: now,
          tags: data.tags || []
        }
      };

      const { resource, diagnostics } = await this.container.items.create(procurement);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating procurement', { error: error.message });
      throw error;
    }
  }

  // Comments with pagination and embedded pattern
  async addComment(procurementId, commentData) {
    try {
      const startTime = Date.now();
      const commentId = uuidv4();
      const comment = {
        id: commentId,
        ...commentData,
        createdAt: new Date()
      };

      // Use patch operation to add comment efficiently
      const operations = [
        { op: 'add', path: '/comments/-', value: comment },
        { op: 'incr', path: '/metadata/totalComments', value: 1 },
        { op: 'replace', path: '/metadata/lastActivity', value: new Date() }
      ];

      const { resource, diagnostics } = await this.container
        .item(procurementId, `${commentData.department}|${commentData.authorId}`)
        .patch(operations);

      this._logDiagnostics('addComment', diagnostics, Date.now() - startTime);
      
      return comment;
    } catch (error) {
      logger.error('Error adding comment', { error: error.message });
      throw error;
    }
  }

  async getComments(procurementId, page = 1, limit = 20) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;

      // Query with projection to minimize RU consumption
      const querySpec = {
        query: `
          SELECT c.id, c.comments, c.metadata.totalComments
          FROM c 
          WHERE c.id = @procurementId AND c.type = 'procurement'
        `,
        parameters: [
          { name: '@procurementId', value: procurementId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getComments', diagnostics, Date.now() - startTime);

      if (!resources.length) {
        return { items: [], total: 0 };
      }

      const procurement = resources[0];
      const comments = procurement.comments
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + limit);

      return {
        items: comments,
        total: procurement.metadata.totalComments
      };
    } catch (error) {
      logger.error('Error getting comments', { error: error.message });
      throw error;
    }
  }

  // Notification management
  async subscribeToNotifications(procurementId, subscriptionData) {
    try {
      const startTime = Date.now();
      const subscriptionId = uuidv4();
      const subscription = {
        id: subscriptionId,
        ...subscriptionData
      };

      const operations = [
        { op: 'add', path: '/notifications/subscriptions/-', value: subscription }
      ];

      const { resource, diagnostics } = await this.container
        .item(procurementId, subscriptionData.partitionKey)
        .patch(operations);

      this._logDiagnostics('subscribeToNotifications', diagnostics, Date.now() - startTime);
      
      return subscription;
    } catch (error) {
      logger.error('Error subscribing to notifications', { error: error.message });
      throw error;
    }
  }

  async getNotifications(procurementId, userId) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT c.notifications
          FROM c 
          WHERE c.id = @procurementId 
          AND c.type = 'procurement'
          AND ARRAY_CONTAINS(c.notifications.subscriptions, {"userId": @userId}, true)
        `,
        parameters: [
          { name: '@procurementId', value: procurementId },
          { name: '@userId', value: userId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getNotifications', diagnostics, Date.now() - startTime);

      return resources.length ? resources[0].notifications : { subscriptions: [], history: [] };
    } catch (error) {
      logger.error('Error getting notifications', { error: error.message });
      throw error;
    }
  }

  // Approval workflows
  async createApprovalWorkflow(procurementId, workflowData) {
    try {
      const startTime = Date.now();
      const workflowId = uuidv4();
      
      const workflow = {
        id: workflowId,
        ...workflowData,
        approvals: workflowData.approvers.map(approver => ({
          id: uuidv4(),
          ...approver,
          status: 'pending',
          decidedAt: null,
          comments: null
        }))
      };

      const operations = [
        { op: 'replace', path: '/approvals/workflow', value: workflow },
        { op: 'replace', path: '/status', value: 'pending_approval' }
      ];

      const { resource, diagnostics } = await this.container
        .item(procurementId, workflowData.partitionKey)
        .patch(operations);

      this._logDiagnostics('createApprovalWorkflow', diagnostics, Date.now() - startTime);
      
      return workflow;
    } catch (error) {
      logger.error('Error creating approval workflow', { error: error.message });
      throw error;
    }
  }

  async processApproval(procurementId, approvalId, approvalData) {
    try {
      const startTime = Date.now();
      
      // First, get the current state
      const { resource: procurement } = await this.container
        .item(procurementId, approvalData.partitionKey)
        .read();

      if (!procurement.approvals.workflow) {
        throw new Error('No approval workflow found');
      }

      // Update the specific approval
      const approvalIndex = procurement.approvals.workflow.approvals
        .findIndex(a => a.id === approvalId);
      
      if (approvalIndex === -1) {
        throw new Error('Approval not found');
      }

      procurement.approvals.workflow.approvals[approvalIndex] = {
        ...procurement.approvals.workflow.approvals[approvalIndex],
        status: approvalData.decision,
        ...approvalData
      };

      // Check if workflow is complete
      const pendingApprovals = procurement.approvals.workflow.approvals
        .filter(a => a.status === 'pending');
      
      if (pendingApprovals.length === 0) {
        const rejectedApprovals = procurement.approvals.workflow.approvals
          .filter(a => a.status === 'reject');
        
        procurement.status = rejectedApprovals.length > 0 ? 'rejected' : 'approved';
        procurement.approvals.workflow.completedAt = new Date();
      }

      const { resource: updated, diagnostics } = await this.container
        .item(procurementId, approvalData.partitionKey)
        .replace(procurement);

      this._logDiagnostics('processApproval', diagnostics, Date.now() - startTime);
      
      return updated.approvals.workflow.approvals[approvalIndex];
    } catch (error) {
      logger.error('Error processing approval', { error: error.message });
      throw error;
    }
  }

  async getApprovalWorkflow(procurementId) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT c.approvals
          FROM c 
          WHERE c.id = @procurementId AND c.type = 'procurement'
        `,
        parameters: [
          { name: '@procurementId', value: procurementId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getApprovalWorkflow', diagnostics, Date.now() - startTime);

      return resources.length ? resources[0].approvals : { workflow: null, history: [] };
    } catch (error) {
      logger.error('Error getting approval workflow', { error: error.message });
      throw error;
    }
  }

  // Budget tracking
  async getBudgetTracking(procurementId) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT c.estimatedBudget, c.budgetEntries, c.metadata.totalBudgetEntries
          FROM c 
          WHERE c.id = @procurementId AND c.type = 'procurement'
        `,
        parameters: [
          { name: '@procurementId', value: procurementId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getBudgetTracking', diagnostics, Date.now() - startTime);

      if (!resources.length) {
        throw new Error('Procurement not found');
      }

      const procurement = resources[0];
      const totalSpent = procurement.budgetEntries
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);

      const totalCommitted = procurement.budgetEntries
        .filter(entry => entry.type === 'commitment')
        .reduce((sum, entry) => sum + entry.amount, 0);

      return {
        estimatedBudget: procurement.estimatedBudget,
        totalSpent,
        totalCommitted,
        remaining: procurement.estimatedBudget - totalSpent - totalCommitted,
        entries: procurement.budgetEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        summary: {
          spentPercentage: (totalSpent / procurement.estimatedBudget) * 100,
          committedPercentage: (totalCommitted / procurement.estimatedBudget) * 100
        }
      };
    } catch (error) {
      logger.error('Error getting budget tracking', { error: error.message });
      throw error;
    }
  }

  async addBudgetEntry(procurementId, entryData) {
    try {
      const startTime = Date.now();
      const entryId = uuidv4();
      const budgetEntry = {
        id: entryId,
        ...entryData
      };

      const operations = [
        { op: 'add', path: '/budgetEntries/-', value: budgetEntry },
        { op: 'incr', path: '/metadata/totalBudgetEntries', value: 1 },
        { op: 'replace', path: '/metadata/lastActivity', value: new Date() }
      ];

      const { resource, diagnostics } = await this.container
        .item(procurementId, entryData.partitionKey)
        .patch(operations);

      this._logDiagnostics('addBudgetEntry', diagnostics, Date.now() - startTime);
      
      return budgetEntry;
    } catch (error) {
      logger.error('Error adding budget entry', { error: error.message });
      throw error;
    }
  }

  // Vendor management
  async associateVendor(procurementId, vendorData) {
    try {
      const startTime = Date.now();
      const associationId = uuidv4();
      
      const vendorAssociation = {
        id: associationId,
        ...vendorData
      };

      const operations = [
        { op: 'add', path: '/vendors/-', value: vendorAssociation },
        { op: 'replace', path: '/metadata/lastActivity', value: new Date() }
      ];

      const { resource, diagnostics } = await this.container
        .item(procurementId, vendorData.partitionKey)
        .patch(operations);

      this._logDiagnostics('associateVendor', diagnostics, Date.now() - startTime);
      
      return vendorAssociation;
    } catch (error) {
      logger.error('Error associating vendor', { error: error.message });
      throw error;
    }
  }

  async getAssociatedVendors(procurementId) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT c.vendors
          FROM c 
          WHERE c.id = @procurementId AND c.type = 'procurement'
        `,
        parameters: [
          { name: '@procurementId', value: procurementId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getAssociatedVendors', diagnostics, Date.now() - startTime);

      return resources.length ? resources[0].vendors : [];
    } catch (error) {
      logger.error('Error getting associated vendors', { error: error.message });
      throw error;
    }
  }

  // Template management
  async createTemplate(templateData) {
    try {
      const startTime = Date.now();
      const templateId = uuidv4();
      
      const template = {
        id: templateId,
        type: 'procurement-template',
        partitionKey: `${templateData.department}|templates`,
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
      };

      const { resource, diagnostics } = await this.templatesContainer.items.create(template);
      this._logDiagnostics('createTemplate', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating template', { error: error.message });
      throw error;
    }
  }

  async getTemplates(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'procurement-template'";
      const parameters = [];

      if (filters.category) {
        whereClause += " AND c.category = @category";
        parameters.push({ name: '@category', value: filters.category });
      }

      if (filters.department) {
        whereClause += " AND c.department = @department";
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.isActive !== undefined) {
        whereClause += " AND c.isActive = @isActive";
        parameters.push({ name: '@isActive', value: filters.isActive });
      }

      const querySpec = {
        query: `
          SELECT c.id, c.name, c.category, c.description, c.department, 
                 c.createdAt, c.usageCount, c.template
          FROM c 
          WHERE ${whereClause}
          ORDER BY c.usageCount DESC, c.createdAt DESC
        `,
        parameters
      };

      const { resources, diagnostics } = await this.templatesContainer.items
        .query(querySpec, { 
          partitionKey: filters.department ? `${filters.department}|templates` : undefined 
        })
        .fetchAll();

      this._logDiagnostics('getTemplates', diagnostics, Date.now() - startTime);

      return resources;
    } catch (error) {
      logger.error('Error getting templates', { error: error.message });
      throw error;
    }
  }

  async createFromTemplate(templateId, options) {
    try {
      const startTime = Date.now();
      
      // Get template
      const { resource: template } = await this.templatesContainer
        .item(templateId, `${options.department}|templates`)
        .read();

      if (!template) {
        throw new Error('Template not found');
      }

      // Create procurement from template with overrides
      const procurementData = {
        ...template.template,
        ...options.overrides,
        createdBy: options.createdBy,
        department: options.department,
        createdFromTemplate: templateId
      };

      const procurement = await this.create(procurementData);

      // Update template usage count
      await this.templatesContainer
        .item(templateId, `${options.department}|templates`)
        .patch([{ op: 'incr', path: '/usageCount', value: 1 }]);

      this._logDiagnostics('createFromTemplate', {}, Date.now() - startTime);
      
      return procurement;
    } catch (error) {
      logger.error('Error creating from template', { error: error.message });
      throw error;
    }
  }

  // Integration methods
  async syncWithExternalSystem(procurementId, system, action, config) {
    try {
      const startTime = Date.now();
      const syncId = uuidv4();
      
      const syncRecord = {
        id: syncId,
        system,
        action,
        config,
        status: 'initiated',
        createdAt: new Date()
      };

      // Add sync record to procurement
      const operations = [
        { op: 'add', path: '/integrations/-', value: syncRecord },
        { op: 'replace', path: '/metadata/lastActivity', value: new Date() }
      ];

      const { resource, diagnostics } = await this.container
        .item(procurementId, config.partitionKey)
        .patch(operations);

      this._logDiagnostics('syncWithExternalSystem', diagnostics, Date.now() - startTime);

      // Here you would implement actual integration logic
      // For now, return the sync record
      return { ...syncRecord, status: 'completed' };
    } catch (error) {
      logger.error('Error syncing with external system', { error: error.message });
      throw error;
    }
  }

  async getIntegrationStatus(department) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT c.id, c.integrations
          FROM c 
          WHERE c.type = 'procurement' 
          AND c.department = @department
          AND IS_DEFINED(c.integrations) AND ARRAY_LENGTH(c.integrations) > 0
        `,
        parameters: [
          { name: '@department', value: department }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, { partitionKey: `${department}|*` })
        .fetchAll();

      this._logDiagnostics('getIntegrationStatus', diagnostics, Date.now() - startTime);

      const integrationSummary = {
        totalIntegrations: 0,
        bySystem: {},
        recentActivity: []
      };

      resources.forEach(proc => {
        if (proc.integrations) {
          integrationSummary.totalIntegrations += proc.integrations.length;
          
          proc.integrations.forEach(integration => {
            integrationSummary.bySystem[integration.system] = 
              (integrationSummary.bySystem[integration.system] || 0) + 1;
            
            integrationSummary.recentActivity.push({
              procurementId: proc.id,
              ...integration
            });
          });
        }
      });

      // Sort recent activity by date
      integrationSummary.recentActivity.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ).slice(0, 10);

      return integrationSummary;
    } catch (error) {
      logger.error('Error getting integration status', { error: error.message });
      throw error;
    }
  }

  // Analytics
  async getDetailedAnalytics(options) {
    try {
      const startTime = Date.now();
      const { timeRange, groupBy, department, userId } = options;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const querySpec = {
        query: `
          SELECT c.id, c.status, c.estimatedBudget, c.department, 
                 c.createdAt, c.budgetEntries, c.metadata
          FROM c 
          WHERE c.type = 'procurement' 
          AND c.department = @department
          AND c.createdAt >= @startDate 
          AND c.createdAt <= @endDate
        `,
        parameters: [
          { name: '@department', value: department },
          { name: '@startDate', value: startDate.toISOString() },
          { name: '@endDate', value: endDate.toISOString() }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, { partitionKey: `${department}|${userId}` })
        .fetchAll();

      this._logDiagnostics('getDetailedAnalytics', diagnostics, Date.now() - startTime);

      // Process analytics data
      const analytics = {
        totalProcurements: resources.length,
        totalBudget: resources.reduce((sum, p) => sum + (p.estimatedBudget || 0), 0),
        statusBreakdown: {},
        budgetUtilization: 0,
        trends: {},
        topCategories: {}
      };

      // Group by logic
      resources.forEach(procurement => {
        // Status breakdown
        analytics.statusBreakdown[procurement.status] = 
          (analytics.statusBreakdown[procurement.status] || 0) + 1;

        // Calculate budget utilization
        if (procurement.budgetEntries && procurement.estimatedBudget) {
          const spent = procurement.budgetEntries
            .filter(entry => entry.type === 'expense')
            .reduce((sum, entry) => sum + entry.amount, 0);
          analytics.budgetUtilization += spent;
        }
      });

      analytics.budgetUtilizationPercentage = 
        (analytics.budgetUtilization / analytics.totalBudget) * 100;

      return analytics;
    } catch (error) {
      logger.error('Error getting detailed analytics', { error: error.message });
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Test database connectivity
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'procurement'",
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
      logger.error('Health check failed', { error: error.message });
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

  // Additional utility methods for existing routes
  async searchWithPagination(filters, sort, page, limit) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;

      let whereClause = "c.type = 'procurement'";
      const parameters = [];

      // Build dynamic query based on filters
      Object.keys(filters).forEach((key, index) => {
        if (key !== '$or') {
          whereClause += ` AND c.${key} = @param${index}`;
          parameters.push({ name: `@param${index}`, value: filters[key] });
        }
      });

      // Handle text search
      if (filters.$or) {
        whereClause += ` AND (CONTAINS(c.title, @keyword) OR CONTAINS(c.description, @keyword))`;
        parameters.push({ name: '@keyword', value: filters.$or[0].title.$regex || '' });
      }

      const sortField = Object.keys(sort)[0] || 'createdAt';
      const sortOrder = sort[sortField] === -1 ? 'DESC' : 'ASC';

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.${sortField} ${sortOrder}
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      // Get total count
      const countQuery = {
        query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
        parameters
      };

      const { resources: countResult } = await this.container.items
        .query(countQuery)
        .fetchAll();

      this._logDiagnostics('searchWithPagination', diagnostics, Date.now() - startTime);

      return {
        items: resources,
        total: countResult[0] || 0
      };
    } catch (error) {
      logger.error('Error in search with pagination', { error: error.message });
      throw error;
    }
  }

  async bulkUpdate(ids, updates) {
    try {
      const startTime = Date.now();
      const results = [];

      // Process in batches to avoid timeout
      const batchSize = 10;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const batchPromises = batch.map(async (id) => {
          try {
            const operations = Object.keys(updates).map(key => ({
              op: 'replace',
              path: `/${key}`,
              value: updates[key]
            }));

            const { resource } = await this.container
              .item(id, updates.partitionKey || undefined)
              .patch(operations);

            return { id, success: true, data: resource };
          } catch (error) {
            return { id, success: false, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      this._logDiagnostics('bulkUpdate', {}, Date.now() - startTime);

      return {
        totalProcessed: ids.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      logger.error('Error in bulk update', { error: error.message });
      throw error;
    }
  }

  async addAttachment(procurementId, attachmentData) {
    try {
      const startTime = Date.now();
      const attachmentId = uuidv4();
      
      const attachment = {
        id: attachmentId,
        ...attachmentData,
        uploadedAt: new Date()
      };

      const operations = [
        { op: 'add', path: '/attachments/-', value: attachment },
        { op: 'replace', path: '/metadata/lastActivity', value: new Date() }
      ];

      const { resource, diagnostics } = await this.container
        .item(procurementId, attachmentData.partitionKey)
        .patch(operations);

      this._logDiagnostics('addAttachment', diagnostics, Date.now() - startTime);
      
      return attachment;
    } catch (error) {
      logger.error('Error adding attachment', { error: error.message });
      throw error;
    }
  }

  async exportData(filters, format) {
    try {
      const startTime = Date.now();
      
      // Get data with filters
      const { items } = await this.searchWithPagination(filters, { createdAt: -1 }, 1, 1000);

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeader = 'ID,Title,Status,Department,Estimated Budget,Created At\n';
        const csvRows = items.map(item => 
          `${item.id},"${item.title}","${item.status}","${item.department}",${item.estimatedBudget},"${item.createdAt}"`
        ).join('\n');
        
        this._logDiagnostics('exportData', {}, Date.now() - startTime);
        return csvHeader + csvRows;
      } else {
        this._logDiagnostics('exportData', {}, Date.now() - startTime);
        return JSON.stringify(items, null, 2);
      }
    } catch (error) {
      logger.error('Error exporting data', { error: error.message });
      throw error;
    }
  }
}

module.exports = new Procurement();
