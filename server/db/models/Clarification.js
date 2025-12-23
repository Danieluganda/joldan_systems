/**
 * Clarification Model
 * 
 * Data access layer for clarification request records optimized for Azure Cosmos DB
 * Feature 12: Clarification request handling
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Clarification {
  constructor() {
    if (!Clarification.instance) {
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
      this.container = this.database.container('clarifications');
      
      Clarification.instance = this;
    }
    return Clarification.instance;
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
   * Create a new clarification request with embedded RFQ and vendor data
   */
  async create({
    rfqId,
    vendorId,
    question,
    status = 'pending',
    postedDate,
    response,
    responseDate,
    rfqInfo = {},
    vendorInfo = {},
    userInfo = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const clarification = {
        id,
        type: 'clarification',
        // Hierarchical partition key: rfqId|vendorId for targeted queries
        partitionKey: `${rfqId}|${vendorId}`,
        rfqId,
        vendorId,
        question,
        status,
        postedDate: postedDate ? new Date(postedDate) : now,
        response: response || null,
        responseDate: responseDate ? new Date(responseDate) : null,
        createdAt: now,
        updatedAt: now,
        
        // Embedded RFQ information for faster queries
        rfq: {
          id: rfqId,
          title: rfqInfo.title,
          description: rfqInfo.description,
          department: rfqInfo.department,
          category: rfqInfo.category,
          closingDate: rfqInfo.closingDate,
          status: rfqInfo.status
        },
        
        // Embedded vendor information for faster access
        vendor: {
          id: vendorId,
          name: vendorInfo.name,
          contactPerson: vendorInfo.contactPerson,
          email: vendorInfo.email,
          phone: vendorInfo.phone,
          companySize: vendorInfo.companySize,
          registrationNumber: vendorInfo.registrationNumber
        },
        
        // Question details with context
        questionDetails: {
          originalText: question,
          category: this._categorizeQuestion(question),
          priority: this._calculatePriority(question, rfqInfo),
          wordCount: question ? question.split(' ').length : 0,
          attachments: [],
          references: this._extractReferences(question)
        },
        
        // Response tracking
        responseTracking: {
          status: status,
          isPublic: true, // Most clarifications are public
          respondedBy: null,
          responseTime: null,
          escalated: false,
          escalationDate: null,
          viewCount: 0,
          lastViewed: null
        },
        
        // Communication thread for follow-ups
        thread: [{
          id: uuidv4(),
          type: 'question',
          content: question,
          author: {
            id: vendorId,
            name: vendorInfo.name,
            role: 'vendor'
          },
          timestamp: now,
          isPublic: true
        }],
        
        // Metadata for analytics and compliance
        metadata: {
          department: rfqInfo.department,
          category: rfqInfo.category,
          tags: this._generateTags(question, rfqInfo),
          lastActivity: now,
          notificationsSent: [],
          complianceFlags: [],
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: vendorId,
            details: 'Clarification request created'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(clarification);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating clarification', { error: error.message });
      throw error;
    }
  }

  /**
   * Get clarification by ID with partition key optimization
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
        
        // Update view count
        if (resource) {
          await this._incrementViewCount(id, partitionKey);
        }
        
        return resource;
      } else {
        // Cross-partition query when partition key unknown
        const querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.id = @id AND c.type = 'clarification'
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
          await this._incrementViewCount(id, resources[0].partitionKey);
        }
        
        return resources[0];
      }
    } catch (error) {
      logger.error('Error finding clarification by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all clarifications with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'clarification'";
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
        whereClause += ` AND c.rfq.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.category) {
        whereClause += ` AND c.rfq.category = @category`;
        parameters.push({ name: '@category', value: filters.category });
      }

      if (filters.priority) {
        whereClause += ` AND c.questionDetails.priority = @priority`;
        parameters.push({ name: '@priority', value: filters.priority });
      }

      if (filters.dateFrom) {
        whereClause += ` AND c.postedDate >= @dateFrom`;
        parameters.push({ name: '@dateFrom', value: filters.dateFrom });
      }

      if (filters.dateTo) {
        whereClause += ` AND c.postedDate <= @dateTo`;
        parameters.push({ name: '@dateTo', value: filters.dateTo });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.postedDate DESC
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
      logger.error('Error getting all clarifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Update clarification with thread and audit tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current clarification first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Clarification not found');
      }

      const now = new Date();
      
      // Handle response updates specially
      const isResponseUpdate = updates.response && !current.response;
      
      // Prepare the updated clarification
      const updatedClarification = {
        ...current,
        ...updates,
        updatedAt: now,
        ...(isResponseUpdate && {
          responseDate: new Date(),
          status: 'answered'
        }),
        metadata: {
          ...current.metadata,
          lastActivity: now,
          auditTrail: [
            ...current.metadata.auditTrail,
            {
              action: isResponseUpdate ? 'answered' : 'updated',
              timestamp: now,
              user: updates.updatedBy || 'system',
              details: isResponseUpdate ? 'Response provided' : 'Clarification updated',
              changes: Object.keys(updates).filter(key => key !== 'updatedBy')
            }
          ]
        }
      };

      // Add response to thread if it's a new response
      if (isResponseUpdate) {
        updatedClarification.thread.push({
          id: uuidv4(),
          type: 'response',
          content: updates.response,
          author: {
            id: updates.respondedBy || 'admin',
            name: updates.responderName || 'Administrator',
            role: 'admin'
          },
          timestamp: now,
          isPublic: updates.isPublic !== false
        });

        updatedClarification.responseTracking = {
          ...current.responseTracking,
          status: 'answered',
          respondedBy: updates.respondedBy,
          responseTime: now.getTime() - new Date(current.postedDate).getTime()
        };
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedClarification);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating clarification', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete clarification (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating status
      const updatedClarification = await this.update(id, {
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy,
        updatedBy: deletedBy
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedClarification;
    } catch (error) {
      logger.error('Error deleting clarification', { error: error.message });
      throw error;
    }
  }

  /**
   * Get clarifications by RFQ with partition-optimized query
   */
  async getByRFQ(rfqId, includeDeleted = false) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'clarification' AND c.rfqId = @rfqId";
      const parameters = [
        { name: '@rfqId', value: rfqId }
      ];

      if (!includeDeleted) {
        whereClause += " AND c.status != 'deleted'";
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.postedDate DESC
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByRFQ', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting clarifications by RFQ', { error: error.message });
      throw error;
    }
  }

  /**
   * Get unanswered clarifications with priority sorting
   */
  async getUnanswered(rfqId = null) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'clarification' AND c.status = 'pending'";
      const parameters = [];

      if (rfqId) {
        whereClause += " AND c.rfqId = @rfqId";
        parameters.push({ name: '@rfqId', value: rfqId });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY 
            CASE c.questionDetails.priority
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
              ELSE 5
            END ASC,
            c.postedDate ASC
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getUnanswered', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting unanswered clarifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Get clarification analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'clarification'";
      const parameters = [];

      if (filters.department) {
        whereClause += " AND c.rfq.department = @department";
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.dateFrom) {
        whereClause += " AND c.postedDate >= @dateFrom";
        parameters.push({ name: '@dateFrom', value: filters.dateFrom });
      }

      if (filters.dateTo) {
        whereClause += " AND c.postedDate <= @dateTo";
        parameters.push({ name: '@dateTo', value: filters.dateTo });
      }

      const querySpec = {
        query: `
          SELECT 
            c.status,
            c.questionDetails.priority,
            c.questionDetails.category,
            c.rfq.department,
            c.responseTracking.responseTime,
            c.postedDate
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
        totalClarifications: resources.length,
        statusBreakdown: {},
        priorityBreakdown: {},
        categoryBreakdown: {},
        departmentBreakdown: {},
        averageResponseTime: 0,
        pendingCount: 0
      };

      let totalResponseTime = 0;
      let responseCount = 0;

      resources.forEach(clarification => {
        // Status breakdown
        analytics.statusBreakdown[clarification.status] = 
          (analytics.statusBreakdown[clarification.status] || 0) + 1;

        // Priority breakdown
        const priority = clarification.questionDetails?.priority || 'medium';
        analytics.priorityBreakdown[priority] = 
          (analytics.priorityBreakdown[priority] || 0) + 1;

        // Category breakdown
        const category = clarification.questionDetails?.category || 'general';
        analytics.categoryBreakdown[category] = 
          (analytics.categoryBreakdown[category] || 0) + 1;

        // Department breakdown
        const dept = clarification.rfq?.department || 'unknown';
        analytics.departmentBreakdown[dept] = 
          (analytics.departmentBreakdown[dept] || 0) + 1;

        // Response time calculation
        if (clarification.responseTracking?.responseTime) {
          totalResponseTime += clarification.responseTracking.responseTime;
          responseCount++;
        }

        // Pending count
        if (clarification.status === 'pending') {
          analytics.pendingCount++;
        }
      });

      analytics.averageResponseTime = responseCount > 0 ? 
        Math.round(totalResponseTime / responseCount / (1000 * 60 * 60)) : 0; // Convert to hours

      return analytics;
    } catch (error) {
      logger.error('Error getting clarification analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for clarification service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'clarification'",
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
      logger.error('Clarification health check failed', { error: error.message });
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
  async _incrementViewCount(id, partitionKey) {
    try {
      const operations = [
        { op: 'incr', path: '/responseTracking/viewCount', value: 1 },
        { op: 'replace', path: '/responseTracking/lastViewed', value: new Date() }
      ];

      await this.container
        .item(id, partitionKey)
        .patch(operations);
    } catch (error) {
      logger.warn('Error incrementing view count', { error: error.message });
    }
  }

  _categorizeQuestion(question) {
    if (!question) return 'general';
    
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('technical') || lowerQuestion.includes('specification')) {
      return 'technical';
    } else if (lowerQuestion.includes('commercial') || lowerQuestion.includes('price') || lowerQuestion.includes('payment')) {
      return 'commercial';
    } else if (lowerQuestion.includes('delivery') || lowerQuestion.includes('timeline')) {
      return 'delivery';
    } else if (lowerQuestion.includes('legal') || lowerQuestion.includes('contract')) {
      return 'legal';
    }
    
    return 'general';
  }

  _calculatePriority(question, rfqInfo) {
    if (!question) return 'medium';
    
    const lowerQuestion = question.toLowerCase();
    const urgentKeywords = ['urgent', 'critical', 'immediate', 'asap'];
    const importantKeywords = ['important', 'significant', 'major'];
    
    // Check if RFQ is closing soon
    const closingDate = new Date(rfqInfo.closingDate);
    const now = new Date();
    const daysUntilClosing = (closingDate - now) / (1000 * 60 * 60 * 24);
    
    if (urgentKeywords.some(keyword => lowerQuestion.includes(keyword)) || daysUntilClosing < 2) {
      return 'critical';
    } else if (importantKeywords.some(keyword => lowerQuestion.includes(keyword)) || daysUntilClosing < 5) {
      return 'high';
    } else if (daysUntilClosing < 10) {
      return 'medium';
    }
    
    return 'low';
  }

  _extractReferences(question) {
    if (!question) return [];
    
    const references = [];
    
    // Extract section references (e.g., "Section 3.2", "Clause 4.1")
    const sectionMatches = question.match(/(?:section|clause|paragraph)\s+(\d+\.?\d*)/gi);
    if (sectionMatches) {
      references.push(...sectionMatches);
    }
    
    // Extract page references (e.g., "Page 15", "p. 23")
    const pageMatches = question.match(/(?:page|p\.)\s*(\d+)/gi);
    if (pageMatches) {
      references.push(...pageMatches);
    }
    
    return references;
  }

  _generateTags(question, rfqInfo) {
    const tags = [];
    
    // Add category-based tags
    if (rfqInfo.category) {
      tags.push(rfqInfo.category.toLowerCase());
    }
    
    // Add question category tags
    tags.push(this._categorizeQuestion(question));
    
    // Add priority tags
    tags.push(this._calculatePriority(question, rfqInfo));
    
    return tags;
  }
}

module.exports = new Clarification();
