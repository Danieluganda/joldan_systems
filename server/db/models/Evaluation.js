/**
 * Evaluation Model
 * 
 * Data access layer for bid evaluation records optimized for Azure Cosmos DB
 * Feature 6: Evaluation and scoring
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Evaluation {
  constructor() {
    if (!Evaluation.instance) {
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
      this.container = this.database.container('evaluations');
      
      Evaluation.instance = this;
    }
    return Evaluation.instance;
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
   * Create a new evaluation with embedded submission and evaluator data
   */
  async create({
    submissionId,
    evaluatorId,
    status = 'in_progress',
    technicalScore,
    financialScore,
    overallScore,
    comments,
    submissionInfo = {},
    evaluatorInfo = {},
    rfqInfo = {},
    criteria = []
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const evaluation = {
        id,
        type: 'evaluation',
        // Hierarchical partition key: submissionId|evaluatorId for targeted queries
        partitionKey: `${submissionId}|${evaluatorId}`,
        submissionId,
        evaluatorId,
        status,
        technicalScore: technicalScore || null,
        financialScore: financialScore || null,
        overallScore: overallScore || null,
        comments: comments || '',
        createdAt: now,
        updatedAt: now,
        
        // Embedded submission information for faster queries
        submission: {
          id: submissionId,
          rfqId: submissionInfo.rfqId,
          vendorId: submissionInfo.vendorId,
          vendorName: submissionInfo.vendorName,
          proposedPrice: submissionInfo.proposedPrice,
          submissionDate: submissionInfo.submissionDate,
          deliveryTimeline: submissionInfo.deliveryTimeline
        },
        
        // Embedded evaluator information
        evaluator: {
          id: evaluatorId,
          name: evaluatorInfo.name,
          email: evaluatorInfo.email,
          department: evaluatorInfo.department,
          role: evaluatorInfo.role,
          expertise: evaluatorInfo.expertise || []
        },
        
        // Embedded RFQ context for analytics
        rfq: {
          id: submissionInfo.rfqId || rfqInfo.id,
          title: rfqInfo.title,
          category: rfqInfo.category,
          department: rfqInfo.department,
          estimatedValue: rfqInfo.estimatedValue
        },
        
        // Detailed scoring breakdown
        scoring: {
          technical: {
            score: technicalScore || null,
            maxScore: 100,
            breakdown: [],
            comments: '',
            completedAt: null
          },
          financial: {
            score: financialScore || null,
            maxScore: 100,
            breakdown: [],
            comments: '',
            completedAt: null
          },
          overall: {
            score: overallScore || null,
            maxScore: 100,
            weightedComponents: [],
            finalComments: comments || ''
          }
        },
        
        // Evaluation criteria and rubrics
        criteria: criteria.map(criterion => ({
          id: uuidv4(),
          name: criterion.name,
          category: criterion.category,
          weight: criterion.weight,
          maxScore: criterion.maxScore,
          score: criterion.score || null,
          comments: criterion.comments || '',
          evaluatedAt: criterion.score ? now : null
        })),
        
        // Evaluation workflow tracking
        workflow: {
          currentStage: status,
          stages: [{
            stage: 'created',
            completedAt: now,
            completedBy: evaluatorId,
            notes: 'Evaluation assigned'
          }],
          deadlines: {
            technicalEvaluation: rfqInfo.technicalDeadline,
            financialEvaluation: rfqInfo.financialDeadline,
            finalSubmission: rfqInfo.evaluationDeadline
          },
          notifications: []
        },
        
        // Metadata for analytics and compliance
        metadata: {
          department: evaluatorInfo.department || rfqInfo.department,
          category: rfqInfo.category,
          evaluationType: this._determineEvaluationType(criteria),
          priority: this._calculatePriority(rfqInfo),
          confidentialityLevel: 'confidential',
          lastActivity: now,
          version: 1,
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: evaluatorId,
            details: 'Evaluation record created'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(evaluation);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating evaluation', { error: error.message });
      throw error;
    }
  }

  /**
   * Get evaluation by ID with partition key optimization
   */
  async findById(id, submissionId = null, evaluatorId = null) {
    try {
      const startTime = Date.now();
      
      if (submissionId && evaluatorId) {
        // Direct partition read - most efficient
        const partitionKey = `${submissionId}|${evaluatorId}`;
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
            WHERE c.id = @id AND c.type = 'evaluation'
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
      logger.error('Error finding evaluation by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all evaluations with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'evaluation'";
      const parameters = [];

      // Build dynamic query with proper indexing
      if (filters.submissionId) {
        whereClause += ` AND c.submissionId = @submissionId`;
        parameters.push({ name: '@submissionId', value: filters.submissionId });
      }

      if (filters.evaluatorId) {
        whereClause += ` AND c.evaluatorId = @evaluatorId`;
        parameters.push({ name: '@evaluatorId', value: filters.evaluatorId });
      }

      if (filters.status) {
        whereClause += ` AND c.status = @status`;
        parameters.push({ name: '@status', value: filters.status });
      }

      if (filters.rfqId) {
        whereClause += ` AND c.rfq.id = @rfqId`;
        parameters.push({ name: '@rfqId', value: filters.rfqId });
      }

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.category) {
        whereClause += ` AND c.metadata.category = @category`;
        parameters.push({ name: '@category', value: filters.category });
      }

      if (filters.minTechnicalScore) {
        whereClause += ` AND c.technicalScore >= @minTechnicalScore`;
        parameters.push({ name: '@minTechnicalScore', value: parseFloat(filters.minTechnicalScore) });
      }

      if (filters.minOverallScore) {
        whereClause += ` AND c.overallScore >= @minOverallScore`;
        parameters.push({ name: '@minOverallScore', value: parseFloat(filters.minOverallScore) });
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
          // Use partition key when filtering by submission and evaluator
          partitionKey: filters.submissionId && filters.evaluatorId ? 
            `${filters.submissionId}|${filters.evaluatorId}` : undefined
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
      logger.error('Error getting all evaluations', { error: error.message });
      throw error;
    }
  }

  /**
   * Update evaluation with scoring and audit tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current evaluation first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Evaluation not found');
      }

      const now = new Date();
      
      // Handle status changes with workflow tracking
      const statusChanged = updates.status && updates.status !== current.status;
      
      // Handle scoring updates
      const scoringUpdates = {};
      if (updates.technicalScore !== undefined) {
        scoringUpdates['scoring.technical'] = {
          ...current.scoring.technical,
          score: updates.technicalScore,
          completedAt: now,
          comments: updates.technicalComments || current.scoring.technical.comments
        };
      }

      if (updates.financialScore !== undefined) {
        scoringUpdates['scoring.financial'] = {
          ...current.scoring.financial,
          score: updates.financialScore,
          completedAt: now,
          comments: updates.financialComments || current.scoring.financial.comments
        };
      }

      if (updates.overallScore !== undefined) {
        scoringUpdates['scoring.overall'] = {
          ...current.scoring.overall,
          score: updates.overallScore,
          finalComments: updates.comments || current.scoring.overall.finalComments
        };
      }

      // Prepare the updated evaluation
      const updatedEvaluation = {
        ...current,
        ...updates,
        ...scoringUpdates,
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
              user: updates.updatedBy || current.evaluatorId,
              details: updates.updateReason || 'Evaluation updated',
              changes: Object.keys(updates).filter(key => 
                !['updatedBy', 'updateReason'].includes(key)
              )
            }
          ]
        }
      };

      // Handle status change workflow
      if (statusChanged) {
        updatedEvaluation.workflow.stages.push({
          stage: updates.status,
          completedAt: now,
          completedBy: updates.updatedBy || current.evaluatorId,
          notes: updates.statusNotes || `Status changed to ${updates.status}`
        });
        updatedEvaluation.workflow.currentStage = updates.status;
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedEvaluation);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating evaluation', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete evaluation (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating status
      const updatedEvaluation = await this.update(id, {
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy,
        updatedBy: deletedBy,
        updateReason: 'Evaluation deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedEvaluation;
    } catch (error) {
      logger.error('Error deleting evaluation', { error: error.message });
      throw error;
    }
  }

  /**
   * Get evaluations by submission with partition-optimized query
   */
  async getBySubmission(submissionId) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'evaluation' 
          AND c.submissionId = @submissionId
          AND c.status != 'deleted'
          ORDER BY c.createdAt DESC
        `,
        parameters: [
          { name: '@submissionId', value: submissionId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getBySubmission', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting evaluations by submission', { error: error.message });
      throw error;
    }
  }

  /**
   * Get evaluations by evaluator with efficient querying
   */
  async getByEvaluator(evaluatorId, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'evaluation' 
          AND c.evaluatorId = @evaluatorId
          AND c.status != 'deleted'
          ORDER BY c.createdAt DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters: [
          { name: '@evaluatorId', value: evaluatorId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByEvaluator', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting evaluations by evaluator', { error: error.message });
      throw error;
    }
  }

  /**
   * Get evaluation analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'evaluation' AND c.status != 'deleted'";
      const parameters = [];

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.rfqId) {
        whereClause += ` AND c.rfq.id = @rfqId`;
        parameters.push({ name: '@rfqId', value: filters.rfqId });
      }

      const querySpec = {
        query: `
          SELECT 
            c.status,
            c.technicalScore,
            c.financialScore,
            c.overallScore,
            c.metadata.department,
            c.metadata.category,
            c.evaluator.department as evaluatorDepartment
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
        totalEvaluations: resources.length,
        statusBreakdown: {},
        departmentBreakdown: {},
        categoryBreakdown: {},
        scoreDistribution: {
          technical: { total: 0, count: 0, average: 0 },
          financial: { total: 0, count: 0, average: 0 },
          overall: { total: 0, count: 0, average: 0 }
        }
      };

      resources.forEach(evaluation => {
        // Status breakdown
        analytics.statusBreakdown[evaluation.status] = 
          (analytics.statusBreakdown[evaluation.status] || 0) + 1;

        // Department breakdown
        const dept = evaluation.metadata?.department || 'unknown';
        analytics.departmentBreakdown[dept] = 
          (analytics.departmentBreakdown[dept] || 0) + 1;

        // Category breakdown
        const category = evaluation.metadata?.category || 'uncategorized';
        analytics.categoryBreakdown[category] = 
          (analytics.categoryBreakdown[category] || 0) + 1;

        // Score distribution
        if (evaluation.technicalScore !== null) {
          analytics.scoreDistribution.technical.total += evaluation.technicalScore;
          analytics.scoreDistribution.technical.count++;
        }

        if (evaluation.financialScore !== null) {
          analytics.scoreDistribution.financial.total += evaluation.financialScore;
          analytics.scoreDistribution.financial.count++;
        }

        if (evaluation.overallScore !== null) {
          analytics.scoreDistribution.overall.total += evaluation.overallScore;
          analytics.scoreDistribution.overall.count++;
        }
      });

      // Calculate averages
      Object.keys(analytics.scoreDistribution).forEach(scoreType => {
        const dist = analytics.scoreDistribution[scoreType];
        dist.average = dist.count > 0 ? Math.round((dist.total / dist.count) * 100) / 100 : 0;
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting evaluation analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for evaluation service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'evaluation'",
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
      logger.error('Evaluation health check failed', { error: error.message });
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
  _determineEvaluationType(criteria) {
    if (!criteria || criteria.length === 0) return 'standard';
    
    const hasTechnical = criteria.some(c => c.category === 'technical');
    const hasFinancial = criteria.some(c => c.category === 'financial');
    
    if (hasTechnical && hasFinancial) return 'comprehensive';
    if (hasTechnical) return 'technical';
    if (hasFinancial) return 'financial';
    
    return 'custom';
  }

  _calculatePriority(rfqInfo) {
    if (!rfqInfo) return 'medium';
    
    const value = rfqInfo.estimatedValue || 0;
    
    if (value >= 1000000) return 'critical';
    if (value >= 500000) return 'high';
    if (value >= 100000) return 'medium';
    
    return 'low';
  }
}

module.exports = new Evaluation();
