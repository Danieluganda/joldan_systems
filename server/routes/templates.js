const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Middleware imports
const { verifyToken, checkPermissions, checkRole } = require('../middleware/auth');
const { validateInput, sanitizeInput } = require('../middleware/validation');
const { handleAsync } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logBulkOperation } = require('../middleware/auditLogger');

// Service imports
const templateService = require('../services/templateService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for template file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/templates'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.docx', '.pdf', '.xlsx', '.html', '.json', '.xml'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExt} not allowed for templates`));
    }
  }
});

// Rate limiting for template operations
const templateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many template requests, please try again later' }
});

const createTemplateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many template creation requests' }
});

// Validation schemas for template operations
const templateValidation = [
  body('name').isLength({ min: 2, max: 100 }).withMessage('Template name must be 2-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('category').isIn(['procurement', 'contract', 'evaluation', 'award', 'document', 'report', 'notification', 'workflow']).withMessage('Invalid category'),
  body('type').isIn(['document', 'email', 'report', 'form', 'workflow', 'notification']).withMessage('Invalid template type'),
  body('status').optional().isIn(['draft', 'active', 'inactive', 'archived']).withMessage('Invalid status'),
  body('version').optional().isNumeric().withMessage('Version must be numeric'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('variables').optional().isArray().withMessage('Variables must be an array'),
  body('content').optional().isObject().withMessage('Content must be an object'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  body('permissions').optional().isObject().withMessage('Permissions must be an object')
];

// GET /templates - List templates with advanced filtering and pagination
router.get('/', 
  templateLimiter,
  verifyToken,
  checkPermissions(['template:read', 'template:admin']),
  handleAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      type,
      status = 'active',
      tags,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      includeArchived = false,
      owner,
      createdAfter,
      createdBefore,
      version,
      hasVariables,
      isPublic
    } = req.query;

    // Build filter object
    const filters = {
      ...(category && { category }),
      ...(type && { type }),
      ...(status && { status: includeArchived === 'true' ? { $in: status.split(',') } : status }),
      ...(tags && { tags: { $in: tags.split(',') } }),
      ...(owner && { 'metadata.owner': owner }),
      ...(version && { version: parseFloat(version) }),
      ...(hasVariables === 'true' && { 'variables.0': { $exists: true } }),
      ...(isPublic !== undefined && { 'permissions.public': isPublic === 'true' }),
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ]
      }),
      ...((createdAfter || createdBefore) && {
        createdAt: {
          ...(createdAfter && { $gte: new Date(createdAfter) }),
          ...(createdBefore && { $lte: new Date(createdBefore) })
        }
      })
    };

    // Authorization: Users can only see public templates or their own unless admin
    if (!req.user.permissions.includes('template:admin')) {
      filters.$or = [
        { 'permissions.public': true },
        { 'metadata.owner': req.user.id },
        { 'permissions.users': req.user.id },
        { 'permissions.roles': { $in: req.user.roles } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    };

    const result = await templateService.listTemplates(filters, options);
    
    // Log template access
    await logView(req.user.id, 'Template', null, { 
      filters, 
      resultCount: result.templates.length,
      page: options.page,
      limit: options.limit
    });

    res.json({
      success: true,
      data: result.templates,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      },
      filters: {
        category,
        type,
        status,
        tags: tags ? tags.split(',') : undefined,
        search,
        includeArchived
      }
    });
  })
);

// POST /templates - Create new template with file upload support
router.post('/', 
  createTemplateLimiter,
  verifyToken,
  checkPermissions(['template:create', 'template:admin']),
  upload.array('templateFiles', 5),
  templateValidation,
  validateInput,
  sanitizeInput,
  handleAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const templateData = {
      ...req.body,
      metadata: {
        ...req.body.metadata,
        owner: req.user.id,
        createdBy: req.user.id,
        department: req.user.department,
        organization: req.user.organization
      },
      version: 1.0,
      status: req.body.status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      templateData.files = req.files.map(file => ({
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      }));
    }

    // Set default permissions if not provided
    if (!templateData.permissions) {
      templateData.permissions = {
        public: false,
        users: [req.user.id],
        roles: req.user.roles,
        departments: [req.user.department]
      };
    }

    const template = await templateService.createTemplate(templateData);

    // Log template creation
    await logCreate(req.user.id, 'Template', template._id, {
      name: template.name,
      category: template.category,
      type: template.type,
      hasFiles: !!(req.files && req.files.length > 0)
    });

    // Send notification for new template
    if (template.permissions.public || template.category === 'procurement') {
      await notificationService.sendNotification({
        type: 'template_created',
        title: 'New Template Available',
        message: `New ${template.category} template "${template.name}" has been created`,
        priority: 'low',
        recipients: await templateService.getNotificationRecipients(template),
        data: { templateId: template._id, category: template.category }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  })
);

// GET /templates/categories - Get available template categories with counts
router.get('/categories',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:read', 'template:admin']),
  handleAsync(async (req, res) => {
    const categories = await templateService.getTemplateCategories(req.user);
    
    res.json({
      success: true,
      data: categories
    });
  })
);

// GET /templates/variables/:id - Get template variables and their usage
router.get('/variables/:id',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:read', 'template:admin']),
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id, req.user);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const variables = await templateService.getTemplateVariables(template);
    
    res.json({
      success: true,
      data: {
        templateId: id,
        templateName: template.name,
        variables: variables,
        usage: await templateService.getVariableUsage(id)
      }
    });
  })
);

