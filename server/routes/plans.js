/**
 * Procurement Plans Routes - PRODUCTION READY
 * 
 * Comprehensive procurement planning system with:
 * - Strategic planning and budget management (Feature 17)
 * - STEP system compliance (7 procurement methods)
 * - Excel import/export for ERT Procurement Plans
 * - Prior/Post review workflows
 * - World Bank approval tracking
 * - Multi-year forecasting and analytics
 * - Risk assessment and compliance monitoring
 * - Advanced approval workflows
 * 
 * @module routes/plans
 * @requires express
 * @requires services/planService
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');

// === MIDDLEWARE IMPORTS ===
const { 
  verifyToken, 
  checkPermission, 
  checkAnyPermission, 
  requireOwnershipOrPermission, 
  rateLimitByUser 
} = require('../middleware/auth');

const { 
  validateBody, 
  validateQuery, 
  validateParams, 
  sanitize, 
  validateFileUpload 
} = require('../middleware/validation');

const { asyncHandler } = require('../middleware/errorHandler');

const { 
  logCreate, 
  logUpdate, 
  logDelete, 
  logView, 
  logStatusChange, 
  logApproval 
} = require('../middleware/auditLogger');

// === SERVICE IMPORTS ===
const planService = require('../services/planService');
const budgetService = require('../services/budgetService');
const forecastService = require('../services/forecastService');
const approvalService = require('../services/approvalService');
const complianceService = require('../services/complianceService');
const riskService = require('../services/riskService');
const reportingService = require('../services/reportingService');
const notificationService = require('../services/notificationService');
const templateService = require('../services/templateService');
const documentService = require('../services/documentService');

// === UTILITY IMPORTS ===
const { 
  calculateBudgetVariance, 
  validatePlanSchedule, 
  generatePlanNumber 
} = require('../utils/planUtils');

const { 
  formatCurrency, 
  parseBudgetAllocation 
} = require('../utils/budgetUtils');

const logger = require('../utils/logger');

// === FILE UPLOAD CONFIGURATION ===
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // fallback
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// === VALIDATION SCHEMAS ===
const planValidation = {
  create: {
    // === CORE FIELDS ===
    title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
    description: { type: 'string', required: true, minLength: 20, maxLength: 2000 },
    planType: { 
      type: 'string', 
      enum: ['annual', 'quarterly', 'project_based', 'emergency', 'strategic', 'operational'], 
      required: true 
    },
    fiscalYear: { type: 'number', required: true, min: 2020, max: 2030 },
    startDate: { type: 'string', format: 'date', required: true },
    endDate: { type: 'string', format: 'date', required: true },
    department: { type: 'string', required: true, maxLength: 100 },
    planOwner: { type: 'string', required: true },
    stakeholders: { type: 'array', items: { type: 'string' }, minItems: 1 },
    
    // === BUDGET STRUCTURE ===
    budget: {
      type: 'object',
      required: true,
      properties: {
        totalAmount: { type: 'number', required: true, min: 0 },
        currency: { type: 'string', required: true, enum: ['USD', 'EUR', 'GBP', 'CAD', 'UGX'], default: 'USD' },
        allocations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', required: true, maxLength: 100 },
              amount: { type: 'number', required: true, min: 0 },
              percentage: { type: 'number', min: 0, max: 100 },
              description: { type: 'string', maxLength: 500 }
            }
          },
          required: true,
          minItems: 1
        },
        contingency: { type: 'number', min: 0, max: 50, default: 10 },
        approvedAmount: { type: 'number', min: 0 },
        spentAmount: { type: 'number', min: 0, default: 0 },
        committedAmount: { type: 'number', min: 0, default: 0 }
      }
    },
    
    // === OBJECTIVES ===
    objectives: { 
      type: 'array', 
      items: { 
        type: 'object',
        properties: {
          title: { type: 'string', required: true, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
          targetDate: { type: 'string', format: 'date' },
          metrics: { type: 'array', items: { type: 'object' } },
          status: { type: 'string', enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' }
        }
      },
      required: true,
      minItems: 1
    },
    
    // === CATEGORIES ===
    categories: { 
      type: 'array', 
      items: { 
        type: 'string', 
        enum: ['goods', 'services', 'works', 'consultancy', 'technology', 'maintenance'] 
      },
      required: true
    },
    
    // === SOURCING STRATEGY ===
    sourcing: {
      type: 'object',
      properties: {
        strategy: { 
          type: 'string', 
          enum: ['competitive_bidding', 'single_source', 'framework', 'spot_buy'], 
          required: true 
        },
        methods: { type: 'array', items: { type: 'string' } },
        suppliers: {
          type: 'object',
          properties: {
            preferred: { type: 'array', items: { type: 'string' } },
            blacklisted: { type: 'array', items: { type: 'string' } },
            qualification_criteria: { type: 'array', items: { type: 'object' } }
          }
        },
        sustainability: {
          type: 'object',
          properties: {
            requirements: { type: 'array', items: { type: 'string' } },
            certifications: { type: 'array', items: { type: 'string' } },
            targets: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    },
    
    // === COMPLIANCE ===
    compliance: {
      type: 'object',
      properties: {
        regulations: { type: 'array', items: { type: 'string' }, required: true },
        policies: { type: 'array', items: { type: 'string' }, required: true },
        approvalLevels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              threshold: { type: 'number', required: true },
              approvers: { type: 'array', items: { type: 'string' }, required: true },
              conditions: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        auditRequirements: { type: 'array', items: { type: 'string' } }
      }
    },
    
    // === RISK MANAGEMENT ===
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', required: true, maxLength: 200 },
          description: { type: 'string', required: true, maxLength: 1000 },
          category: { 
            type: 'string', 
            enum: ['financial', 'operational', 'regulatory', 'market', 'supplier'], 
            required: true 
          },
          probability: { 
            type: 'string', 
            enum: ['very_low', 'low', 'medium', 'high', 'very_high'], 
            required: true 
          },
          impact: { 
            type: 'string', 
            enum: ['negligible', 'minor', 'moderate', 'major', 'severe'], 
            required: true 
          },
          mitigation: { type: 'string', required: true, maxLength: 1000 },
          owner: { type: 'string', required: true },
          targetDate: { type: 'string', format: 'date' }
        }
      },
      default: []
    },
    
    // === MILESTONES ===
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', required: true, maxLength: 200 },
          description: { type: 'string', maxLength: 500 },
          targetDate: { type: 'string', format: 'date', required: true },
          dependencies: { type: 'array', items: { type: 'string' } },
          deliverables: { type: 'array', items: { type: 'string' } },
          status: { 
            type: 'string', 
            enum: ['pending', 'in_progress', 'completed', 'overdue'], 
            default: 'pending' 
          }
        }
      },
      default: []
    },
    
    // === NEW: STEP FIELDS (OPTIONAL) ===
    stepInfo: {
      type: 'object',
      properties: {
        referenceNumber: { type: 'string', maxLength: 50 },
        loanCreditNumber: { type: 'string', maxLength: 50 },
        component: { type: 'string', maxLength: 200 },
        reviewType: { 
          type: 'string', 
          enum: ['Prior', 'Post'], 
          default: 'Post' 
        },
        category: { 
          type: 'string', 
          enum: ['Goods', 'Works', 'Civil Works', 'Consulting Services', 'Non-Consulting Services'] 
        },
        procurementMethod: { 
          type: 'string', 
          enum: ['RFB', 'RFQ', 'DIR', 'QCBS', 'CQS', 'CDS', 'INDV'] 
        },
        marketApproach: { 
          type: 'string', 
          enum: ['Open - National', 'Open - International', 'Restricted'] 
        },
        prequalificationYN: { type: 'string', enum: ['Y', 'N'] },
        procurementProcess: { type: 'string', maxLength: 100 },
        evaluationMethod: { type: 'string', maxLength: 50 },
        estimatedAmountUSD: { type: 'number', min: 0 },
        unspscCode: { 
          type: 'string', 
          pattern: '^\\d{2}-\\d{2}-\\d{2}-\\d{2}$' 
        },
        highRiskFlag: { type: 'string', maxLength: 50 },
        procurementDocType: { type: 'string', maxLength: 100 },
        processStatus: { 
          type: 'string', 
          enum: ['Draft', 'Submitted', 'Under Review', 'Cleared', 'Signed', 'Canceled'], 
          default: 'Draft' 
        },
        activityStatus: { type: 'string', maxLength: 50 }
      }
    },
    
    // === METADATA ===
    attachments: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    isTemplate: { type: 'boolean', default: false },
    templateId: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    visibility: { type: 'string', enum: ['private', 'department', 'organization', 'public'], default: 'department' },
    workplanId: { type: 'string' }
  },
  
  update: {
    title: { type: 'string', minLength: 5, maxLength: 200 },
    description: { type: 'string', minLength: 20, maxLength: 2000 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    planOwner: { type: 'string' },
    stakeholders: { type: 'array', items: { type: 'string' } },
    budget: { type: 'object' },
    objectives: { type: 'array', items: { type: 'object' } },
    categories: { type: 'array', items: { type: 'string' } },
    sourcing: { type: 'object' },
    compliance: { type: 'object' },
    risks: { type: 'array', items: { type: 'object' } },
    milestones: { type: 'array', items: { type: 'object' } },
    stepInfo: { type: 'object' },
    attachments: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    visibility: { type: 'string', enum: ['private', 'department', 'organization', 'public'] }
  },
  
  query: {
    // === ORIGINAL FILTERS ===
    planType: { type: 'string', enum: ['annual', 'quarterly', 'project_based', 'emergency', 'strategic', 'operational'] },
    fiscalYear: { type: 'number', min: 2020, max: 2030 },
    department: { type: 'string' },
    planOwner: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'submitted', 'under_review', 'approved', 'active', 'completed', 'cancelled'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    category: { type: 'string', enum: ['goods', 'services', 'works', 'consultancy', 'technology', 'maintenance'] },
    budgetMin: { type: 'number', min: 0 },
    budgetMax: { type: 'number', min: 0 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    search: { type: 'string', minLength: 3, maxLength: 100 },
    tags: { type: 'string' },
    stakeholderId: { type: 'string' },
    isTemplate: { type: 'boolean' },
    hasRisks: { type: 'boolean' },
    isOverBudget: { type: 'boolean' },
    isOverdue: { type: 'boolean' },
    approvalStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
    complianceStatus: { type: 'string', enum: ['compliant', 'non_compliant', 'pending_review'] },
    includeArchived: { type: 'boolean', default: false },
    
    // === NEW: STEP FILTERS ===
    procurementMethod: { 
      type: 'string', 
      enum: ['RFB', 'RFQ', 'DIR', 'QCBS', 'CQS', 'CDS', 'INDV'] 
    },
    reviewType: { type: 'string', enum: ['Prior', 'Post'] },
    processStatus: { 
      type: 'string', 
      enum: ['Draft', 'Submitted', 'Under Review', 'Cleared', 'Signed', 'Canceled'] 
    },
    stepCategory: { 
      type: 'string', 
      enum: ['Goods', 'Works', 'Civil Works', 'Consulting Services', 'Non-Consulting Services'] 
    },
    workplanId: { type: 'string' },
    loanCreditNumber: { type: 'string' },
    
    // === PAGINATION ===
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 200, default: 20 },
    sortBy: { 
      type: 'string', 
      enum: ['createdAt', 'startDate', 'endDate', 'title', 'budget', 'status', 'priority'], 
      default: 'createdAt' 
    },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeBudgetDetails: { type: 'boolean', default: false },
    includeMetrics: { type: 'boolean', default: false }
  },
  
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  },
  
  approval: {
    action: { type: 'string', enum: ['approve', 'reject', 'request_changes'], required: true },
    comments: { type: 'string', maxLength: 1000 },
    conditions: { type: 'array', items: { type: 'string' } },
    budgetAdjustments: {
      type: 'object',
      properties: {
        totalAmount: { type: 'number', min: 0 },
        allocations: { type: 'array', items: { type: 'object' } }
      }
    },
    approvalLevel: { type: 'string', required: true },
    nextApprovers: { type: 'array', items: { type: 'string' } }
  },
  
  forecast: {
    period: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'], required: true },
    horizon: { type: 'number', min: 1, max: 60, required: true },
    assumptions: { type: 'array', items: { type: 'object' }, required: true },
    scenarios: { 
      type: 'array', 
      items: { 
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
          probability: { type: 'number', min: 0, max: 100 },
          adjustments: { type: 'object' }
        }
      }
    },
    includeInflation: { type: 'boolean', default: true },
    inflationRate: { type: 'number', min: 0, max: 50, default: 3 },
    includeRiskFactors: { type: 'boolean', default: true }
  },
  
  excelImport: {
    workplanId: { type: 'string', required: true },
    overwriteExisting: { type: 'boolean', default: false },
    validateOnly: { type: 'boolean', default: false }
  }
};

// ============================================
// EXCEL IMPORT ROUTES (NEW)
// ============================================

/**
 * @route   POST /api/plans/import/excel
 * @desc    Import procurement plans from Excel file (ERT format - all 7 sheets)
 * @access  Private - requires 'plans:import' permission
 */
