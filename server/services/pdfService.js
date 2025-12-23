/**
 * PDF Service
 * 
 * Comprehensive PDF generation with templates, digital signatures,
 * watermarks, security, and advanced document formatting capabilities
 * Feature 10: Advanced document management with PDF generation
 */

const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const PDFTable = require('voilab-pdf-table');
const QRCode = require('qrcode');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Document = require('../db/models/Document');
const PDFTemplate = require('../db/models/PDFTemplate');
const User = require('../db/models/User');
const Procurement = require('../db/models/Procurement');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const { validateInput, sanitize } = require('../utils/validation');
const { formatDate, formatCurrency, generateDocumentId, calculateChecksum } = require('../utils/helpers');
const { signPDF, verifyPDFSignature, addWatermark } = require('../utils/pdfSecurity');

// PDF generation constants
const PDF_TEMPLATES = {
  RFQ: 'rfq_template',
  AWARD_NOTICE: 'award_notice_template',
  CONTRACT: 'contract_template',
  EVALUATION_REPORT: 'evaluation_report_template',
  AUDIT_REPORT: 'audit_report_template',
  SUBMISSION_RECEIPT: 'submission_receipt_template',
  PROCUREMENT_PLAN: 'procurement_plan_template',
  COMPLIANCE_REPORT: 'compliance_report_template',
  VENDOR_CERTIFICATE: 'vendor_certificate_template',
  PAYMENT_CERTIFICATE: 'payment_certificate_template'
};

const PDF_FORMATS = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 }
};

const PDF_ORIENTATIONS = {
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape'
};

const PDF_SECURITY_LEVELS = {
  NONE: 'none',
  BASIC: 'basic',
  ENHANCED: 'enhanced',
  MAXIMUM: 'maximum'
};

const PDF_WATERMARK_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  QR_CODE: 'qr_code',
  LOGO: 'logo'
};

const PDF_STATUS = {
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SIGNED: 'signed',
  VERIFIED: 'verified',
  ARCHIVED: 'archived'
};

const PDF_EVENTS = {
  GENERATION_STARTED: 'pdf_generation_started',
  GENERATION_COMPLETED: 'pdf_generation_completed',
  GENERATION_FAILED: 'pdf_generation_failed',
  PDF_SIGNED: 'pdf_signed',
  PDF_ACCESSED: 'pdf_accessed',
  PDF_DOWNLOADED: 'pdf_downloaded'
};