// GET /templates/:id - Get specific template with detailed information
router.get('/:id', 
  templateLimiter,
  verifyToken,
  checkPermissions(['template:read', 'template:admin']),
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { 
      includeContent = false,
      includeVersions = false,
      includeUsage = false,
      includePreview = false 
    } = req.query;

    const template = await templateService.getTemplateById(id, req.user, {
      includeContent: includeContent === 'true',
      includeVersions: includeVersions === 'true',
      includeUsage: includeUsage === 'true',
      includePreview: includePreview === 'true'
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    // Log template view
    await logView(req.user.id, 'Template', id, {
      includedOptions: { includeContent, includeVersions, includeUsage, includePreview }
    });

    res.json({
      success: true,
      data: template
    });
  })
);

// POST /templates/:id/duplicate - Create a copy of existing template
router.post('/:id/duplicate',
  createTemplateLimiter,
  verifyToken,
  checkPermissions(['template:create', 'template:admin']),
  [
    body('name').optional().isLength({ min: 2, max: 100 }).withMessage('New name must be 2-100 characters'),
    body('copyContent').optional().isBoolean().withMessage('copyContent must be boolean'),
    body('copyFiles').optional().isBoolean().withMessage('copyFiles must be boolean')
  ],
  validateInput,
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { name, copyContent = true, copyFiles = false } = req.body;

    const originalTemplate = await templateService.getTemplateById(id, req.user, { includeContent: true });
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const duplicatedTemplate = await templateService.duplicateTemplate(originalTemplate, {
      newName: name || `${originalTemplate.name} (Copy)`,
      copyContent,
      copyFiles,
      userId: req.user.id
    });

    // Log template duplication
    await logCreate(req.user.id, 'Template', duplicatedTemplate._id, {
      action: 'duplicate',
      originalTemplateId: id,
      originalTemplateName: originalTemplate.name,
      copyContent,
      copyFiles
    });

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: duplicatedTemplate
    });
  })
);

// PUT /templates/:id - Update template with version control
router.put('/:id', 
  templateLimiter,
  verifyToken,
  checkPermissions(['template:update', 'template:admin']),
  upload.array('templateFiles', 5),
  templateValidation.map(validation => validation.optional()),
  validateInput,
  sanitizeInput,
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { versionNote, majorVersion = false } = req.body;

    const existingTemplate = await templateService.getTemplateById(id, req.user);
    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Authorization check for template modification
    const canModify = req.user.permissions.includes('template:admin') || 
                     existingTemplate.metadata.owner === req.user.id ||
                     (existingTemplate.permissions.editors && 
                      existingTemplate.permissions.editors.includes(req.user.id));

    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to modify this template'
      });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      lastModifiedBy: req.user.id
    };

    // Handle version increment
    if (majorVersion) {
      updateData.version = Math.floor(existingTemplate.version) + 1.0;
    } else {
      updateData.version = existingTemplate.version + 0.1;
    }

    // Handle file updates
    if (req.files && req.files.length > 0) {
      updateData.files = [
        ...(existingTemplate.files || []),
        ...req.files.map(file => ({
          originalName: file.originalname,
          fileName: file.filename,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        }))
      ];
    }

    const updatedTemplate = await templateService.updateTemplate(id, updateData, {
      versionNote,
      userId: req.user.id,
      keepHistory: true
    });

    // Log template update
    await logUpdate(req.user.id, 'Template', id, updateData, existingTemplate, {
      versionNote,
      majorVersion,
      hasNewFiles: !!(req.files && req.files.length > 0)
    });

    // Send notification for significant updates
    if (majorVersion || existingTemplate.permissions.public) {
      await notificationService.sendNotification({
        type: 'template_updated',
        title: 'Template Updated',
        message: `Template "${updatedTemplate.name}" has been updated to version ${updatedTemplate.version}`,
        priority: majorVersion ? 'medium' : 'low',
        recipients: await templateService.getNotificationRecipients(updatedTemplate),
        data: { 
          templateId: id, 
          version: updatedTemplate.version, 
          majorVersion,
          versionNote 
        }
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate
    });
  })
);