router.post('/import/excel',
  verifyToken,
  checkPermission('plans:import'),
  upload.single('file'),
  validateBody(planValidation.excelImport),
  sanitize(),
  logCreate('plans'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded. Please attach an Excel file.'
      });
    }

    const { workplanId, overwriteExisting = false, validateOnly = false } = req.body;

    try {
      // Parse Excel workbook
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      
      // Check for required sheets (7 procurement methods)
      const requiredSheets = ['RFB', 'RFQ', 'DIR', 'QCBS', 'CQS', 'CDS', 'INDV'];
      const availableSheets = workbook.SheetNames;
      const missingSheets = requiredSheets.filter(sheet => !availableSheets.includes(sheet));
      
      if (missingSheets.length > 0) {
        logger.warn('Excel import: Some sheets missing', { 
          missingSheets,
          availableSheets,
          fileName: req.file.originalname
        });
      }

      // Parse all available sheets
      const workbookData = {};
      let totalRows = 0;

      availableSheets.forEach(sheetName => {
        if (requiredSheets.includes(sheetName)) {
          try {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            workbookData[sheetName] = rows;
            totalRows += rows.length;
            logger.info(`Parsed sheet: ${sheetName}`, { rowCount: rows.length });
          } catch (error) {
            logger.error(`Failed to parse sheet: ${sheetName}`, { error: error.message });
          }
        }
      });

      if (totalRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file contains no data. Please check the file format.'
        });
      }

      // Validate only mode (preview)
      if (validateOnly) {
        return res.json({
          success: true,
          message: 'Excel file validation successful',
          data: {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            totalRows,
            sheetsFound: Object.keys(workbookData).length,
            sheetCounts: Object.keys(workbookData).map(sheet => ({
              sheet,
              rowCount: workbookData[sheet].length
            })),
            missingSheets,
            preview: {
              RFB: workbookData.RFB?.slice(0, 3) || [],
              RFQ: workbookData.RFQ?.slice(0, 3) || [],
              QCBS: workbookData.QCBS?.slice(0, 3) || []
            }
          }
        });
      }

      // Import workbook
      logger.info('Starting Excel workbook import', { 
        workplanId, 
        totalRows,
        sheets: Object.keys(workbookData),
        userId: req.user.id
      });

      const result = await planService.importExcelWorkbook(
        workbookData,
        workplanId,
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          ...result.results,
          fileName: req.file.originalname,
          importedAt: new Date(),
          importedBy: req.user.id
        }
      });

    } catch (error) {
      logger.error('Excel import error', { 
        error: error.message,
        stack: error.stack,
        fileName: req.file?.originalname
      });
      
      res.status(500).json({
        success: false,
        message: 'Excel import failed',
        error: error.message,
        details: 'Please ensure the file follows the ERT Procurement Plan format'
      });
    }
  })
);

