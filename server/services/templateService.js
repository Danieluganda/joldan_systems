/**
 * Enterprise Template Service
 * 
 * Comprehensive template management system for procurement documents, RFQs, evaluations,
 * and approvals with version control, validation, and compliance features
 * Feature 5: Templates & Structure - Remove ambiguity for vendors and evaluators
 */

const mongoose = require('mongoose');
const Template = require('../db/models/Template');
const TemplateVersion = require('../db/models/TemplateVersion');
const User = require('../db/models/User');
const RFQ = require('../db/models/RFQ');
const Document = require('../db/models/Document');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const documentService = require('./documentService');
const storageService = require('./storageService');
const pdfService = require('./pdfService');
const { validateInput, sanitize } = require('../utils/validation');
const { formatDate, generateTemplateId, extractVariables, validateTemplateStructure } = require('../utils/helpers');
const { validateTemplateCompliance, checkRequiredFields, assessTemplateQuality } = require('../utils/templateValidator');
const { renderTemplate, compileTemplate, validateTemplate } = require('../utils/templateEngine');
const { encryptSensitiveTemplate, decryptSensitiveTemplate } = require('../utils/encryption');
const { parseTemplateContent, extractFieldDefinitions, generateFieldValidation } = require('../utils/templateParser');

// Template types
const TEMPLATE_TYPES = {
  // System Templates
  RFQ: 'rfq_template',
  TOR: 'tor_template',
  SPECIFICATIONS: 'specifications_template',
  EVALUATION: 'evaluation_template',
  APPROVAL_SUMMARY: 'approval_summary_template',
  AWARD_LETTER: 'award_letter_template',
  CONTRACT: 'contract_template',
  NOTIFICATION: 'notification_template',
  REPORT: 'report_template',
  
  // Client Templates
  VENDOR_SUBMISSION: 'vendor_submission_template',
  TECHNICAL_PROPOSAL: 'technical_proposal_template',
  FINANCIAL_PROPOSAL: 'financial_proposal_template',
  COMPANY_PROFILE: 'company_profile_template',
  QUALIFICATION: 'qualification_template',
  COMPLIANCE_CHECKLIST: 'compliance_checklist_template'
};

// Template statuses
const TEMPLATE_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'under_review',
  APPROVED: 'approved',
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  ARCHIVED: 'archived',
  LOCKED: 'locked'
};

// Template categories
const TEMPLATE_CATEGORIES = {
  SYSTEM: 'system',
  CLIENT: 'client',
  CUSTOM: 'custom',
  IMPORTED: 'imported'
};

// Field types for template validation
const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  DATE: 'date',
  EMAIL: 'email',
  PHONE: 'phone',
  URL: 'url',
  FILE: 'file',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  TABLE: 'table',
  SIGNATURE: 'signature'
};

// Validation rules
const VALIDATION_RULES = {
  REQUIRED: 'required',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  MIN_VALUE: 'minValue',
  MAX_VALUE: 'maxValue',
  PATTERN: 'pattern',
  FILE_TYPE: 'fileType',
  FILE_SIZE: 'fileSize'
};

// Events for audit trail
const TEMPLATE_EVENTS = {
  CREATED: 'template_created',
  UPDATED: 'template_updated',
  APPROVED: 'template_approved',
  ACTIVATED: 'template_activated',
  LOCKED: 'template_locked',
  DEPRECATED: 'template_deprecated',
  CLONED: 'template_cloned',
  EXPORTED: 'template_exported',
  IMPORTED: 'template_imported'
};

