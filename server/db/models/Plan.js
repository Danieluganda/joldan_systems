/**
 * Plan Model - UPDATED for STEP System
 * 
 * Data access layer for procurement plans optimized for Azure Cosmos DB
 * Includes fields from ERT Procurement Plan Excel and World Bank STEP requirements
 * 
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
   * Create a new procurement plan with STEP fields and Excel compatibility
   */
  async create({
    // === EXCEL/STEP REQUIRED FIELDS ===
    referenceNumber,              // Activity Reference No. (e.g., "OUL-10X-GO-2025-042")
    description,                  // Full procurement description
    loanCreditNumber,             // Loan/Credit No. (e.g., "IDA-56530")
    component,                    // Project component
    reviewType,                   // Prior/Post review
    category,                     // Goods/Works/Consulting Services/Non-Consulting Services
    procurementMethod,            // RFB/RFQ/DIR/QCBS/CQS/CDS/INDV
    marketApproach,               // Open-National/Open-International/Restricted
    prequalificationYN,           // Y/N
    procurementProcess,           // Single Stage One Envelope/Two Stage
    evaluationMethod,             // QCBS/LCS/FBS/CQS/etc
    estimatedAmountUSD,           // Estimated Amount in USD
    unspscCode,                   // MANDATORY: UN Standard Product Service Code
    
    // === OPTIONAL STEP FIELDS ===
    highRiskFlag,                 // High SEA/SH Risk flag
    procurementDocType,           // Procurement Document Type
    processStatus,                // Draft/Submitted/Under Review/Cleared/Signed/Canceled
    activityStatus,               // Activity Status
    
    // === ORIGINAL FIELDS (backward compatibility) ===
    procurementId,
    planName,
    itemDescription,
    estimatedValue,
    quantity,
    deliveryDate,
    specifications,
    procurementInfo = {},
    departmentInfo = {},
    
    // === WORKPLAN LINK ===
    workplanId,                   // Link to OrganizationWorkplan
    
    createdBy = 'system'
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      // Generate reference number if not provided
      const generatedRefNumber = referenceNumber || this._generateReferenceNumber({
        procurementMethod,
        category,
        departmentInfo
      });
      
      const plan = {
        id,
        type: 'plan',
        
        // Hierarchical partition key: procurementId|department for targeted queries
        partitionKey: `${procurementId}|${departmentInfo.name || 'general'}`,
        
        // === CORE IDENTIFICATION ===
        referenceNumber: generatedRefNumber,
        procurementId,
        workplanId: workplanId || null,
        planName: planName || description,
        
        // === EXCEL/STEP PROCUREMENT DETAILS ===
        description: description || itemDescription,
        loanCreditNumber: loanCreditNumber || null,
        component: component || null,
        
        // === PROCUREMENT METHOD & APPROACH ===
        procurementMethod: procurementMethod || 'RFB',        // RFB/RFQ/DIR/QCBS/CQS/CDS/INDV
        category: category || 'Goods',                         // Goods/Works/Consulting Services/etc
        marketApproach: marketApproach || 'Open-National',     // Open-National/International/Restricted
        procurementProcess: procurementProcess || 'Single Stage One Envelope',
        evaluationMethod: evaluationMethod || null,            // QCBS/LCS/FBS/etc
        
        // === REVIEW & QUALIFICATION ===
        reviewType: reviewType || 'Post',                      // Prior/Post (Bank approval)
        prequalificationYN: prequalificationYN || 'N',         // Y/N
        
        // === UNSPSC CODE (MANDATORY for STEP) ===
        unspscCode: unspscCode || null,                        // UN Standard Product Service Code
        unspscHierarchy: this._parseUNSPSCCode(unspscCode),    // {segment, family, class, commodity}
        
        // === STATUS TRACKING ===
        processStatus: processStatus || 'Draft',               // Draft/Submitted/Cleared/Signed/Canceled
        activityStatus: activityStatus || 'Pending',           // Activity Status
        
        // === RISK & COMPLIANCE ===
        highRiskFlag: highRiskFlag || null,                    // SEA/SH Risk
        procurementDocType: procurementDocType || null,
        
        // === FINANCIAL INFORMATION ===
        estimatedAmountUSD: parseFloat(estimatedAmountUSD || estimatedValue || 0),
        estimatedValue: parseFloat(estimatedValue || estimatedAmountUSD || 0),
        quantity: parseInt(quantity) || 1,
        
        // === DELIVERY & TIMELINE ===
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        specifications: specifications || '',
        
        // === TIMESTAMPS ===
        createdAt: now,
        updatedAt: now,
        createdBy,
        
        // === EMBEDDED PROCUREMENT INFORMATION ===
        procurement: {
          id: procurementId,
          title: procurementInfo.title || description,
          status: procurementInfo.status || processStatus,
          category: category || procurementInfo.category,
          priority: procurementInfo.priority,
          department: procurementInfo.department || departmentInfo.name
        },
        
        // === PLAN LIFECYCLE MANAGEMENT ===
        lifecycle: {
          currentStage: 'draft',
          stages: [{
            stage: 'draft',
            completedAt: now,
            completedBy: createdBy,
            notes: 'Plan created'
          }],
          approvals: [],
          rejections: [],
          bankApprovals: []  // NEW: Track Bank approvals for Prior Review
        },
        
        // === BUDGET AND FINANCIAL TRACKING ===
        financial: {
          estimatedAmountUSD: parseFloat(estimatedAmountUSD || estimatedValue || 0),
          estimatedValue: parseFloat(estimatedValue || 0),
          currency: 'USD',
          exchangeRate: 1.0,
          localCurrency: 'UGX',
          estimatedAmountLocal: null,
          budgetCode: procurementInfo.budgetCode || null,
          costCenter: procurementInfo.costCenter || null,
          approvedBudget: null,
          actualCost: null,
          variance: null,
          fundingSource: loanCreditNumber,
          fiscalYear: new Date().getFullYear()
        },
        
        // === DELIVERY AND TIMELINE MANAGEMENT ===
        delivery: {
          requestedDate: deliveryDate ? new Date(deliveryDate) : null,
          confirmedDate: null,
          actualDate: null,
          location: procurementInfo.deliveryLocation,
          instructions: procurementInfo.deliveryInstructions,
          status: 'pending'
        },
        
        // === TECHNICAL SPECIFICATIONS ===
        technical: {
          specifications: specifications || '',
          itemDescription: itemDescription || description,
          requirements: procurementInfo.requirements || [],
          qualityStandards: procurementInfo.qualityStandards || [],
          complianceRequirements: procurementInfo.complianceRequirements || [],
          attachments: []
        },
        
        // === VENDOR AND SOURCING INFORMATION ===
        sourcing: {
          preferredVendors: procurementInfo.preferredVendors || [],
          sourcingStrategy: procurementInfo.sourcingStrategy || 'competitive',
          marketAnalysis: null,
          riskAssessment: null,
          prequalificationRequired: prequalificationYN === 'Y',
          shortlistedBidders: []
        },
        
        // === STEP WORKFLOW STAGES (15 stages) ===
        // Note: Detailed stages moved to separate ProcurementStage collection for better performance
        stagesTracking: {
          totalStages: 15,
          completedStages: 0,
          currentStageNumber: 1,
          hasStageDelays: false,
          averageDelayDays: 0,
          // Reference to ProcurementStage documents
          stagesCollectionRef: 'procurementStages'
        },
        
        // === NOTICES & PUBLICATION ===
        notices: {
          generalProcurementNotice: {
            published: false,
            publishedDate: null,
            noticeId: null
          },
          specificProcurementNotice: {
            published: false,
            publishedDate: null,
            noticeId: null,
            outlets: []  // 4 outlets: Website, UNDB, WB Finances App, WB Procurement App
          },
          contractAwardNotice: {
            published: false,
            publishedDate: null,
            noticeId: null,
            outlets: []
          }
        },
        
        // === METADATA FOR ANALYTICS AND REPORTING ===
        metadata: {
          department: departmentInfo.name || procurementInfo.department,
          category: category || procurementInfo.category,
          subcategory: procurementInfo.subcategory,
          priority: procurementInfo.priority || 'medium',
          fiscalYear: new Date().getFullYear(),
          quarter: Math.floor((new Date().getMonth() + 3) / 3),
          tags: this._generateTags(description, itemDescription, procurementInfo, {
            procurementMethod,
            category,
            reviewType
          }),
          lastActivity: now,
          version: 1,
          
          // === AUDIT TRAIL ===
          auditTrail: [{
            action: 'created',
            timestamp: now,
            user: createdBy,
            details: 'Procurement plan created',
            changes: {
              referenceNumber: generatedRefNumber,
              procurementMethod,
              category,
              reviewType,
              estimatedAmountUSD
            }
          }],
          
          // === EXCEL IMPORT TRACKING ===
          importedFromExcel: false,
          excelImportDate: null,
          excelSheetName: null,  // RFB/RFQ/DIR/QCBS/CQS/CDS/INDV
          excelRowNumber: null
        }
      };

      const { resource, diagnostics } = await this.container.items.create(plan);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      logger.info('Procurement plan created', {
        id: resource.id,
        referenceNumber: generatedRefNumber,
        procurementMethod,
        reviewType,
        estimatedAmountUSD
      });
      
      return resource;
    } catch (error) {
      logger.error('Error creating plan', { error: error.message });
      throw error;
    }
  }

  /**
   * Import procurement plan from Excel
   * Handles data from ERT_Procurement_Plan_April_21_2022.xlsx format
   */
  async importFromExcel({
    workplanId,
    excelData,
    sheetName,          // RFB/RFQ/DIR/QCBS/CQS/CDS/INDV
    rowNumber,
    createdBy = 'system'
  }) {
    try {
      const startTime = Date.now();
      
      // Parse Excel row data
      const plan = await this.create({
        workplanId,
        referenceNumber: excelData['Activity  Reference No. / Description:']?.split(' / ')[0]?.trim(),
        description: excelData['Activity  Reference No. / Description:']?.split(' / ')[1]?.trim() || 
                     excelData['Activity  Reference No. / Description:'],
        loanCreditNumber: excelData['Loan / Credit No.'],
        component: excelData['Component'],
        reviewType: excelData['Review Type'],  // Prior or Post
        category: excelData['Category  \n'] || excelData['Category'],
        procurementMethod: sheetName,  // RFB/RFQ/DIR/QCBS/CQS/CDS/INDV from sheet name
        marketApproach: excelData['Market Approach'],
        prequalificationYN: excelData['Prequalification (Y/N)'],
        procurementProcess: excelData['Procurement Process'],
        evaluationMethod: excelData['Evaluation Options'],
        estimatedAmountUSD: parseFloat(excelData['Estimated Amount\n (US$)'] || 0),
        highRiskFlag: excelData['High SEA/SH Risk'],
        procurementDocType: excelData['Procurement Document Type'],
        processStatus: excelData['Process Status'],  // Draft/Submitted/Cleared/Signed/Canceled
        activityStatus: excelData['Activity  Status'],
        
        procurementId: `proc_${uuidv4()}`,
        departmentInfo: { name: 'general' },
        createdBy
      });
      
      // Update metadata to track Excel import
      const updatedPlan = await this.update(plan.id, {
        'metadata.importedFromExcel': true,
        'metadata.excelImportDate': new Date(),
        'metadata.excelSheetName': sheetName,
        'metadata.excelRowNumber': rowNumber,
        updatedBy: createdBy
      }, plan.partitionKey);
      
      logger.info('Plan imported from Excel', {
        id: updatedPlan.id,
        referenceNumber: updatedPlan.referenceNumber,
        sheetName,
        rowNumber
      });
      
      this._logDiagnostics('importFromExcel', {}, Date.now() - startTime);
      
      return updatedPlan;
    } catch (error) {
      logger.error('Error importing plan from Excel', { 
        error: error.message,
        sheetName,
        rowNumber 
      });
      throw error;
    }
  }

  /**
   * Batch import multiple procurement plans from Excel
   */
  async batchImportFromExcel({
    workplanId,
    excelRows,
    sheetName,
    createdBy = 'system'
  }) {
    try {
      const startTime = Date.now();
      const results = {
        total: excelRows.length,
        successful: 0,
        failed: 0,
        errors: []
      };
      
      for (let i = 0; i < excelRows.length; i++) {
        try {
          await this.importFromExcel({
            workplanId,
            excelData: excelRows[i],
            sheetName,
            rowNumber: i + 2,  // +2 for Excel header row and 0-indexing
            createdBy
          });
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: error.message
          });
          logger.warn('Failed to import Excel row', {
            row: i + 2,
            sheetName,
            error: error.message
          });
        }
      }
      
      logger.info('Batch import completed', results);
      this._logDiagnostics('batchImportFromExcel', {}, Date.now() - startTime);
      
      return results;
    } catch (error) {
      logger.error('Error in batch import from Excel', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plan by reference number (STEP standard lookup)
   */
  async findByReferenceNumber(referenceNumber) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'plan' AND c.referenceNumber = @referenceNumber
        `,
        parameters: [
          { name: '@referenceNumber', value: referenceNumber }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('findByReferenceNumber', diagnostics, Date.now() - startTime);
      
      return resources[0] || null;
    } catch (error) {
      logger.error('Error finding plan by reference number', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plans by procurement method
   */
  async getByMethod(procurementMethod, filters = {}) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'plan' 
          AND c.procurementMethod = @method
          ${filters.reviewType ? 'AND c.reviewType = @reviewType' : ''}
          ${filters.processStatus ? 'AND c.processStatus = @processStatus' : ''}
          ORDER BY c.createdAt DESC
        `,
        parameters: [
          { name: '@method', value: procurementMethod },
          ...(filters.reviewType ? [{ name: '@reviewType', value: filters.reviewType }] : []),
          ...(filters.processStatus ? [{ name: '@processStatus', value: filters.processStatus }] : [])
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByMethod', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting plans by method', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plans requiring Bank approval (Prior Review)
   */
  async getPendingBankApproval(workplanId = null) {
    try {
      const startTime = Date.now();
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'plan' 
          AND c.reviewType = 'Prior'
          AND c.processStatus IN ('Submitted', 'Under Review')
          ${workplanId ? 'AND c.workplanId = @workplanId' : ''}
          ORDER BY c.createdAt ASC
        `,
        parameters: workplanId ? [{ name: '@workplanId', value: workplanId }] : []
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getPendingBankApproval', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting pending bank approvals', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plans by workplan
   */
  async getByWorkplan(workplanId, filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = `c.type = 'plan' AND c.workplanId = @workplanId`;
      const parameters = [{ name: '@workplanId', value: workplanId }];

      if (filters.procurementMethod) {
        whereClause += ` AND c.procurementMethod = @method`;
        parameters.push({ name: '@method', value: filters.procurementMethod });
      }

      if (filters.reviewType) {
        whereClause += ` AND c.reviewType = @reviewType`;
        parameters.push({ name: '@reviewType', value: filters.reviewType });
      }

      if (filters.processStatus) {
        whereClause += ` AND c.processStatus = @processStatus`;
        parameters.push({ name: '@processStatus', value: filters.processStatus });
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
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByWorkplan', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting plans by workplan', { error: error.message });
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

      if (filters.workplanId) {
        whereClause += ` AND c.workplanId = @workplanId`;
        parameters.push({ name: '@workplanId', value: filters.workplanId });
      }

      if (filters.procurementMethod) {
        whereClause += ` AND c.procurementMethod = @procurementMethod`;
        parameters.push({ name: '@procurementMethod', value: filters.procurementMethod });
      }

      if (filters.reviewType) {
        whereClause += ` AND c.reviewType = @reviewType`;
        parameters.push({ name: '@reviewType', value: filters.reviewType });
      }

      if (filters.processStatus) {
        whereClause += ` AND c.processStatus = @processStatus`;
        parameters.push({ name: '@processStatus', value: filters.processStatus });
      }

      if (filters.department) {
        whereClause += ` AND c.metadata.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.category) {
        whereClause += ` AND c.category = @category`;
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
        whereClause += ` AND c.estimatedAmountUSD >= @minValue`;
        parameters.push({ name: '@minValue', value: parseFloat(filters.minValue) });
      }

      if (filters.maxValue) {
        whereClause += ` AND c.estimatedAmountUSD <= @maxValue`;
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
      if (updates.estimatedValue !== undefined || updates.estimatedAmountUSD !== undefined) {
        financialUpdates.financial = {
          ...current.financial,
          estimatedValue: parseFloat(updates.estimatedValue || updates.estimatedAmountUSD || current.estimatedValue),
          estimatedAmountUSD: parseFloat(updates.estimatedAmountUSD || updates.estimatedValue || current.estimatedAmountUSD)
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
      
      // Soft delete by updating status
      const updatedPlan = await this.update(id, {
        processStatus: 'Canceled',
        activityStatus: 'Canceled',
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
   * Get plan analytics for dashboard with STEP metrics
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'plan' AND c.processStatus != 'Canceled'";
      const parameters = [];

      if (filters.workplanId) {
        whereClause += ` AND c.workplanId = @workplanId`;
        parameters.push({ name: '@workplanId', value: filters.workplanId });
      }

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
            c.estimatedAmountUSD,
            c.procurementMethod,
            c.reviewType,
            c.processStatus,
            c.category,
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

      // Process analytics data with STEP metrics
      const analytics = {
        totalPlans: resources.length,
        totalValueUSD: 0,
        
        // STEP-specific metrics
        methodBreakdown: {},      // RFB/RFQ/QCBS/etc
        reviewTypeBreakdown: {},  // Prior/Post
        statusBreakdown: {},      // Draft/Submitted/Cleared/Signed
        categoryBreakdown: {},    // Goods/Works/Services
        
        // Original metrics
        stageBreakdown: {},
        departmentBreakdown: {},
        priorityBreakdown: {},
        upcomingDeliveries: 0,
        
        // Performance metrics
        pendingBankApproval: 0,
        onTimeRate: 0
      };

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      resources.forEach(plan => {
        // Total value calculation
        analytics.totalValueUSD += plan.estimatedAmountUSD || 0;

        // Procurement method breakdown
        const method = plan.procurementMethod || 'unknown';
        analytics.methodBreakdown[method] = 
          (analytics.methodBreakdown[method] || 0) + 1;

        // Review type breakdown
        const review = plan.reviewType || 'unknown';
        analytics.reviewTypeBreakdown[review] = 
          (analytics.reviewTypeBreakdown[review] || 0) + 1;
        
        // Process status breakdown
        const status = plan.processStatus || 'unknown';
        analytics.statusBreakdown[status] = 
          (analytics.statusBreakdown[status] || 0) + 1;

        // Category breakdown
        const category = plan.category || 'unknown';
        analytics.categoryBreakdown[category] = 
          (analytics.categoryBreakdown[category] || 0) + 1;

        // Stage breakdown
        analytics.stageBreakdown[plan.lifecycle?.currentStage || 'unknown'] = 
          (analytics.stageBreakdown[plan.lifecycle?.currentStage || 'unknown'] || 0) + 1;

        // Department breakdown
        const dept = plan.metadata?.department || 'unknown';
        analytics.departmentBreakdown[dept] = {
          count: (analytics.departmentBreakdown[dept]?.count || 0) + 1,
          totalValue: (analytics.departmentBreakdown[dept]?.totalValue || 0) + (plan.estimatedAmountUSD || 0)
        };

        // Priority breakdown
        const priority = plan.metadata?.priority || 'medium';
        analytics.priorityBreakdown[priority] = 
          (analytics.priorityBreakdown[priority] || 0) + 1;

        // Pending Bank approval (Prior Review)
        if (plan.reviewType === 'Prior' && 
            ['Submitted', 'Under Review'].includes(plan.processStatus)) {
          analytics.pendingBankApproval++;
        }

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

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate reference number if not provided
   * Format: ORG-PROGRAM-CATEGORY-YEAR-NUMBER
   * Example: OUL-10X-GO-2025-042
   */
  _generateReferenceNumber({ procurementMethod, category, departmentInfo }) {
    const org = 'OUL';  // Organization code
    const program = '10X';  // Program code
    const categoryCode = this._getCategoryCode(category);
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${org}-${program}-${categoryCode}-${year}-${random}`;
  }

  /**
   * Get category code from full category name
   */
  _getCategoryCode(category) {
    const codes = {
      'Goods': 'GO',
      'Works': 'CW',
      'Civil Works': 'CW',
      'Consulting Services': 'CONS',
      'Non-Consulting Services': 'NC',
      'Services': 'CONS'
    };
    return codes[category] || 'GO';
  }

  /**
   * Parse UNSPSC code into hierarchy
   * Format: XX-XX-XX-XX (Segment-Family-Class-Commodity)
   * Example: 43-21-15-03
   */
  _parseUNSPSCCode(unspscCode) {
    if (!unspscCode) return null;
    
    const parts = unspscCode.split('-');
    if (parts.length !== 4) return null;
    
    return {
      segment: parts[0],
      family: parts[1],
      class: parts[2],
      commodity: parts[3],
      full: unspscCode
    };
  }

  /**
   * Generate tags from plan details
   */
  _generateTags(planName, itemDescription, procurementInfo, stepInfo = {}) {
    const tags = [];
    
    // Add STEP-specific tags
    if (stepInfo.procurementMethod) {
      tags.push(stepInfo.procurementMethod);
    }
    if (stepInfo.category) {
      tags.push(stepInfo.category.toLowerCase().replace(/\s+/g, '-'));
    }
    if (stepInfo.reviewType) {
      tags.push(`review-${stepInfo.reviewType.toLowerCase()}`);
    }
    
    // Add category-based tags
    if (procurementInfo.category) {
      tags.push(procurementInfo.category.toLowerCase());
    }
    
    // Add priority tags
    if (procurementInfo.priority) {
      tags.push(procurementInfo.priority);
    }
    
    // Extract keywords from plan name and description
    const text = `${planName || ''} ${itemDescription || ''}`.toLowerCase();
    const keywords = text.split(/\s+/).filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word)
    );
    
    tags.push(...keywords.slice(0, 5)); // Limit to 5 keywords
    
    return [...new Set(tags)]; // Remove duplicates
  }
}

module.exports = new Plan();