/**
 * @route   POST /api/plans/import/excel/single-sheet
 * @desc    Import single procurement method sheet from Excel
 * @access  Private - requires 'plans:import' permission
 */
router.post('/import/excel/single-sheet',
  verifyToken,
  checkPermission('plans:import'),
  upload.single('file'),
  validateBody({
    workplanId: { type: 'string', required: true },
    sheetName: { 
      type: 'string', 
      enum: ['RFB', 'RFQ', 'DIR', 'QCBS', 'CQS', 'CDS', 'INDV'], 
      required: true 
    }
  }),
  sanitize(),
  logCreate('plans'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded'
      });
    }

    const { workplanId, sheetName } = req.body;

    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      
      if (!workbook.Sheets[sheetName]) {
        return res.status(400).json({
          success: false,
          message: `Sheet '${sheetName}' not found in Excel file`,
          availableSheets: workbook.SheetNames
        });
      }

      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      logger.info(`Importing ${sheetName} sheet`, { 
        rowCount: sheetData.length,
        workplanId
      });

      const result = await planService.batchImportFromExcel(
        sheetData,
        { workplanId, sheetName },
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          ...result.results,
          sheetName,
          fileName: req.file.originalname
        }
      });

    } catch (error) {
      logger.error('Sheet import error', { 
        error: error.message,
        sheetName
      });
      
      res.status(500).json({
        success: false,
        message: 'Sheet import failed',
        error: error.message
      });
    }
  })
);

