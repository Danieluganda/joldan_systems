/**
 * Template Model
 * 
 * Data access layer for document templates optimized for Azure Cosmos DB
 * Feature 10: Document/template management
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Template {
  constructor() {
    if (!Template.instance) {
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
      this.container = this.database.container('templates');
      
      Template.instance = this;
    }
    return Template.instance;
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
   * Create a new template with hierarchical partition key
   */
  async create({
    templateName,
    templateType,
    category,
    content,
    createdBy,
    isActive = true,
    description,
    creatorInfo = {},
    departmentInfo = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const template = {
        id,
        type: 'template',
        // Hierarchical partition key: templateType|category for targeted queries
        partitionKey: `${templateType}|${category}`,
        templateName,
        templateType,
        category,
        content,
        createdBy,
        isActive,
        description: description || '',
        createdAt: now,
        updatedAt: now,
        
        // Embedded creator information
        creator: {
          id: createdBy,
          name: creatorInfo.name,
          email: creatorInfo.email,
          department: creatorInfo.department || departmentInfo.name,
          role: creatorInfo.role
        },
        
        // Template versioning and history
        versioning: {
          currentVersion: 1,
          isLatest: true,
          parentVersionId: null,
          versionHistory: [{
            version: 1,
            createdAt: now,
            createdBy,
            changes: 'Initial template creation'
          }]
        },
        
        // Template structure and content management
        structure: {
          format: this._detectContentFormat(content),
          sections: this._extractSections(content),
          variables: this._extractVariables(content),
          placeholders: this._extractPlaceholders(content),
          fields: []
        },
        
        // Usage and analytics tracking
        usage: {
          totalUsage: 0,
          lastUsed: null,
          usageHistory: [],
          popularFields: [],
          averageCompletionTime: null
        },
        
        // Access control and permissions
        access: {
          visibility: 'internal', // public, internal, restricted
          permissions: [],
          allowedDepartments: departmentInfo.name ? [departmentInfo.name] : [],
          allowedRoles: []
        },
        
        // Template categorization and organization
        classification: {
          primaryCategory: category,
          subcategories: [],
          tags: this._generateTags(templateName, description, templateType, category),
          documentTypes: [templateType],
          businessProcesses: []
        },
        
        // Metadata for analytics and compliance
        metadata: {
          department: creatorInfo.department || departmentInfo.name,
          templateType,
          category,
          complexity: this._calculateComplexity(content),
          estimatedCompletionTime: this._estimateCompletionTime(content),
          complianceFlags: [],
          lastActivity: now,
          version: 1,
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: createdBy,
            details: 'Template created'
          }]
        }
      };

      const { resource, diagnostics } = await this.container.items.create(template);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating template', { error: error.message });
      throw error;
    }
  }

  /**
   * Get template by ID with partition key optimization
   */
  async findById(id, templateType = null, category = null) {
    try {
      const startTime = Date.now();
      
      if (templateType && category) {
        // Direct partition read - most efficient
        const partitionKey = `${templateType}|${category}`;
        const { resource, diagnostics } = await this.container
          .item(id, partitionKey)
          .read();
          
        this._logDiagnostics('findById-direct', diagnostics, Date.now() - startTime);
        
        // Update usage tracking
        if (resource) {
          await this._updateUsageTracking(id, partitionKey);
        }
        
        return resource;
      } else {
        // Cross-partition query when partition key unknown
        const querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.id = @id AND c.type = 'template'
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
          await this._updateUsageTracking(id, resources[0].partitionKey);
        }
        
        return resources[0];
      }
    } catch (error) {
      logger.error('Error finding template by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all templates with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'template'";
      const parameters = [];

      // Build dynamic query with proper indexing
      if (filters.templateType) {
        whereClause += ` AND c.templateType = @templateType`;
        parameters.push({ name: '@templateType', value: filters.templateType });
      }

      if (filters.category) {
        whereClause += ` AND c.category = @category`;
        parameters.push({ name: '@category', value: filters.category });
      }

      if (filters.isActive !== undefined) {
        whereClause += ` AND c.isActive = @isActive`;
        parameters.push({ name: '@isActive', value: filters.isActive });
      }

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.createdBy) {
        whereClause += ` AND c.createdBy = @createdBy`;
        parameters.push({ name: '@createdBy', value: filters.createdBy });
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
          // Use partition key when filtering by template type and category
          partitionKey: filters.templateType && filters.category ? 
            `${filters.templateType}|${filters.category}` : undefined
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
      logger.error('Error getting all templates', { error: error.message });
      throw error;
    }
  }

  /**
   * Update template with versioning and audit tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current template first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Template not found');
      }

      const now = new Date();
      
      // Handle content updates (create new version if content changed)
      const isContentUpdate = updates.content && updates.content !== current.content;
      
      // Prepare the updated template
      const updatedTemplate = {
        ...current,
        ...updates,
        updatedAt: now,
        metadata: {
          ...current.metadata,
          lastActivity: now,
          version: isContentUpdate ? current.metadata.version + 1 : current.metadata.version,
          auditTrail: [
            ...current.metadata.auditTrail,
            {
              action: isContentUpdate ? 'content_updated' : 'updated',
              timestamp: now,
              user: updates.updatedBy || 'system',
              details: updates.updateReason || 'Template updated',
              changes: Object.keys(updates).filter(key => 
                !['updatedBy', 'updateReason'].includes(key)
              )
            }
          ]
        }
      };

      // Handle content version updates
      if (isContentUpdate) {
        const newVersion = current.versioning.currentVersion + 1;
        updatedTemplate.versioning = {
          ...current.versioning,
          currentVersion: newVersion,
          versionHistory: [
            ...current.versioning.versionHistory,
            {
              version: newVersion,
              createdAt: now,
              createdBy: updates.updatedBy || 'system',
              changes: updates.versionNotes || 'Template content updated'
            }
          ]
        };
        
        // Update structure analysis
        updatedTemplate.structure = {
          ...current.structure,
          format: this._detectContentFormat(updates.content),
          sections: this._extractSections(updates.content),
          variables: this._extractVariables(updates.content),
          placeholders: this._extractPlaceholders(updates.content)
        };
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedTemplate);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating template', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete template (soft delete with audit trail)
   */
  async delete(id, partitionKey = null, deletedBy = 'system') {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating isActive status
      const updatedTemplate = await this.update(id, {
        isActive: false,
        deletedAt: new Date(),
        deletedBy,
        updatedBy: deletedBy,
        updateReason: 'Template deactivated/deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedTemplate;
    } catch (error) {
      logger.error('Error deleting template', { error: error.message });
      throw error;
    }
  }

  /**
   * Get active templates by type with partition-optimized query
   */
  async getActiveByType(templateType, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'template' 
          AND c.templateType = @templateType
          AND c.isActive = true
          ORDER BY c.templateName ASC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters: [
          { name: '@templateType', value: templateType }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getActiveByType', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting active templates by type', { error: error.message });
      throw error;
    }
  }

  /**
   * Get templates by category with partition-optimized query
   */
  async getByCategory(category, templateType = null, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let querySpec;
      let queryOptions = {};

      if (templateType) {
        // Partition-specific query - most efficient
        const partitionKey = `${templateType}|${category}`;
        querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.type = 'template' 
            AND c.category = @category
            AND c.isActive = true
            ORDER BY c.templateName ASC
            OFFSET ${offset} LIMIT ${limit}
          `,
          parameters: [
            { name: '@category', value: category }
          ]
        };
        queryOptions.partitionKey = partitionKey;
      } else {
        // Cross-partition query for all template types
        querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.type = 'template' 
            AND c.category = @category
            AND c.isActive = true
            ORDER BY c.templateName ASC
            OFFSET ${offset} LIMIT ${limit}
          `,
          parameters: [
            { name: '@category', value: category }
          ]
        };
      }

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, queryOptions)
        .fetchAll();

      this._logDiagnostics('getByCategory', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting templates by category', { error: error.message });
      throw error;
    }
  }

  /**
   * Get template analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'template' AND c.isActive = true";
      const parameters = [];

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.templateType) {
        whereClause += ` AND c.templateType = @templateType`;
        parameters.push({ name: '@templateType', value: filters.templateType });
      }

      const querySpec = {
        query: `
          SELECT 
            c.templateType,
            c.category,
            c.usage.totalUsage,
            c.metadata.department,
            c.metadata.complexity
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
        totalTemplates: resources.length,
        typeBreakdown: {},
        categoryBreakdown: {},
        departmentBreakdown: {},
        totalUsage: 0,
        complexityBreakdown: { simple: 0, medium: 0, complex: 0 }
      };

      resources.forEach(template => {
        // Type breakdown
        analytics.typeBreakdown[template.templateType] = 
          (analytics.typeBreakdown[template.templateType] || 0) + 1;

        // Category breakdown
        analytics.categoryBreakdown[template.category] = 
          (analytics.categoryBreakdown[template.category] || 0) + 1;

        // Department breakdown
        const dept = template.metadata?.department || 'unknown';
        analytics.departmentBreakdown[dept] = 
          (analytics.departmentBreakdown[dept] || 0) + 1;

        // Usage calculation
        analytics.totalUsage += template.usage?.totalUsage || 0;

        // Complexity breakdown
        const complexity = template.metadata?.complexity || 'simple';
        analytics.complexityBreakdown[complexity] = 
          (analytics.complexityBreakdown[complexity] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting template analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for template service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'template'",
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
      logger.error('Template health check failed', { error: error.message });
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
  async _updateUsageTracking(id, partitionKey) {
    try {
      const now = new Date();
      const operations = [
        { op: 'incr', path: '/usage/totalUsage', value: 1 },
        { op: 'replace', path: '/usage/lastUsed', value: now },
        { op: 'replace', path: '/metadata/lastActivity', value: now }
      ];

      await this.container
        .item(id, partitionKey)
        .patch(operations);
    } catch (error) {
      logger.warn('Error updating usage tracking', { error: error.message });
    }
  }

  _detectContentFormat(content) {
    if (!content) return 'text';
    
    if (content.includes('<html>') || content.includes('<!DOCTYPE')) return 'html';
    if (content.includes('{') && content.includes('}')) return 'json';
    if (content.includes('{{') && content.includes('}}')) return 'handlebars';
    
    return 'text';
  }

  _extractSections(content) {
    if (!content) return [];
    
    // Simple section extraction based on headers
    const sections = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.startsWith('#') || line.toLowerCase().includes('section')) {
        sections.push({
          title: line.trim(),
          lineNumber: index + 1
        });
      }
    });
    
    return sections;
  }

  _extractVariables(content) {
    if (!content) return [];
    
    // Extract variables in {{variable}} format
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1].trim())) {
        variables.push(match[1].trim());
      }
    }
    
    return variables;
  }

  _extractPlaceholders(content) {
    if (!content) return [];
    
    // Extract placeholders in [placeholder] format
    const placeholderRegex = /\[([^\]]+)\]/g;
    const placeholders = [];
    let match;
    
    while ((match = placeholderRegex.exec(content)) !== null) {
      if (!placeholders.includes(match[1].trim())) {
        placeholders.push(match[1].trim());
      }
    }
    
    return placeholders;
  }

  _calculateComplexity(content) {
    if (!content) return 'simple';
    
    const length = content.length;
    const variableCount = (content.match(/\{\{[^}]+\}\}/g) || []).length;
    const sectionCount = (content.match(/#|section/gi) || []).length;
    
    const score = length / 1000 + variableCount * 2 + sectionCount * 3;
    
    if (score > 20) return 'complex';
    if (score > 10) return 'medium';
    return 'simple';
  }

  _estimateCompletionTime(content) {
    if (!content) return 5;
    
    const wordCount = content.split(/\s+/).length;
    const variableCount = (content.match(/\{\{[^}]+\}\}/g) || []).length;
    
    // Rough estimate: 1 minute per 100 words + 2 minutes per variable
    return Math.max(5, Math.ceil(wordCount / 100 + variableCount * 2));
  }

  _generateTags(templateName, description, templateType, category) {
    const tags = [];
    
    // Add type and category
    tags.push(templateType, category);
    
    // Extract keywords from name and description
    const text = `${templateName} ${description}`.toLowerCase();
    const keywords = text.split(/\s+/).filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
    );
    
    tags.push(...keywords.slice(0, 5)); // Limit to 5 keywords
    
    return [...new Set(tags)]; // Remove duplicates
  }
}

module.exports = new Template();