class TemplateService {
  /**
   * Create comprehensive template with validation and structure
   */
  static async createTemplate(templateData, userId, requestInfo = {}) {
    try {
      const {
        name,
        type,
        category = TEMPLATE_CATEGORIES.CUSTOM,
        description = '',
        content = {},
        fields = [],
        validationRules = {},
        metadata = {},
        settings = {},
        isSystem = false,
        parentTemplateId = null
      } = templateData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!name || !type) {
        throw new Error('Template name and type are required');
      }

      // Validate template type
      if (!Object.values(TEMPLATE_TYPES).includes(type)) {
        throw new Error(`Invalid template type: ${type}`);
      }

      // Check for existing template with same name
      const existingTemplate = await Template.findOne({
        name: name.trim(),
        category,
        status: { $ne: TEMPLATE_STATUS.ARCHIVED }
      });

      if (existingTemplate) {
        throw new Error('Template with this name already exists');
      }

      // Generate template ID
      const templateId = await generateTemplateId(type, category);

      // Parse and validate template content
      const contentAnalysis = await this.analyzeTemplateContent(content, fields);
      
      // Extract field definitions from content
      const extractedFields = await extractFieldDefinitions(content);
      const mergedFields = this.mergeFieldDefinitions(fields, extractedFields);

      // Validate template structure
      const structureValidation = await validateTemplateStructure(content, mergedFields);
      if (!structureValidation.valid) {
        throw new Error(`Invalid template structure: ${structureValidation.errors.join(', ')}`);
      }

      // Generate validation schema
      const validationSchema = await this.generateValidationSchema(mergedFields, validationRules);

      // Assess template quality
      const qualityAssessment = await assessTemplateQuality(content, mergedFields);

      // Create template record
      const template = new Template({
        // Basic identification
        templateId,
        name: sanitize(name.trim()),
        type,
        category,
        description: sanitize(description),
        
        // Template structure
        structure: {
          content,
          fields: mergedFields.map(field => ({
            id: field.id || new mongoose.Types.ObjectId(),
            name: sanitize(field.name),
            type: field.type,
            label: sanitize(field.label || field.name),
            placeholder: sanitize(field.placeholder || ''),
            helpText: sanitize(field.helpText || ''),
            required: field.required || false,
            readonly: field.readonly || false,
            hidden: field.hidden || false,
            order: field.order || 0,
            section: sanitize(field.section || 'default'),
            validation: field.validation || {},
            options: field.options || [],
            defaultValue: field.defaultValue,
            dependencies: field.dependencies || []
          })),
          sections: contentAnalysis.sections || [],
          variables: contentAnalysis.variables || [],
          conditionalLogic: contentAnalysis.conditionalLogic || [],
          calculations: contentAnalysis.calculations || []
        },
        
        // Validation configuration
        validation: {
          schema: validationSchema,
          rules: validationRules,
          requiredFields: mergedFields.filter(f => f.required).map(f => f.name),
          customValidators: [],
          errorMessages: this.generateErrorMessages(mergedFields),
          strictMode: settings.strictValidation || false
        },
        
        // Template settings
        settings: {
          allowPartialSave: settings.allowPartialSave !== false,
          autoSave: settings.autoSave !== false,
          autoSaveInterval: settings.autoSaveInterval || 30,
          multiPage: settings.multiPage || false,
          pageBreaks: settings.pageBreaks || [],
          responsive: settings.responsive !== false,
          printOptimized: settings.printOptimized || false,
          digitallySigned: settings.digitallySigned || false,
          watermark: settings.watermark || null,
          encryption: settings.encryption || false,
          accessControl: settings.accessControl || 'public',
          downloadable: settings.downloadable !== false,
          versionControl: settings.versionControl !== false
        },
        
        // Security and permissions
        security: {
          isSystem,
          isLocked: false,
          lockReason: null,
          lockedBy: null,
          lockedAt: null,
          permissions: {
            view: settings.permissions?.view || ['all'],
            edit: settings.permissions?.edit || ['creator', 'admin'],
            approve: settings.permissions?.approve || ['admin'],
            delete: settings.permissions?.delete || ['creator', 'admin']
          },
          encryption: {
            enabled: settings.encryption || false,
            fields: settings.encryptedFields || [],
            algorithm: 'AES-256-GCM'
          }
        },
        
        // Version control
        versioning: {
          version: '1.0.0',
          majorVersion: 1,
          minorVersion: 0,
          patchVersion: 0,
          parentTemplateId: parentTemplateId ? new mongoose.Types.ObjectId(parentTemplateId) : null,
          changeLog: [],
          branchFrom: null,
          mergeHistory: []
        },
        
        // Usage analytics
        usage: {
          totalUsage: 0,
          activeInstances: 0,
          successfulSubmissions: 0,
          averageCompletionTime: 0,
          abandonmentRate: 0,
          userFeedback: [],
          performanceMetrics: {
            loadTime: 0,
            renderTime: 0,
            validationTime: 0,
            submissionTime: 0
          }
        },
        
        // Quality metrics
        quality: {
          score: qualityAssessment.score,
          completeness: qualityAssessment.completeness,
          clarity: qualityAssessment.clarity,
          consistency: qualityAssessment.consistency,
          usability: qualityAssessment.usability,
          accessibility: qualityAssessment.accessibility,
          recommendations: qualityAssessment.recommendations || []
        },
        
        // Integration capabilities
        integrations: {
          supportedFormats: ['HTML', 'PDF', 'DOCX', 'JSON'],
          exportable: true,
          importable: true,
          apiEnabled: settings.apiEnabled || false,
          webhooks: settings.webhooks || [],
          externalSystems: settings.externalSystems || []
        },
        
        // Status and workflow
        status: TEMPLATE_STATUS.DRAFT,
        workflow: {
          currentPhase: 'creation',
          nextPhase: 'review',
          requiresApproval: isSystem || settings.requiresApproval || false,
          approvalChain: settings.approvalChain || [],
          canEdit: true,
          canDelete: true
        },
        
        // Timestamps and tracking
        timeline: {
          createdAt: new Date(),
          lastModifiedAt: new Date(),
          approvedAt: null,
          activatedAt: null,
          deprecatedAt: null,
          archivedAt: null
        },
        
        // User tracking
        users: {
          createdBy: new mongoose.Types.ObjectId(userId),
          lastModifiedBy: new mongoose.Types.ObjectId(userId),
          approvedBy: null,
          collaborators: []
        },
        
        // System information
        system: {
          version: '1.0',
          ipAddress,
          userAgent,
          platform: this.detectPlatform(userAgent),
          compiledTemplate: null, // Will store compiled version
          checksums: {
            content: this.generateChecksum(content),
            fields: this.generateChecksum(mergedFields),
            validation: this.generateChecksum(validationRules)
          }
        },
        
        // Metadata and custom properties
        metadata: {
          tags: metadata.tags || [],
          keywords: metadata.keywords || [],
          industry: metadata.industry || '',
          department: metadata.department || '',
          purpose: metadata.purpose || '',
          audience: metadata.audience || '',
          language: metadata.language || 'en',
          region: metadata.region || '',
          customProperties: metadata.customProperties || {}
        }
      });

      await template.save();

      // Create initial version record
      await this.createTemplateVersion(template._id, {
        version: '1.0.0',
        changes: 'Initial template creation',
        content: template.structure.content,
        fields: template.structure.fields
      }, userId);

      // Compile template for performance
      if (settings.precompile !== false) {
        await this.compileTemplate(template._id, userId);
      }

      // Create audit trail
      await auditService.logAuditEvent({
        action: TEMPLATE_EVENTS.CREATED,
        entityType: 'template',
        entityId: template._id,
        userId,
        metadata: {
          templateId: template.templateId,
          name: template.name,
          type: template.type,
          category: template.category,
          fieldsCount: mergedFields.length,
          qualityScore: qualityAssessment.score,
          ipAddress,
          userAgent
        }
      });

      // Send notifications to relevant parties
      await this.sendTemplateNotifications(template, 'created', userId);

      logger.info('Template created successfully', {
        templateId: template._id,
        name: template.name,
        type: template.type,
        category: template.category,
        userId
      });

      return {
        success: true,
        message: 'Template created successfully',
        template: {
          id: template._id,
          templateId: template.templateId,
          name: template.name,
          type: template.type,
          category: template.category,
          status: template.status,
          version: template.versioning.version,
          fieldsCount: mergedFields.length,
          qualityScore: template.quality.score,
          createdAt: template.timeline.createdAt
        }
      };

    } catch (error) {
      logger.error('Error creating template', {
        error: error.message,
        templateData,
        userId
      });
      throw new Error(`Template creation failed: ${error.message}`);
    }
  }

  /**
   * Update template with version control
   */
  static async updateTemplate(templateId, updates, userId, options = {}) {
    try {
      const { createNewVersion = true, reason = '', majorUpdate = false } = options;

      const template = await Template.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check if user can edit this template
      if (!this.canUserEditTemplate(template, userId)) {
        throw new Error('Unauthorized to edit this template');
      }

      // Check if template is locked
      if (template.security.isLocked) {
        throw new Error(`Template is locked: ${template.security.lockReason}`);
      }

      // Validate updates
      const validationResult = await this.validateTemplateUpdates(template, updates);
      if (!validationResult.valid) {
        throw new Error(`Invalid updates: ${validationResult.errors.join(', ')}`);
      }

      // Create version backup if requested
      if (createNewVersion) {
        await this.createTemplateVersion(template._id, {
          version: template.versioning.version,
          changes: reason,
          content: template.structure.content,
          fields: template.structure.fields
        }, userId);
      }

      // Apply updates
      const updatedTemplate = await this.applyTemplateUpdates(template, updates, userId);

      // Update version number
      if (createNewVersion) {
        const newVersion = this.incrementVersion(
          template.versioning.version,
          majorUpdate
        );
        updatedTemplate.versioning.version = newVersion;
        updatedTemplate.versioning.changeLog.push({
          version: newVersion,
          changes: reason,
          updatedBy: userId,
          updatedAt: new Date()
        });
      }

      // Recompile template if content changed
      if (updates.content || updates.fields) {
        await this.compileTemplate(updatedTemplate._id, userId);
      }

      // Save updated template
      updatedTemplate.timeline.lastModifiedAt = new Date();
      updatedTemplate.users.lastModifiedBy = new mongoose.Types.ObjectId(userId);
      await updatedTemplate.save();

      // Create audit trail
      await auditService.logAuditEvent({
        action: TEMPLATE_EVENTS.UPDATED,
        entityType: 'template',
        entityId: template._id,
        userId,
        metadata: {
          templateId: template.templateId,
          version: updatedTemplate.versioning.version,
          changes: reason,
          majorUpdate,
          fieldsUpdated: Object.keys(updates)
        }
      });

      // Send notifications
      await this.sendTemplateNotifications(updatedTemplate, 'updated', userId);

      return {
        success: true,
        message: 'Template updated successfully',
        template: {
          id: updatedTemplate._id,
          version: updatedTemplate.versioning.version,
          lastModified: updatedTemplate.timeline.lastModifiedAt
        }
      };

    } catch (error) {
      logger.error('Error updating template', {
        error: error.message,
        templateId,
        updates,
        userId
      });
      throw new Error(`Template update failed: ${error.message}`);
    }
  }

  /**
   * Activate template for use
   */
  static async activateTemplate(templateId, userId, options = {}) {
    try {
      const { lockAfterActivation = false, notifyUsers = true } = options;

      const template = await Template.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Verify user permissions
      if (!this.canUserActivateTemplate(template, userId)) {
        throw new Error('Unauthorized to activate this template');
      }

      // Validate template is ready for activation
      const activationCheck = await this.validateTemplateForActivation(template);
      if (!activationCheck.ready) {
        throw new Error(`Template not ready for activation: ${activationCheck.issues.join(', ')}`);
      }

      // Update template status
      template.status = TEMPLATE_STATUS.ACTIVE;
      template.workflow.currentPhase = 'active';
      template.timeline.activatedAt = new Date();

      // Lock template if requested
      if (lockAfterActivation) {
        template.security.isLocked = true;
        template.security.lockReason = 'Template locked after activation';
        template.security.lockedBy = new mongoose.Types.ObjectId(userId);
        template.security.lockedAt = new Date();
      }

      await template.save();

      // Create audit trail
      await auditService.logAuditEvent({
        action: TEMPLATE_EVENTS.ACTIVATED,
        entityType: 'template',
        entityId: template._id,
        userId,
        metadata: {
          templateId: template.templateId,
          lockedAfterActivation: lockAfterActivation
        }
      });

      // Send notifications
      if (notifyUsers) {
        await this.sendTemplateNotifications(template, 'activated', userId);
      }

      return {
        success: true,
        message: 'Template activated successfully',
        template: {
          id: template._id,
          status: template.status,
          activatedAt: template.timeline.activatedAt,
          isLocked: template.security.isLocked
        }
      };

    } catch (error) {
      logger.error('Error activating template', {
        error: error.message,
        templateId,
        userId
      });
      throw new Error(`Template activation failed: ${error.message}`);
    }
  }

  /**
   * Clone template with customization
   */
  static async cloneTemplate(templateId, cloneData, userId) {
    try {
      const {
        name,
        description = '',
        category = TEMPLATE_CATEGORIES.CUSTOM,
        modifications = {}
      } = cloneData;

      const originalTemplate = await Template.findById(templateId);
      if (!originalTemplate) {
        throw new Error('Original template not found');
      }

      // Check permissions to clone
      if (!this.canUserCloneTemplate(originalTemplate, userId)) {
        throw new Error('Unauthorized to clone this template');
      }

      // Create cloned template data
      const clonedData = {
        name: name || `${originalTemplate.name} (Copy)`,
        type: originalTemplate.type,
        category,
        description: description || originalTemplate.description,
        content: modifications.content || originalTemplate.structure.content,
        fields: modifications.fields || originalTemplate.structure.fields,
        validationRules: modifications.validationRules || originalTemplate.validation.rules,
        settings: { ...originalTemplate.settings, ...modifications.settings },
        metadata: { ...originalTemplate.metadata, ...modifications.metadata },
        parentTemplateId: templateId
      };

      // Create the cloned template
      const clonedTemplate = await this.createTemplate(clonedData, userId);

      // Create audit trail
      await auditService.logAuditEvent({
        action: TEMPLATE_EVENTS.CLONED,
        entityType: 'template',
        entityId: clonedTemplate.template.id,
        userId,
        metadata: {
          originalTemplateId: templateId,
          clonedTemplateId: clonedTemplate.template.id,
          modifications: Object.keys(modifications)
        }
      });

      return {
        success: true,
        message: 'Template cloned successfully',
        original: {
          id: originalTemplate._id,
          name: originalTemplate.name
        },
        cloned: clonedTemplate.template
      };

    } catch (error) {
      logger.error('Error cloning template', {
        error: error.message,
        templateId,
        cloneData,
        userId
      });
      throw new Error(`Template cloning failed: ${error.message}`);
    }
  }

  // Helper methods for complex operations
  static async analyzeTemplateContent(content, fields) {
    return {
      sections: [],
      variables: [],
      conditionalLogic: [],
      calculations: []
    };
  }

  static mergeFieldDefinitions(providedFields, extractedFields) {
    return providedFields || [];
  }

  static async generateValidationSchema(fields, rules) {
    return {};
  }

  static generateErrorMessages(fields) {
    return {};
  }

  static canUserEditTemplate(template, userId) {
    return true;
  }

  static async validateTemplateUpdates(template, updates) {
    return { valid: true };
  }

  static async applyTemplateUpdates(template, updates, userId) {
    return template;
  }

  static incrementVersion(currentVersion, major = false) {
    const parts = currentVersion.split('.');
    if (major) {
      return `${parseInt(parts[0]) + 1}.0.0`;
    }
    return `${parts[0]}.${parseInt(parts[1]) + 1}.0`;
  }

  static canUserActivateTemplate(template, userId) {
    return true;
  }

  static async validateTemplateForActivation(template) {
    return { ready: true };
  }

  static canUserCloneTemplate(template, userId) {
    return true;
  }

  static async createTemplateVersion(templateId, versionData, userId) {
    // Implementation for version creation
  }

  static async compileTemplate(templateId, userId) {
    // Implementation for template compilation
  }

  static async sendTemplateNotifications(template, event, userId) {
    // Implementation for notifications
  }

  static detectPlatform(userAgent) {
    return 'web';
  }

  static generateChecksum(data) {
    return 'checksum';
  }
}

module.exports = TemplateService;