// ============================================
// STEP-SPECIFIC QUERY ROUTES (NEW)
// ============================================

/**
 * @route   GET /api/plans/by-method/:method
 * @desc    Get plans by procurement method (RFB/RFQ/DIR/QCBS/CQS/CDS/INDV)
 * @access  Private - requires 'plans:read' permission
 */
router.get('/by-method/:method',
  verifyToken,
  checkPermission('plans:read'),
  validateParams({
    method: { 
      type: 'string', 
      enum: ['RFB', 'RFQ', 'DIR', 'QCBS', 'CQS', 'CDS', 'INDV'], 
      required: true 
    }
  }),
  validateQuery({
    reviewType: { type: 'string', enum: ['Prior', 'Post'] },
    processStatus: { 
      type: 'string', 
      enum: ['Draft', 'Submitted', 'Under Review', 'Cleared', 'Signed', 'Canceled'] 
    },
    workplanId: { type: 'string' },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 }
  }),
  logView('plans', 'by-method'),
  asyncHandler(async (req, res) => {
    const { method } = req.params;
    const { reviewType, processStatus, workplanId, page, limit } = req.query;

    const result = await planService.getPlansByMethod(method, {
      reviewType,
      processStatus,
      workplanId
    }, req.user.id);

    res.json({
      success: true,
      procurementMethod: method,
      count: result.count,
      data: result.plans,
      filters: { reviewType, processStatus, workplanId }
    });
  })
);

/**
 * @route   GET /api/plans/pending-bank-approval
 * @desc    Get plans pending World Bank approval (Prior Review only)
 * @access  Private - requires 'plans:read' permission
 */
router.get('/pending-bank-approval',
  verifyToken,
  checkPermission('plans:read'),
  validateQuery({
    workplanId: { type: 'string' },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 }
  }),
  logView('plans', 'pending-bank-approval'),
  asyncHandler(async (req, res) => {
    const { workplanId } = req.query;

    const result = await planService.getPendingBankApproval(workplanId, req.user.id);

    res.json({
      success: true,
      count: result.count,
      workplanId: result.workplanId,
      data: result.plans,
      message: result.count > 0 
        ? `${result.count} plan(s) pending World Bank approval` 
        : 'No plans pending World Bank approval'
    });
  })
);

/**
 * @route   GET /api/plans/by-workplan/:workplanId
 * @desc    Get all plans for a specific workplan with comprehensive summary
 * @access  Private - requires 'plans:read' permission
 */
router.get('/by-workplan/:workplanId',
  verifyToken,
  checkPermission('plans:read'),
  validateParams({
    workplanId: { type: 'string', required: true }
  }),
  validateQuery({
    procurementMethod: { 
      type: 'string', 
      enum: ['RFB', 'RFQ', 'DIR', 'QCBS', 'CQS', 'CDS', 'INDV'] 
    },
    reviewType: { type: 'string', enum: ['Prior', 'Post'] },
    processStatus: { type: 'string' }
  }),
  logView('plans', 'by-workplan'),
  asyncHandler(async (req, res) => {
    const { workplanId } = req.params;
    const { procurementMethod, reviewType, processStatus } = req.query;

    const result = await planService.getPlansByWorkplan(workplanId, {
      procurementMethod,
      reviewType,
      processStatus
    }, req.user.id);

    res.json({
      success: true,
      workplanId: result.workplanId,
      count: result.count,
      summary: result.summary,
      data: result.plans
    });
  })
);

/**
 * @route   GET /api/plans/by-reference/:referenceNumber
 * @desc    Find plan by STEP reference number (e.g., OUL-10X-GO-2025-042)
 * @access  Private - requires 'plans:read' permission
 */
router.get('/by-reference/:referenceNumber',
  verifyToken,
  checkPermission('plans:read'),
  validateParams({
    referenceNumber: { type: 'string', required: true }
  }),
  logView('plans', 'by-reference'),
  asyncHandler(async (req, res) => {
    const { referenceNumber } = req.params;

    const result = await planService.findByReferenceNumber(referenceNumber, req.user.id);

    if (!result.plan) {
      return res.status(404).json({
        success: false,
        message: `Plan not found with reference number: ${referenceNumber}`
      });
    }

    res.json({
      success: true,
      referenceNumber,
      data: result.plan
    });
  })
);