// POST /templates/:id/publish - Publish template to make it available
router.post('/:id/publish',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:publish', 'template:admin']),
  [
    body('publishNote').optional().isLength({ max: 500 }).withMessage('Publish note too long'),
    body('notifyUsers').optional().isBoolean().withMessage('notifyUsers must be boolean')
  ],
  validateInput,
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { publishNote, notifyUsers = true } = req.body;

    const template = await templateService.getTemplateById(id, req.user);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (template.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Template is already published'
      });
    }

    const publishedTemplate = await templateService.publishTemplate(id, {
      publishNote,
      publishedBy: req.user.id,
      publishedAt: new Date()
    });

    // Log template publication
    await logUpdate(req.user.id, 'Template', id, { status: 'active' }, template, {
      action: 'publish',
      publishNote
    });

    // Send notifications
    if (notifyUsers) {
      await notificationService.sendNotification({
        type: 'template_published',
        title: 'Template Published',
        message: `Template "${publishedTemplate.name}" is now available for use`,
        priority: 'medium',
        recipients: await templateService.getNotificationRecipients(publishedTemplate),
        data: { templateId: id, publishNote }
      });
    }

    res.json({
      success: true,
      message: 'Template published successfully',
      data: publishedTemplate
    });
  })
);

// POST /templates/:id/archive - Archive template
router.post('/:id/archive',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:delete', 'template:admin']),
  [
    body('archiveReason').isLength({ min: 5, max: 500 }).withMessage('Archive reason required (5-500 characters)')
  ],
  validateInput,
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { archiveReason } = req.body;

    const template = await templateService.getTemplateById(id, req.user);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const archivedTemplate = await templateService.archiveTemplate(id, {
      archiveReason,
      archivedBy: req.user.id,
      archivedAt: new Date()
    });

    // Log template archival
    await logUpdate(req.user.id, 'Template', id, { status: 'archived' }, template, {
      action: 'archive',
      archiveReason
    });

    res.json({
      success: true,
      message: 'Template archived successfully',
      data: archivedTemplate
    });
  })
);

// POST /templates/:id/restore - Restore archived template
router.post('/:id/restore',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:update', 'template:admin']),
  handleAsync(async (req, res) => {
    const { id } = req.params;

    const template = await templateService.getTemplateById(id, req.user, { includeArchived: true });
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (template.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Template is not archived'
      });
    }

    const restoredTemplate = await templateService.restoreTemplate(id, {
      restoredBy: req.user.id,
      restoredAt: new Date()
    });

    // Log template restoration
    await logUpdate(req.user.id, 'Template', id, { status: 'draft' }, template, {
      action: 'restore'
    });

    res.json({
      success: true,
      message: 'Template restored successfully',
      data: restoredTemplate
    });
  })
);