class PDFService {
  /**
   * Generate comprehensive PDF document with advanced features
   */
  static async generatePDF(pdfData, userId, requestInfo = {}) {
    try {
      const {
        templateType,
        documentType,
        title,
        data,
        options = {},
        security = {},
        formatting = {},
        watermark = null,
        digitalSignature = false,
        metadata = {},
        recipients = [],
        procurementId = null,
        entityId = null,
        customTemplate = null
      } = pdfData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!templateType || !title || !data) {
        throw new Error('Template type, title, and data are required');
      }

      // Sanitize inputs
      const sanitizedTitle = sanitize(title);

      // Generate document ID
      const documentId = generateDocumentId();
      const filename = `${documentId}_${sanitizedTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      // Create PDF generation record
      const pdfRecord = {
        documentId,
        filename,
        templateType,
        documentType: documentType || templateType,
        title: sanitizedTitle,
        status: PDF_STATUS.GENERATING,
        generatedBy: userId,
        generatedAt: new Date(),
        procurementId: procurementId ? new mongoose.Types.ObjectId(procurementId) : null,
        entityId: entityId ? new mongoose.Types.ObjectId(entityId) : null,
        metadata: {
          ...metadata,
          ipAddress,
          userAgent,
          version: '1.0'
        }
      };

      // Log generation start
      await auditService.logAuditEvent({
        action: PDF_EVENTS.GENERATION_STARTED,
        entityType: 'pdf',
        entityId: documentId,
        userId,
        metadata: {
          templateType,
          documentType,
          filename,
          procurementId
        }
      });

      // Load or create template
      const template = customTemplate || await this.loadPDFTemplate(templateType, options);

      // Generate PDF document
      const pdfBuffer = await this.createPDFDocument(template, data, formatting, options);

      // Apply security measures
      let securedPDF = pdfBuffer;
      if (security.level && security.level !== PDF_SECURITY_LEVELS.NONE) {
        securedPDF = await this.applyPDFSecurity(pdfBuffer, security);
      }

      // Add watermark if specified
      if (watermark) {
        securedPDF = await this.addPDFWatermark(securedPDF, watermark);
      }

      // Apply digital signature if required
      if (digitalSignature) {
        securedPDF = await this.applyDigitalSignature(securedPDF, userId, documentId);
      }

      // Calculate checksum
      const checksum = calculateChecksum(securedPDF);

      // Save PDF file
      const filePath = await this.savePDFFile(securedPDF, filename, documentId);

      // Create document record
      const document = new Document({
        documentId,
        filename,
        originalFilename: filename,
        filePath,
        fileSize: securedPDF.length,
        mimeType: 'application/pdf',
        
        // Document classification
        documentType: documentType || templateType,
        category: 'generated_pdf',
        subCategory: templateType,
        
        // Content information
        title: sanitizedTitle,
        description: `Generated ${templateType} document`,
        version: '1.0',
        language: 'en',
        
        // Generation details
        generationInfo: {
          templateType,
          templateId: template.id,
          generatedBy: userId,
          generatedAt: new Date(),
          dataSourceType: 'service',
          processingTime: 0
        },
        
        // Security and integrity
        security: {
          level: security.level || PDF_SECURITY_LEVELS.BASIC,
          encrypted: security.level !== PDF_SECURITY_LEVELS.NONE,
          digitallySigned: digitalSignature,
          watermarked: watermark ? true : false,
          accessRestricted: security.restrictAccess || false
        },
        
        // Checksums and verification
        checksums: {
          md5: checksum.md5,
          sha256: checksum.sha256,
          crc32: checksum.crc32
        },
        
        // Context and relationships
        context: {
          procurementId: procurementId ? new mongoose.Types.ObjectId(procurementId) : null,
          entityType: documentType,
          entityId: entityId ? new mongoose.Types.ObjectId(entityId) : null,
          relatedDocuments: [],
          parentDocumentId: null
        },
        
        // Access control
        permissions: {
          owner: userId,
          readers: recipients.map(r => r.userId || r),
          editors: [userId],
          viewers: [],
          public: false
        },
        
        // Lifecycle management
        lifecycle: {
          status: 'active',
          createdAt: new Date(),
          createdBy: userId,
          lastModified: new Date(),
          modifiedBy: userId,
          archivedAt: null,
          deletedAt: null
        },
        
        // System metadata
        system: {
          creationIP: ipAddress,
          creationUserAgent: userAgent,
          processingTime: 0,
          compressionRatio: 1.0,
          qualityScore: 100
        }
      });

      await document.save();

      // Update PDF record status
      pdfRecord.status = PDF_STATUS.COMPLETED;
      pdfRecord.completedAt = new Date();
      pdfRecord.documentId = document._id;
      pdfRecord.filePath = filePath;
      pdfRecord.fileSize = securedPDF.length;
      pdfRecord.checksum = checksum;

      // Send notifications if recipients specified
      if (recipients.length > 0) {
        await this.sendPDFNotifications(document, recipients, userId);
      }

      // Log generation completion
      await auditService.logAuditEvent({
        action: PDF_EVENTS.GENERATION_COMPLETED,
        entityType: 'pdf',
        entityId: document._id,
        userId,
        metadata: {
          documentId,
          filename,
          fileSize: securedPDF.length,
          templateType,
          checksum: checksum.md5
        }
      });

      return {
        success: true,
        message: 'PDF generated successfully',
        document: {
          id: document._id,
          documentId,
          filename,
          title: sanitizedTitle,
          fileSize: securedPDF.length,
          filePath,
          downloadUrl: `/api/documents/${document._id}/download`,
          viewUrl: `/api/documents/${document._id}/view`,
          checksum: checksum.md5,
          generatedAt: new Date(),
          security: document.security
        }
      };

    } catch (error) {
      logger.error('Error generating PDF', { 
        error: error.message, 
        pdfData, 
        userId 
      });

      // Log generation failure
      if (pdfData.templateType) {
        await auditService.logAuditEvent({
          action: PDF_EVENTS.GENERATION_FAILED,
          entityType: 'pdf',
          entityId: null,
          userId,
          metadata: {
            templateType: pdfData.templateType,
            error: error.message
          }
        });
      }

      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate RFQ PDF (enhanced legacy method)
   */
  static async generateRFQPDF(rfqData, userId = null, options = {}) {
    try {
      const pdfData = {
        templateType: PDF_TEMPLATES.RFQ,
        documentType: 'rfq',
        title: `Request for Quotation: ${rfqData.title || rfqData.rfqNumber}`,
        data: {
          // Header information
          rfqNumber: rfqData.rfqNumber || rfqData.id,
          title: rfqData.title,
          procurementType: rfqData.procurementType,
          publishDate: formatDate(rfqData.publish_date || rfqData.publishedDate),
          closingDate: formatDate(rfqData.closing_date || rfqData.closingDate),
          
          // Procurement details
          description: rfqData.description,
          specifications: rfqData.specifications || [],
          evaluationCriteria: rfqData.evaluation_criteria || rfqData.evaluationCriteria,
          
          // Terms and conditions
          terms: {
            paymentTerms: rfqData.paymentTerms || 'Net 30 days',
            deliveryTerms: rfqData.deliveryTerms || 'FOB Destination',
            warrantyRequirements: rfqData.warrantyRequirements,
            complianceRequirements: rfqData.complianceRequirements || []
          },
          
          // Contact information
          contactInfo: {
            procurementOfficer: rfqData.procurementOfficer,
            email: rfqData.contactEmail,
            phone: rfqData.contactPhone,
            address: rfqData.organizationAddress
          },
          
          // Submission requirements
          submission: {
            format: rfqData.submissionFormat || 'Electronic',
            deadline: formatDate(rfqData.closing_date || rfqData.closingDate),
            location: rfqData.submissionLocation,
            requirements: rfqData.submissionRequirements || []
          }
        },
        procurementId: rfqData.procurementId || rfqData.procurement_id,
        entityId: rfqData.id,
        security: {
          level: PDF_SECURITY_LEVELS.BASIC,
          restrictAccess: true
        },
        watermark: {
          type: PDF_WATERMARK_TYPES.TEXT,
          text: 'OFFICIAL RFQ DOCUMENT',
          opacity: 0.1
        },
        ...options
      };

      const result = await this.generatePDF(pdfData, userId);
      
      logger.info('RFQ PDF generated successfully', { 
        rfqId: rfqData.id,
        documentId: result.document.id 
      });
      
      return result;

    } catch (error) {
      logger.error('Error generating RFQ PDF', { error: error.message, rfqData });
      throw new Error(`RFQ PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Award Notice PDF (enhanced legacy method)
   */
  static async generateAwardNoticePDF(awardData, userId = null, options = {}) {
    try {
      const pdfData = {
        templateType: PDF_TEMPLATES.AWARD_NOTICE,
        documentType: 'award_notice',
        title: `Award Notice - ${awardData.awardNumber || awardData.id}`,
        data: {
          // Award information
          awardNumber: awardData.awardNumber || awardData.id,
          rfqReference: awardData.rfq_id || awardData.rfqId,
          awardDate: formatDate(awardData.award_date || awardData.awardedDate),
          
          // Winner information
          winner: {
            vendorId: awardData.winning_vendor_id || awardData.winnerId,
            vendorName: awardData.winnerName,
            contactPerson: awardData.winnerContact,
            address: awardData.winnerAddress,
            email: awardData.winnerEmail,
            phone: awardData.winnerPhone
          },
          
          // Award details
          award: {
            quotedPrice: formatCurrency(awardData.award_value || awardData.awardValue),
            contractValue: formatCurrency(awardData.award_value || awardData.awardValue),
            evaluationScore: awardData.evaluationScore,
            rankPosition: awardData.rankPosition || 1
          },
          
          // Contract terms
          contract: {
            startDate: formatDate(awardData.contract_start_date || awardData.contractStartDate),
            endDate: formatDate(awardData.contract_end_date || awardData.contractEndDate),
            deliveryPeriod: awardData.deliveryPeriod,
            paymentTerms: awardData.paymentTerms,
            warrantyPeriod: awardData.warrantyPeriod
          },
          
          // Additional information
          remarks: awardData.remarks || '',
          conditions: awardData.awardConditions || [],
          nextSteps: awardData.nextSteps || [],
          
          // Authority information
          authority: {
            approvedBy: awardData.approvedBy,
            approvalDate: formatDate(awardData.approvalDate),
            designation: awardData.approverDesignation
          }
        },
        procurementId: awardData.procurementId || awardData.procurement_id,
        entityId: awardData.id,
        security: {
          level: PDF_SECURITY_LEVELS.ENHANCED,
          restrictAccess: true
        },
        digitalSignature: true,
        watermark: {
          type: PDF_WATERMARK_TYPES.TEXT,
          text: 'OFFICIAL AWARD NOTICE',
          opacity: 0.1
        },
        ...options
      };

      const result = await this.generatePDF(pdfData, userId);
      
      logger.info('Award notice PDF generated successfully', { 
        awardId: awardData.id,
        documentId: result.document.id 
      });
      
      return result;

    } catch (error) {
      logger.error('Error generating award notice PDF', { error: error.message, awardData });
      throw new Error(`Award notice PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Contract PDF (enhanced legacy method)
   */
  static async generateContractPDF(contractData, userId = null, options = {}) {
    try {
      const pdfData = {
        templateType: PDF_TEMPLATES.CONTRACT,
        documentType: 'contract',
        title: `Contract ${contractData.contract_number || contractData.contractNumber}`,
        data: {
          // Contract header
          contractNumber: contractData.contract_number || contractData.contractNumber,
          contractDate: formatDate(contractData.contractDate || new Date()),
          referenceNumber: contractData.referenceNumber,
          
          // Parties information
          parties: {
            buyer: {
              name: contractData.buyerName || 'Government Institution',
              address: contractData.buyerAddress,
              representative: contractData.buyerRepresentative,
              designation: contractData.buyerDesignation,
              email: contractData.buyerEmail,
              phone: contractData.buyerPhone
            },
            vendor: {
              id: contractData.vendor_id || contractData.vendorId,
              name: contractData.vendorName,
              address: contractData.vendorAddress,
              representative: contractData.vendorRepresentative,
              designation: contractData.vendorDesignation,
              email: contractData.vendorEmail,
              phone: contractData.vendorPhone,
              taxId: contractData.vendorTaxId,
              registrationNumber: contractData.vendorRegistration
            }
          },
          
          // Contract terms
          terms: {
            startDate: formatDate(contractData.start_date || contractData.startDate),
            endDate: formatDate(contractData.end_date || contractData.endDate),
            contractValue: formatCurrency(contractData.value || contractData.contractValue),
            currency: contractData.currency || 'USD',
            paymentTerms: contractData.payment_terms || contractData.paymentTerms,
            deliveryTerms: contractData.delivery_terms || contractData.deliveryTerms,
            deliveryLocation: contractData.deliveryLocation,
            deliverySchedule: contractData.deliverySchedule || []
          },
          
          // Scope and specifications
          scope: {
            description: contractData.description || 'As per Award Notice and RFQ',
            specifications: contractData.specifications || [],
            deliverables: contractData.deliverables || [],
            milestones: contractData.milestones || []
          },
          
          // Conditions and clauses
          conditions: contractData.conditions || [
            'Full compliance with applicable laws and regulations',
            'On-time delivery as per agreed schedule',
            'Quality assurance and testing standards compliance',
            'Payment upon delivery and acceptance of goods/services',
            'Warranty and maintenance as specified',
            'Compliance with safety and environmental standards'
          ],
          
          // Legal clauses
          legalClauses: {
            governingLaw: contractData.governingLaw,
            jurisdiction: contractData.jurisdiction,
            disputeResolution: contractData.disputeResolution,
            terminationClause: contractData.terminationClause,
            forceMAjeure: contractData.forceMajeure,
            confidentiality: contractData.confidentialityClause
          },
          
          // Performance requirements
          performance: {
            performanceBond: contractData.performanceBond,
            penaltyClause: contractData.penaltyClause,
            bonusClause: contractData.bonusClause,
            liquidDamages: contractData.liquidDamages
          },
          
          // Signatures
          signatures: {
            buyerSignature: contractData.buyerSignature,
            vendorSignature: contractData.vendorSignature,
            witnessSignature: contractData.witnessSignature,
            signatureDate: formatDate(contractData.signatureDate || new Date())
          }
        },
        procurementId: contractData.procurementId || contractData.procurement_id,
        entityId: contractData.id,
        security: {
          level: PDF_SECURITY_LEVELS.MAXIMUM,
          restrictAccess: true,
          requirePassword: true
        },
        digitalSignature: true,
        watermark: {
          type: PDF_WATERMARK_TYPES.TEXT,
          text: 'OFFICIAL CONTRACT DOCUMENT',
          opacity: 0.08
        },
        ...options
      };

      const result = await this.generatePDF(pdfData, userId);
      
      logger.info('Contract PDF generated successfully', { 
        contractId: contractData.id,
        documentId: result.document.id 
      });
      
      return result;

    } catch (error) {
      logger.error('Error generating contract PDF', { error: error.message, contractData });
      throw new Error(`Contract PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Evaluation Report PDF (enhanced legacy method)
   */
  static async generateEvaluationReportPDF(evaluationData, userId = null, options = {}) {
    try {
      const pdfData = {
        templateType: PDF_TEMPLATES.EVALUATION_REPORT,
        documentType: 'evaluation_report',
        title: `Evaluation Report - ${evaluationData.rfq_id || evaluationData.rfqId}`,
        data: {
          // Report metadata
          reportId: evaluationData.id,
          rfqId: evaluationData.rfq_id || evaluationData.rfqId,
          evaluationDate: formatDate(evaluationData.evaluationDate || new Date()),
          reportDate: formatDate(new Date()),
          
          // Evaluation team
          team: {
            chairperson: evaluationData.chairperson,
            members: evaluationData.evaluators || [],
            technicalExperts: evaluationData.technicalExperts || [],
            observers: evaluationData.observers || []
          },
          
          // Evaluation criteria and methodology
          evaluation: {
            criteria: evaluationData.evaluation_criteria || evaluationData.evaluationCriteria || [],
            methodology: evaluationData.methodology,
            weightingSystem: {
              technical: evaluationData.technicalWeight || 60,
              financial: evaluationData.financialWeight || 40,
              experience: evaluationData.experienceWeight || 0,
              compliance: evaluationData.complianceWeight || 0
            }
          },
          
          // Submissions analysis
          submissions: (evaluationData.submissions || []).map(submission => ({
            vendorId: submission.vendorId,
            vendorName: submission.vendorName,
            submissionDate: formatDate(submission.submissionDate),
            technicalScore: submission.technicalScore,
            financialScore: submission.financialScore,
            totalScore: submission.totalScore,
            ranking: submission.ranking,
            status: submission.status,
            strengths: submission.strengths || [],
            weaknesses: submission.weaknesses || [],
            comments: submission.comments
          })),
          
          // Scoring summary
          scoring: {
            highestScore: evaluationData.highestScore,
            lowestScore: evaluationData.lowestScore,
            averageScore: evaluationData.averageScore,
            passingScore: evaluationData.passingScore || 70,
            qualifiedVendors: evaluationData.qualifiedVendors || 0
          },
          
          // Recommendations
          recommendations: {
            primaryRecommendation: evaluationData.recommendations || evaluationData.primaryRecommendation,
            alternativeOptions: evaluationData.alternativeOptions || [],
            disqualifications: evaluationData.disqualifications || [],
            conditions: evaluationData.recommendationConditions || []
          },
          
          // Compliance analysis
          compliance: {
            mandatoryRequirements: evaluationData.mandatoryRequirements || [],
            complianceMatrix: evaluationData.complianceMatrix || [],
            nonCompliantSubmissions: evaluationData.nonCompliantSubmissions || []
          },
          
          // Risk assessment
          risks: {
            identifiedRisks: evaluationData.risks || [],
            mitigationMeasures: evaluationData.mitigationMeasures || [],
            riskLevel: evaluationData.overallRiskLevel || 'Medium'
          }
        },
        procurementId: evaluationData.procurementId || evaluationData.procurement_id,
        entityId: evaluationData.id,
        security: {
          level: PDF_SECURITY_LEVELS.ENHANCED,
          restrictAccess: true
        },
        watermark: {
          type: PDF_WATERMARK_TYPES.TEXT,
          text: 'CONFIDENTIAL EVALUATION REPORT',
          opacity: 0.1
        },
        ...options
      };

      const result = await this.generatePDF(pdfData, userId);
      
      logger.info('Evaluation report PDF generated successfully', { 
        evaluationId: evaluationData.id,
        documentId: result.document.id 
      });
      
      return result;

    } catch (error) {
      logger.error('Error generating evaluation report PDF', { error: error.message, evaluationData });
      throw new Error(`Evaluation report PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Audit Report PDF (enhanced legacy method)
   */
  static async generateAuditReportPDF(auditData, userId = null, options = {}) {
    try {
      const pdfData = {
        templateType: PDF_TEMPLATES.AUDIT_REPORT,
        documentType: 'audit_report',
        title: `Audit Report - ${auditData.period || 'System Audit'}`,
        data: {
          // Report header
          reportId: auditData.id || auditData.reportId,
          reportType: auditData.reportType || 'System Audit',
          auditPeriod: {
            startDate: formatDate(auditData.startDate),
            endDate: formatDate(auditData.endDate),
            duration: auditData.duration || 'N/A'
          },
          
          // Audit scope
          scope: {
            modules: auditData.modules || ['All Modules'],
            processes: auditData.processes || [],
            users: auditData.usersInScope || [],
            transactions: auditData.transactionTypes || []
          },
          
          // Summary statistics
          summary: {
            totalActions: auditData.totalActions || 0,
            criticalActions: auditData.criticalActions || 0,
            warningActions: auditData.warningActions || 0,
            informationalActions: auditData.informationalActions || 0,
            usersInvolved: auditData.usersInvolved || 0,
            systemsAccessed: auditData.systemsAccessed || [],
            dataProcessed: auditData.dataProcessed || '0 GB'
          },
          
          // Action log analysis
          actionLog: (auditData.logs || []).map(log => ({
            timestamp: formatDate(log.timestamp),
            userId: log.userId,
            userName: log.userName,
            action: log.action,
            resource: log.resource,
            result: log.result,
            ipAddress: log.ipAddress,
            riskLevel: log.riskLevel || 'Low'
          })),
          
          // Security findings
          security: {
            accessViolations: auditData.accessViolations || [],
            unauthorizedActions: auditData.unauthorizedActions || [],
            dataExports: auditData.dataExports || [],
            loginAnomalies: auditData.loginAnomalies || [],
            privilegeEscalations: auditData.privilegeEscalations || []
          },
          
          // Compliance status
          compliance: {
            overallStatus: auditData.complianceStatus || 'Compliant',
            standards: auditData.complianceStandards || [],
            findings: auditData.findings || [],
            recommendations: auditData.complianceRecommendations || [],
            nonCompliantItems: auditData.nonCompliantItems || []
          },
          
          // Performance metrics
          performance: {
            systemAvailability: auditData.systemAvailability || '99.9%',
            averageResponseTime: auditData.averageResponseTime || '< 2s',
            errorRate: auditData.errorRate || '< 0.1%',
            dataIntegrityChecks: auditData.dataIntegrityChecks || 'Passed'
          },
          
          // Recommendations and action items
          actionItems: {
            immediate: auditData.immediateActions || [],
            shortTerm: auditData.shortTermActions || [],
            longTerm: auditData.longTermActions || [],
            monitoring: auditData.continuousMonitoring || []
          }
        },
        procurementId: auditData.procurementId,
        entityId: auditData.id,
        security: {
          level: PDF_SECURITY_LEVELS.MAXIMUM,
          restrictAccess: true,
          requirePassword: true
        },
        digitalSignature: true,
        watermark: {
          type: PDF_WATERMARK_TYPES.TEXT,
          text: 'CONFIDENTIAL AUDIT REPORT',
          opacity: 0.08
        },
        ...options
      };

      const result = await this.generatePDF(pdfData, userId);
      
      logger.info('Audit report PDF generated successfully', { 
        auditId: auditData.id,
        documentId: result.document.id 
      });
      
      return result;

    } catch (error) {
      logger.error('Error generating audit report PDF', { error: error.message, auditData });
      throw new Error(`Audit report PDF generation failed: ${error.message}`);
    }
  }

  // Advanced PDF generation helper methods
  static async loadPDFTemplate(templateType, options = {}) {
    try {
      // Load template from database or file system
      const template = await PDFTemplate.findOne({ type: templateType, active: true });
      
      if (!template) {
        // Return default template structure
        return {
          id: 'default',
          type: templateType,
          layout: options.layout || 'standard',
          format: options.format || PDF_FORMATS.A4,
          orientation: options.orientation || PDF_ORIENTATIONS.PORTRAIT,
          margins: options.margins || { top: 72, bottom: 72, left: 72, right: 72 },
          fonts: options.fonts || { body: 'Helvetica', header: 'Helvetica-Bold' },
          colors: options.colors || { primary: '#000000', secondary: '#666666' },
          sections: this.getDefaultTemplateSections(templateType)
        };
      }

      return template;
    } catch (error) {
      logger.error('Error loading PDF template', { error: error.message, templateType });
      throw new Error(`Template loading failed: ${error.message}`);
    }
  }

  static getDefaultTemplateSections(templateType) {
    const sections = {
      [PDF_TEMPLATES.RFQ]: ['header', 'overview', 'description', 'criteria', 'terms', 'footer'],
      [PDF_TEMPLATES.AWARD_NOTICE]: ['header', 'reference', 'winner', 'contract', 'remarks', 'footer'],
      [PDF_TEMPLATES.CONTRACT]: ['header', 'parties', 'terms', 'scope', 'conditions', 'signatures', 'footer'],
      [PDF_TEMPLATES.EVALUATION_REPORT]: ['header', 'metadata', 'criteria', 'submissions', 'scoring', 'recommendations', 'footer'],
      [PDF_TEMPLATES.AUDIT_REPORT]: ['header', 'period', 'summary', 'actionLog', 'compliance', 'footer']
    };

    return sections[templateType] || ['header', 'content', 'footer'];
  }

  static async createPDFDocument(template, data, formatting, options) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [template.format.width, template.format.height],
          layout: template.orientation,
          margins: template.margins,
          info: {
            Title: data.title || 'Generated Document',
            Author: 'Procurement System',
            Subject: template.type,
            CreationDate: new Date(),
            Producer: 'Advanced PDF Service'
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate document content based on template
        this.renderPDFContent(doc, template, data, formatting);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  static renderPDFContent(doc, template, data, formatting) {
    // Header
    this.renderHeader(doc, data, template);
    
    // Content sections
    template.sections.forEach(section => {
      this.renderSection(doc, section, data, template);
    });
    
    // Footer
    this.renderFooter(doc, data, template);
  }

  static renderHeader(doc, data, template) {
    doc.fontSize(20)
       .font(template.fonts.header)
       .text(data.title, template.margins.left, 50, { align: 'center' });
    
    doc.fontSize(10)
       .text(`Generated: ${formatDate(new Date())}`, template.margins.left, 80, { align: 'right' });
       
    doc.moveTo(template.margins.left, 100)
       .lineTo(template.format.width - template.margins.right, 100)
       .stroke();
  }

  static renderSection(doc, section, data, template) {
    const yPosition = doc.y + 20;
    
    switch (section) {
      case 'overview':
        this.renderOverviewSection(doc, data, template, yPosition);
        break;
      case 'description':
        this.renderDescriptionSection(doc, data, template, yPosition);
        break;
      case 'criteria':
        this.renderCriteriaSection(doc, data, template, yPosition);
        break;
      // Add more section renderers as needed
      default:
        this.renderDefaultSection(doc, section, data, template, yPosition);
    }
  }

  static renderOverviewSection(doc, data, template, yPosition) {
    doc.y = yPosition;
    doc.fontSize(14).font(template.fonts.header).text('Overview', template.margins.left);
    doc.fontSize(10).font(template.fonts.body);
    
    if (data.overview) {
      Object.entries(data.overview).forEach(([key, value]) => {
        doc.text(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`);
      });
    }
  }

  static renderDescriptionSection(doc, data, template, yPosition) {
    doc.y = yPosition;
    doc.fontSize(14).font(template.fonts.header).text('Description', template.margins.left);
    doc.fontSize(10).font(template.fonts.body);
    doc.text(data.description || 'No description provided', { width: template.format.width - template.margins.left - template.margins.right });
  }

  static renderCriteriaSection(doc, data, template, yPosition) {
    doc.y = yPosition;
    doc.fontSize(14).font(template.fonts.header).text('Evaluation Criteria', template.margins.left);
    doc.fontSize(10).font(template.fonts.body);
    
    if (data.evaluationCriteria) {
      if (Array.isArray(data.evaluationCriteria)) {
        data.evaluationCriteria.forEach((criterion, index) => {
          doc.text(`${index + 1}. ${criterion}`);
        });
      } else {
        doc.text(data.evaluationCriteria);
      }
    }
  }

  static renderDefaultSection(doc, section, data, template, yPosition) {
    doc.y = yPosition;
    doc.fontSize(14).font(template.fonts.header).text(section.toUpperCase(), template.margins.left);
    doc.fontSize(10).font(template.fonts.body);
    
    const sectionData = data[section];
    if (sectionData) {
      if (typeof sectionData === 'object') {
        doc.text(JSON.stringify(sectionData, null, 2));
      } else {
        doc.text(sectionData.toString());
      }
    }
  }

  static renderFooter(doc, data, template) {
    const footerY = template.format.height - template.margins.bottom - 30;
    
    doc.moveTo(template.margins.left, footerY)
       .lineTo(template.format.width - template.margins.right, footerY)
       .stroke();
    
    doc.fontSize(8)
       .text('Generated by Procurement System', template.margins.left, footerY + 10)
       .text(`Page ${doc.page.count}`, template.format.width - template.margins.right - 50, footerY + 10);
  }

  // Security and enhancement methods (placeholders)
  static async applyPDFSecurity(pdfBuffer, security) {
    // Apply security measures based on level
    return pdfBuffer; // Placeholder
  }

  static async addPDFWatermark(pdfBuffer, watermark) {
    // Add watermark to PDF
    return pdfBuffer; // Placeholder
  }

  static async applyDigitalSignature(pdfBuffer, userId, documentId) {
    // Apply digital signature
    return pdfBuffer; // Placeholder
  }

  static async savePDFFile(pdfBuffer, filename, documentId) {
    // Save PDF file to storage
    const filePath = path.join(process.cwd(), 'storage', 'documents', documentId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, pdfBuffer);
    return filePath;
  }

  static async sendPDFNotifications(document, recipients, userId) {
    // Send notifications about PDF generation
    await notificationService.sendNotification({
      recipients,
      subject: `Document Generated: ${document.title}`,
      message: `A new PDF document has been generated and is ready for review.`,
      notificationType: 'document',
      priority: 'normal',
      channels: ['email', 'in_app'],
      metadata: {
        documentId: document._id,
        documentType: document.documentType
      }
    }, userId);
  }
}

module.exports = PDFService;