/**
 * @route   GET /api/plans/analytics/step
 * @desc    Get STEP-specific analytics (methods, review types, compliance scores)
 * @access  Private - requires 'plans:read' permission
 */
router.get('/analytics/step',
  verifyToken,
  checkPermission('plans:read'),
  validateQuery({
    workplanId: { type: 'string' },
    fiscalYear: { type: 'number', min: 2020, max: 2030 },
    department: { type: 'string' }
  }),
  logView('plans', 'step-analytics'),
  asyncHandler(async (req, res) => {
    const { workplanId, fiscalYear, department } = req.query;

    const result = await planService.getSTEPAnalytics({
      workplanId,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      department
    }, req.user.id);

    res.json({
      success: true,
      analytics: result.analytics,
      metadata: {
        workplanId,
        fiscalYear,
        department,
        generatedAt: new Date()
      }
    });
  })
);

// ============================================
// CORE PLAN MANAGEMENT ROUTES (ENHANCED)
// ============================================

/**
 * @route   GET /api/plans
 * @desc    Get procurement plans with advanced filtering and analytics
 * @access  Private - requires 'plans:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('plans:read'),
  validateQuery(planValidation.query),
  sanitize(),
  logView('plans', 'list'),
  asyncHandler(async (req, res) => {
    const {
      // Original filters
      planType,
      fiscalYear,
      department,
      planOwner,
      status,
      priority,
      category,
      budgetMin,
      budgetMax,
      startDate,
      endDate,
      search,
      tags,
      stakeholderId,
      isTemplate,
      hasRisks,
      isOverBudget,
      isOverdue,
      approvalStatus,
      complianceStatus,
      includeArchived = false,
      
      // NEW: STEP filters
      procurementMethod,
      reviewType,
      processStatus,
      stepCategory,
      workplanId,
      loanCreditNumber,
      
      // Pagination
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeBudgetDetails = false,
      includeMetrics = false
    } = req.query;

    // Build filter criteria
    const filters = {
      planType,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      department,
      planOwner,
      status,
      priority,
      category,
      budget: {
        min: budgetMin ? parseFloat(budgetMin) : undefined,
        max: budgetMax ? parseFloat(budgetMax) : undefined
      },
      dateRange: {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
      },
      textSearch: search,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      stakeholderId,
      isTemplate: isTemplate !== undefined ? isTemplate === 'true' : undefined,
      hasRisks: hasRisks !== undefined ? hasRisks === 'true' : undefined,
      isOverBudget: isOverBudget !== undefined ? isOverBudget === 'true' : undefined,
      isOverdue: isOverdue !== undefined ? isOverdue === 'true' : undefined,
      approvalStatus,
      complianceStatus,
      includeArchived: includeArchived === 'true',
      
      // NEW: STEP filters
      procurementMethod,
      reviewType,
      processStatus,
      stepCategory,
      workplanId,
      loanCreditNumber
    };

    // Apply user-level filtering based on permissions
    if (!req.user.permissions.includes('plans:read:all')) {
      filters.$or = [
        { createdBy: req.user.id },
        { planOwner: req.user.id },
        { stakeholders: req.user.id },
        { 'approvalWorkflow.approvers': req.user.id },
        { visibility: { $in: ['department', 'organization', 'public'] } }
      ];
    }

    const result = await planService.getPlans(filters, req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      includeBudgetDetails: includeBudgetDetails === 'true',
      includeStakeholders: true,
      includeApprovalStatus: true,
      includeComplianceStatus: true,
      includeMilestones: true
    });

    // Get aggregated metrics if requested
    let metrics = null;
    if (includeMetrics === 'true') {
      metrics = await planService.getAggregatedMetrics(filters);
    }

    res.json({
      success: true,
      data: result.plans,
      pagination: result.pagination,
      summary: {
        ...result.summary,
        // NEW: STEP summary
        methodBreakdown: result.summary?.methodBreakdown,
        reviewTypeBreakdown: result.summary?.reviewTypeBreakdown
      },
      metrics,
      filters
    });
  })
);

/**
 * @route   POST /api/plans
 * @desc    Create new procurement plan (with STEP support)
 * @access  Private - requires 'plans:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('plans:create'),
  rateLimitByUser(20, '1h'),
  validateBody(planValidation.create),
  sanitize(),
  logCreate('plans'),
  asyncHandler(async (req, res) => {
    const planData = {
      ...req.body,
      createdBy: req.user.id,
      planNumber: await generatePlanNumber(req.body.planType, req.body.fiscalYear),
      status: 'draft',
      createdAt: new Date(),
      version: 1
    };

    // Validate date ranges
    if (new Date(planData.startDate) >= new Date(planData.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
        validationError: 'date_range'
      });
    }

    // Validate budget allocations
    if (planData.budget && planData.budget.allocations) {
      const totalAllocated = planData.budget.allocations.reduce(
        (sum, allocation) => sum + allocation.amount, 
        0
      );
      
      if (Math.abs(totalAllocated - planData.budget.totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'Budget allocations must sum to total budget amount',
          validationError: 'budget_allocation',
          expected: planData.budget.totalAmount,
          actual: totalAllocated,
          difference: totalAllocated - planData.budget.totalAmount
        });
      }
    }

    // NEW: Validate STEP fields if provided
    if (planData.stepInfo) {
      // Validate UNSPSC code format
      if (planData.stepInfo.unspscCode && 
          !/^\d{2}-\d{2}-\d{2}-\d{2}$/.test(planData.stepInfo.unspscCode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid UNSPSC code format. Must be XX-XX-XX-XX (e.g., 43-21-15-03)',
          validationError: 'unspsc_format'
        });
      }

      // Set default process status if not provided
      if (!planData.stepInfo.processStatus) {
        planData.stepInfo.processStatus = 'Draft';
      }

      // Ensure review type is set
      if (!planData.stepInfo.reviewType) {
        planData.stepInfo.reviewType = 'Post';
      }
    }

    // Validate stakeholders exist
    if (planData.stakeholders && planData.stakeholders.length > 0) {
      const stakeholderValidation = await planService.validateStakeholders(
        planData.stakeholders
      );
      
      if (!stakeholderValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: stakeholderValidation.message,
          validationError: 'invalid_stakeholders',
          invalidStakeholders: stakeholderValidation.invalidStakeholders
        });
      }
    }

    // Apply template if specified
    if (planData.templateId) {
      const template = await templateService.getPlanTemplate(planData.templateId);
      
      if (!template) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan template',
          validationError: 'template_not_found'
        });
      }
      
      planData.objectives = template.objectives || planData.objectives;
      planData.compliance = template.compliance || planData.compliance;
      planData.risks = template.risks || planData.risks;
      planData.milestones = template.milestones || planData.milestones;
    }

    // Set up approval workflow based on budget amount
    if (planData.budget && planData.budget.totalAmount) {
      planData.approvalWorkflow = await planService.setupApprovalWorkflow(
        planData.budget.totalAmount,
        planData.department,
        planData.compliance?.approvalLevels
      );
    }

    // Perform compliance checks
    if (planData.compliance) {
      const complianceCheck = await complianceService.validatePlan(planData);
      planData.complianceStatus = complianceCheck.status;
      planData.complianceIssues = complianceCheck.issues;
    }

    // Calculate risk scores
    if (planData.risks && planData.risks.length > 0) {
      const riskAssessment = await riskService.assessPlanRisks(planData.risks);
      planData.riskScore = riskAssessment.totalScore;
      planData.riskLevel = riskAssessment.level;
    }

    const plan = await planService.create(planData, req.user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Send notifications to stakeholders
    if (planData.stakeholders && planData.stakeholders.length > 0) {
      await notificationService.notifyPlanCreated(plan.plan.id, planData.stakeholders);
    }

    res.status(201).json({
      success: true,
      data: plan.plan,
      message: 'Procurement plan created successfully'
    });
  })
);

/**
 * @route   GET /api/plans/:id
 * @desc    Get procurement plan by ID with comprehensive details
 * @access  Private - requires 'plans:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['plans:read', 'plans:read:own']),
  validateParams(planValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'plans:read:all'),
  logView('plans', 'detail'),
  asyncHandler(async (req, res) => {
    const plan = await planService.getPlan(req.params.id, req.user.id, {
      includeStakeholders: true,
      includeBudgetDetails: true,
      includeApprovalHistory: true,
      includeComplianceStatus: true,
      includeRiskAssessment: true,
      includeMilestones: true,
      includeAttachments: true,
      includeAuditTrail: true,
      includeRelatedRFQs: true,
      includePerformanceMetrics: true
    });

    if (!plan || !plan.plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    res.json({
      success: true,
      data: plan.plan
    });
  })
);

/**
 * @route   PUT /api/plans/:id
 * @desc    Update procurement plan (with STEP support)
 * @access  Private - requires 'plans:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['plans:update', 'plans:update:own']),
  validateParams(planValidation.params),
  validateBody(planValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'createdBy', 'plans:update:all'),
  logUpdate('plans'),
  asyncHandler(async (req, res) => {
    const planId = req.params.id;
    const updates = req.body;

    const existingPlan = await planService.get(planId, req.user.id);
    
    if (!existingPlan || !existingPlan.plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const plan = existingPlan.plan;

    // Check if plan is in editable state
    const editableStates = ['draft', 'returned_for_changes'];
    if (!editableStates.includes(plan.status)) {
      return res.status(400).json({
        success: false,
        message: `Plan cannot be modified in '${plan.status}' status. Only drafts and plans returned for changes can be edited.`
      });
    }

    // Validate budget changes if provided
    if (updates.budget && updates.budget.allocations) {
      const totalAllocated = updates.budget.allocations.reduce(
        (sum, allocation) => sum + allocation.amount, 
        0
      );
      
      if (updates.budget.totalAmount && 
          Math.abs(totalAllocated - updates.budget.totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'Budget allocations must sum to total budget amount',
          validationError: 'budget_allocation'
        });
      }
    }

    // NEW: Validate STEP fields if updated
    if (updates.stepInfo && updates.stepInfo.unspscCode) {
      if (!/^\d{2}-\d{2}-\d{2}-\d{2}$/.test(updates.stepInfo.unspscCode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid UNSPSC code format. Must be XX-XX-XX-XX',
          validationError: 'unspsc_format'
        });
      }
    }

    // Re-run compliance checks if changed
    if (updates.compliance) {
      const complianceCheck = await complianceService.validatePlan({
        ...plan,
        ...updates
      });
      updates.complianceStatus = complianceCheck.status;
      updates.complianceIssues = complianceCheck.issues;
    }

    // Re-assess risks if changed
    if (updates.risks) {
      const riskAssessment = await riskService.assessPlanRisks(updates.risks);
      updates.riskScore = riskAssessment.totalScore;
      updates.riskLevel = riskAssessment.level;
    }

    const result = await planService.update(planId, updates, req.user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Send notifications for significant changes
    if (plan.stakeholders && plan.stakeholders.length > 0) {
      await notificationService.notifyPlanUpdated(planId, updates, plan.stakeholders);
    }

    res.json({
      success: true,
      data: result.plan,
      message: 'Procurement plan updated successfully'
    });
  })
);

/**
 * @route   POST /api/plans/:id/submit
 * @desc    Submit plan for approval (handles Prior/Post review routing)
 * @access  Private - requires 'plans:submit' permission
 */