// DELETE /templates/:id - Soft delete template with confirmation
router.delete('/:id', 
  templateLimiter,
  verifyToken,
  checkPermissions(['template:delete', 'template:admin']),
  [
    body('deleteReason').isLength({ min: 5, max: 500 }).withMessage('Delete reason required (5-500 characters)'),
    body('confirmDelete').equals('true').withMessage('Delete confirmation required')
  ],
  validateInput,
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { deleteReason } = req.body;

    const template = await templateService.getTemplateById(id, req.user);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if template is in use
    const usageCount = await templateService.getTemplateUsageCount(id);
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete template that is currently in use (${usageCount} active uses)`,
        data: { usageCount }
      });
    }

    await templateService.deleteTemplate(id, {
      deleteReason,
      deletedBy: req.user.id,
      deletedAt: new Date()
    });

    // Log template deletion
    await logDelete(req.user.id, 'Template', id, template, { deleteReason });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  })
);

// POST /templates/render/:id - Render template with provided variables
router.post('/render/:id',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:use', 'template:admin']),
  [
    body('variables').isObject().withMessage('Variables must be an object'),
    body('format').optional().isIn(['html', 'pdf', 'docx', 'plain']).withMessage('Invalid output format'),
    body('preview').optional().isBoolean().withMessage('Preview must be boolean')
  ],
  validateInput,
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { variables, format = 'html', preview = false } = req.body;

    const template = await templateService.getTemplateById(id, req.user, { includeContent: true });
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (template.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Template is not active and cannot be rendered'
      });
    }

    const renderedContent = await templateService.renderTemplate(template, variables, {
      format,
      preview,
      userId: req.user.id
    });

    // Log template usage (only for non-preview renders)
    if (!preview) {
      await logView(req.user.id, 'Template', id, {
        action: 'render',
        format,
        variableCount: Object.keys(variables).length
      });

      // Track template usage statistics
      await templateService.trackTemplateUsage(id, req.user.id);
    }

    res.json({
      success: true,
      data: {
        templateId: id,
        templateName: template.name,
        renderedContent,
        format,
        preview,
        timestamp: new Date()
      }
    });
  })
);

// GET /templates/:id/versions - Get template version history
router.get('/:id/versions',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:read', 'template:admin']),
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const template = await templateService.getTemplateById(id, req.user);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const versions = await templateService.getTemplateVersions(id, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    });

    res.json({
      success: true,
      data: versions
    });
  })
);

// GET /templates/:id/usage - Get template usage analytics
router.get('/:id/usage',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:read', 'template:admin']),
  handleAsync(async (req, res) => {
    const { id } = req.params;
    const { period = '30d', includeDetails = false } = req.query;

    const template = await templateService.getTemplateById(id, req.user);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const usage = await templateService.getTemplateUsageAnalytics(id, {
      period,
      includeDetails: includeDetails === 'true'
    });

    res.json({
      success: true,
      data: {
        templateId: id,
        templateName: template.name,
        period,
        ...usage
      }
    });
  })
);

// POST /templates/bulk/delete - Bulk delete templates
router.post('/bulk/delete',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:delete', 'template:admin']),
  [
    body('templateIds').isArray({ min: 1, max: 50 }).withMessage('Template IDs array required (1-50 items)'),
    body('deleteReason').isLength({ min: 5, max: 500 }).withMessage('Delete reason required (5-500 characters)'),
    body('confirmDelete').equals('true').withMessage('Delete confirmation required')
  ],
  validateInput,
  handleAsync(async (req, res) => {
    const { templateIds, deleteReason } = req.body;

    // Validate all templates exist and user has permission
    const templates = await templateService.getTemplatesByIds(templateIds, req.user);
    const foundIds = templates.map(t => t._id.toString());
    const missingIds = templateIds.filter(id => !foundIds.includes(id));

    if (missingIds.length > 0) {
      return res.status(404).json({
        success: false,
        message: 'Some templates not found or access denied',
        data: { missingIds }
      });
    }

    // Check for templates in use
    const templatesInUse = [];
    for (const template of templates) {
      const usageCount = await templateService.getTemplateUsageCount(template._id);
      if (usageCount > 0) {
        templatesInUse.push({
          id: template._id,
          name: template.name,
          usageCount
        });
      }
    }

    if (templatesInUse.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some templates are currently in use and cannot be deleted',
        data: { templatesInUse }
      });
    }

    const result = await templateService.bulkDeleteTemplates(templateIds, {
      deleteReason,
      deletedBy: req.user.id
    });

    // Log bulk operation
    await logBulkOperation(req.user.id, 'Template', 'delete', {
      templateIds,
      deleteReason,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.successCount} templates`,
      data: result
    });
  })
);

// POST /templates/export - Export templates
router.post('/export',
  templateLimiter,
  verifyToken,
  checkPermissions(['template:read', 'template:admin']),
  [
    body('templateIds').optional().isArray({ max: 100 }).withMessage('Too many templates for export'),
    body('format').isIn(['json', 'csv', 'xlsx']).withMessage('Invalid export format'),
    body('includeContent').optional().isBoolean().withMessage('includeContent must be boolean'),
    body('includeFiles').optional().isBoolean().withMessage('includeFiles must be boolean')
  ],
  validateInput,
  handleAsync(async (req, res) => {
    const { 
      templateIds, 
      format = 'json',
      includeContent = false,
      includeFiles = false,
      filters = {}
    } = req.body;

    let templates;
    if (templateIds) {
      templates = await templateService.getTemplatesByIds(templateIds, req.user, {
        includeContent,
        includeFiles
      });
    } else {
      // Export based on filters
      const result = await templateService.listTemplates({
        ...filters,
        // Apply user permission filters
        ...(req.user.permissions.includes('template:admin') ? {} : {
          $or: [
            { 'permissions.public': true },
            { 'metadata.owner': req.user.id },
            { 'permissions.users': req.user.id },
            { 'permissions.roles': { $in: req.user.roles } }
          ]
        })
      }, { 
        page: 1, 
        limit: 1000,
        includeContent,
        includeFiles
      });
      templates = result.templates;
    }

    const exportData = await templateService.exportTemplates(templates, {
      format,
      includeContent,
      includeFiles,
      userId: req.user.id
    });

    // Log export operation
    await logView(req.user.id, 'Template', null, {
      action: 'export',
      format,
      templateCount: templates.length,
      includeContent,
      includeFiles
    });

    res.json({
      success: true,
      data: exportData,
      metadata: {
        exportedAt: new Date(),
        format,
        templateCount: templates.length,
        includeContent,
        includeFiles
      }
    });
  })
);

module.exports = router;