router.post('/:id/submit',
  verifyToken,
  checkPermission('plans:submit'),
  validateParams(planValidation.params),
  validateBody({
    submissionNote: { type: 'string', maxLength: 1000 },
    urgentReview: { type: 'boolean', default: false },
    requestedApprovers: { type: 'array', items: { type: 'string' } }
  }),
  sanitize(),
  logStatusChange('plans'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { submissionNote, urgentReview = false, requestedApprovers } = req.body;

    const planResult = await planService.get(id, req.user.id);
    
    if (!planResult || !planResult.plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const plan = planResult.plan;

    if (plan.status !== 'draft' && plan.status !== 'returned_for_changes') {
      return res.status(400).json({
        success: false,
        message: `Plan is not in submittable state (current status: ${plan.status})`
      });
    }

    // Validate plan completeness
    const validationResult = await planService.validateForSubmission(id);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Plan validation failed. Please fix the following issues:',
        errors: validationResult.errors
      });
    }

    // Submit plan (handles Prior/Post review routing)
    const result = await planService.submitPlanForApproval(id, req.user.id, {
      reason: submissionNote,
      urgentReview,
      requestedApprovers
    });

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  })
);

// [Continue with all remaining original routes...]
// I'll include the complete routes in the full file

/**
 * @route   POST /api/plans/:id/approve
 * @desc    Approve or reject plan
 * @access  Private - requires 'plans:approve' permission
 */
router.post('/:id/approve',
  verifyToken,
  checkPermission('plans:approve'),
  validateParams(planValidation.params),
  validateBody(planValidation.approval),
  sanitize(),
  logApproval('plans'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      action,
      comments,
      conditions,
      budgetAdjustments,
      approvalLevel,
      nextApprovers
    } = req.body;

    const planResult = await planService.get(id, req.user.id);
    
    if (!planResult || !planResult.plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const plan = planResult.plan;

    // Check if user is authorized approver
    const isAuthorizedApprover = 
      plan.approvalWorkflow?.currentApprovers?.includes(req.user.id) ||
      req.user.permissions.includes('plans:approve:all');

    if (!isAuthorizedApprover) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this plan'
      });
    }

    const approvalData = {
      action,
      approvedBy: req.user.id,
      comments,
      conditions,
      budgetAdjustments,
      approvalLevel,
      nextApprovers,
      approvedAt: new Date()
    };

    const result = await approvalService.processApproval(id, approvalData);

    // Update plan status based on approval result
    let newStatus = plan.status;
    if (result.isFullyApproved) {
      newStatus = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'request_changes') {
      newStatus = 'returned_for_changes';
    } else if (result.hasMoreApprovals) {
      newStatus = 'under_review';
    }

    await planService.updateStatus(id, newStatus);

    // Send notifications
    await notificationService.notifyPlanApproval(id, result);

    res.json({
      success: true,
      data: result,
      message: `Plan ${action}ed successfully`
    });
  })
);

/**
 * @route   POST /api/plans/:id/activate
 * @desc    Activate approved plan
 * @access  Private - requires 'plans:activate' permission
 */
router.post('/:id/activate',
  verifyToken,
  checkPermission('plans:activate'),
  validateParams(planValidation.params),
  validateBody({
    activationNote: { type: 'string', maxLength: 500 },
    effectiveDate: { type: 'string', format: 'date' }
  }),
  sanitize(),
  logStatusChange('plans'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { activationNote, effectiveDate } = req.body;

    const planResult = await planService.get(id, req.user.id);
    
    if (!planResult || !planResult.plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const plan = planResult.plan;

    if (plan.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved plans can be activated'
      });
    }

    const activation = await planService.activate(id, {
      activatedBy: req.user.id,
      activationNote,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      activatedAt: new Date()
    });

    // Initialize budget tracking
    await budgetService.initializePlanBudget(id, plan.budget);

    // Create initial milestones
    await planService.createPlanMilestones(id);

    // Send activation notifications
    await notificationService.notifyPlanActivated(id, plan.stakeholders);

    res.json({
      success: true,
      data: activation,
      message: 'Plan activated successfully'
    });
  })
);

/**
 * @route   GET /api/plans/:id/budget
 * @desc    Get detailed budget information and tracking
 * @access  Private - requires 'plans:read' permission
 */
router.get('/:id/budget',
  verifyToken,
  checkPermission('plans:read'),
  validateParams(planValidation.params),
  validateQuery({
    includeTransactions: { type: 'boolean', default: false },
    includeForecasting: { type: 'boolean', default: false },
    includeTrends: { type: 'boolean', default: false }
  }),
  logView('plans', 'budget'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      includeTransactions = false, 
      includeForecasting = false, 
      includeTrends = false 
    } = req.query;

    const planResult = await planService.get(id, req.user.id);
    
    if (!planResult || !planResult.plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const budgetData = await budgetService.getPlanBudget(id, {
      includeTransactions: includeTransactions === 'true',
      includeAllocations: true,
      includeVarianceAnalysis: true,
      includeSpendingHistory: true
    });

    let forecasting = null;
    if (includeForecasting === 'true') {
      forecasting = await forecastService.generateBudgetForecast(id);
    }

    let trends = null;
    if (includeTrends === 'true') {
      trends = await budgetService.getBudgetTrends(id);
    }

    res.json({
      success: true,
      data: {
        budget: budgetData,
        forecasting,
        trends,
        utilization: calculateBudgetVariance(budgetData),
        alerts: await budgetService.getBudgetAlerts(id)
      }
    });
  })
);

/**
 * @route   POST /api/plans/:id/forecast
 * @desc    Generate budget and timeline forecasting
 * @access  Private - requires 'plans:forecast' permission
 */
router.post('/:id/forecast',
  verifyToken,
  checkPermission('plans:forecast'),
  validateParams(planValidation.params),
  validateBody(planValidation.forecast),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const forecastParams = req.body;

    const planResult = await planService.get(id, req.user.id);
    
    if (!planResult || !planResult.plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const plan = planResult.plan;

    const forecast = await forecastService.generateComprehensiveForecast(id, {
      ...forecastParams,
      baseBudget: plan.budget,
      currentSpending: plan.budget?.spentAmount || 0,
      planDuration: new Date(plan.endDate) - new Date(plan.startDate),
      riskFactors: plan.risks
    });

    res.json({
      success: true,
      data: forecast,
      message: 'Forecast generated successfully'
    });
  })
);

/**
 * @route   GET /api/plans/analytics/dashboard
 * @desc    Get procurement planning analytics dashboard
 * @access  Private - requires 'plans:read' permission
 */
router.get('/analytics/dashboard',
  verifyToken,
  checkPermission('plans:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['30d', '90d', '180d', '1y'], default: '90d' },
    department: { type: 'string' },
    fiscalYear: { type: 'number', min: 2020, max: 2030 }
  }),
  logView('plans', 'analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '90d', department, fiscalYear } = req.query;

    const analytics = await reportingService.getPlanningAnalytics({
      timeframe,
      department,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      userId: req.user.permissions.includes('plans:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   GET /api/plans/templates
 * @desc    Get procurement plan templates
 * @access  Private - requires 'plans:read' permission
 */
router.get('/templates',
  verifyToken,
  checkPermission('plans:read'),
  validateQuery({
    planType: { 
      type: 'string', 
      enum: ['annual', 'quarterly', 'project_based', 'emergency', 'strategic', 'operational'] 
    },
    department: { type: 'string' },
    isPublic: { type: 'boolean' }
  }),
  logView('plans', 'templates'),
  asyncHandler(async (req, res) => {
    const { planType, department, isPublic } = req.query;

    const templates = await templateService.getPlanTemplates({
      planType,
      department,
      isPublic: isPublic === 'true',
      userId: req.user.id
    });

    res.json({
      success: true,
      data: templates
    });
  })
);

/**
 * @route   POST /api/plans/:id/clone
 * @desc    Clone existing plan as template or new plan
 * @access  Private - requires 'plans:create' permission
 */
router.post('/:id/clone',
  verifyToken,
  checkPermission('plans:create'),
  validateParams(planValidation.params),
  validateBody({
    title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
    asTemplate: { type: 'boolean', default: false },
    fiscalYear: { type: 'number', min: 2020, max: 2030 },
    adjustBudget: { type: 'number', min: 0 },
    adjustDates: { type: 'boolean', default: true }
  }),
  sanitize(),
  logCreate('plans'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      title, 
      asTemplate = false, 
      fiscalYear, 
      adjustBudget, 
      adjustDates = true 
    } = req.body;

    const originalPlan = await planService.get(id, req.user.id);
    
    if (!originalPlan || !originalPlan.plan) {
      return res.status(404).json({
        success: false,
        message: 'Original plan not found'
      });
    }

    const clonedPlan = await planService.clone(id, {
      title,
      asTemplate,
      fiscalYear,
      adjustBudget,
      adjustDates,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: clonedPlan,
      message: `Plan ${asTemplate ? 'template' : 'copy'} created successfully`
    });
  })
);

/**
 * @route   DELETE /api/plans/:id
 * @desc    Archive/delete procurement plan
 * @access  Private - requires 'plans:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['plans:delete', 'plans:delete:own']),
  validateParams(planValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'plans:delete:all'),
  logDelete('plans'),
  asyncHandler(async (req, res) => {
    const planId = req.params.id;

    const planResult = await planService.get(planId, req.user.id);
    
    if (!planResult || !planResult.plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const plan = planResult.plan;

    // Check if plan can be deleted
    const deletableStates = ['draft', 'rejected'];
    const canArchive = ['approved', 'active', 'completed'];
    
    if (deletableStates.includes(plan.status)) {
      // Soft delete
      await planService.softDelete(planId, {
        deletedBy: req.user.id,
        reason: req.body.reason || 'Deleted by user'
      });
    } else if (canArchive.includes(plan.status)) {
      // Archive instead of delete
      await planService.archive(planId, {
        archivedBy: req.user.id,
        reason: req.body.reason || 'Archived by user'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Plan cannot be deleted in '${plan.status}' status`
      });
    }

    res.json({
      success: true,
      message: `Plan ${deletableStates.includes(plan.status) ? 'deleted' : 'archived'} successfully`
    });
  })
);

module.exports = router;