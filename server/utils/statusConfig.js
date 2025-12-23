/**
 * Enterprise Status and Workflow Management System
 * Advanced centralized configuration and workflow orchestration for procurement operations
 * Provides comprehensive state management, validation, audit logging, and business intelligence
 */

const EventEmitter = require('events');
const crypto = require('crypto');

// Enterprise Status and Workflow Management Engine
class EnterpriseStatusEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      enableAudit: true,
      enableMetrics: true,
      enableValidation: true,
      maxTransitionHistory: 1000,
      ...options
    };
    
    this.cache = new Map();
    this.metrics = {
      transitionsCount: 0,
      validationErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTransitionTime: 0,
      errorRate: 0,
      lastResetTime: Date.now()
    };
    
    this.transitionHistory = [];
    this.activeWorkflows = new Map();
    this.businessRules = new Map();
    this.statusSubscriptions = new Map();
    
    // Initialize built-in business rules
    this.initializeBusinessRules();
    
    // Start metrics collection
    if (this.options.enableMetrics) {
      this.metricsInterval = setInterval(() => this.collectMetrics(), 60000);
    }
  }
  
  initializeBusinessRules() {
    // Financial approval thresholds
    this.addBusinessRule('financial-approval', (context) => {
      const amount = context.amount || 0;
      if (amount > 1000000) return { requiredApprovers: ['cfo', 'ceo'], escalationRequired: true };
      if (amount > 500000) return { requiredApprovers: ['finance-manager', 'procurement-head'] };
      if (amount > 100000) return { requiredApprovers: ['finance-manager'] };
      return { requiredApprovers: ['procurement-officer'] };
    });
    
    // Compliance validation rules
    this.addBusinessRule('compliance-check', (context) => {
      const regulations = context.regulations || [];
      const results = {
        sox: regulations.includes('SOX') ? this.validateSOXCompliance(context) : { compliant: true },
        gdpr: regulations.includes('GDPR') ? this.validateGDPRCompliance(context) : { compliant: true },
        iso: regulations.includes('ISO') ? this.validateISOCompliance(context) : { compliant: true }
      };
      
      const overallCompliance = Object.values(results).every(r => r.compliant);
      return { compliant: overallCompliance, details: results };
    });
    
    // Risk assessment rules
    this.addBusinessRule('risk-assessment', (context) => {
      const factors = {
        supplier: context.supplierRisk || 'low',
        financial: context.financialRisk || 'low',
        technical: context.technicalRisk || 'low',
        compliance: context.complianceRisk || 'low'
      };
      
      const riskScore = this.calculateOverallRisk(factors);
      return {
        overallRisk: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
        factors,
        score: riskScore,
        mitigationRequired: riskScore > 0.6
      };
    });
  }
  
  addBusinessRule(name, rule) {
    this.businessRules.set(name, rule);
    this.emit('businessRuleAdded', { name, timestamp: new Date() });
  }
  
  evaluateBusinessRules(context) {
    const results = {};
    const startTime = Date.now();
    
    try {
      for (const [name, rule] of this.businessRules) {
        try {
          results[name] = rule(context);
        } catch (error) {
          results[name] = { error: error.message, timestamp: new Date() };
          this.metrics.validationErrors++;
        }
      }
      
      const duration = Date.now() - startTime;
      this.updateMetrics('businessRuleEvaluation', duration);
      
      return { success: true, results, evaluationTime: duration };
    } catch (error) {
      this.emit('error', { type: 'businessRuleEvaluation', error: error.message });
      return { success: false, error: error.message };
    }
  }
}

// Global engine instance
const statusEngine = new EnterpriseStatusEngine();

// Enhanced Status Configurations with Workflow Intelligence
const statusConfig = {
  draft: {
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    label: 'Draft',
    icon: '📄',
    level: 1,
    category: 'initial',
    allowedTransitions: ['submitted', 'archived'],
    permissions: ['author', 'editor'],
    businessRules: ['validation'],
    slaHours: null,
    escalationRequired: false,
    auditLevel: 'basic',
    notificationRules: ['author'],
    workflowStage: 'preparation',
    localization: {
      'en-US': 'Draft',
      'es-ES': 'Borrador',
      'fr-FR': 'Brouillon',
      'de-DE': 'Entwurf'
    }
  },
  submitted: {
    color: '#0dcaf0',
    bgColor: '#cff4fc',
    label: 'Submitted',
    icon: '📤',
    level: 2,
    category: 'active',
    allowedTransitions: ['in-review', 'changes-requested', 'rejected'],
    permissions: ['reviewer', 'approver'],
    businessRules: ['completeness-check', 'initial-validation'],
    slaHours: 24,
    escalationRequired: false,
    auditLevel: 'standard',
    notificationRules: ['reviewers', 'approvers'],
    workflowStage: 'review-queue',
    localization: {
      'en-US': 'Submitted',
      'es-ES': 'Enviado',
      'fr-FR': 'Soumis',
      'de-DE': 'Eingereicht'
    }
  },
  'in-review': {
    color: '#6f42c1',
    bgColor: '#e7d9f5',
    label: 'In Review',
    icon: '👁️',
    level: 3,
    category: 'active',
    allowedTransitions: ['approved', 'changes-requested', 'rejected', 'escalated'],
    permissions: ['reviewer', 'approver'],
    businessRules: ['technical-review', 'compliance-check', 'risk-assessment'],
    slaHours: 72,
    escalationRequired: false,
    auditLevel: 'detailed',
    notificationRules: ['reviewers', 'stakeholders'],
    workflowStage: 'evaluation',
    localization: {
      'en-US': 'In Review',
      'es-ES': 'En Revisión',
      'fr-FR': 'En Révision',
      'de-DE': 'In Überprüfung'
    }
  },
  'changes-requested': {
    color: '#ffc107',
    bgColor: '#fff3cd',
    label: 'Changes Requested',
    icon: '📝',
    level: 2,
    category: 'pending-action',
    allowedTransitions: ['submitted', 'draft', 'withdrawn'],
    permissions: ['author', 'editor'],
    businessRules: ['change-tracking'],
    slaHours: 120,
    escalationRequired: true,
    auditLevel: 'detailed',
    notificationRules: ['author', 'requestor'],
    workflowStage: 'revision',
    localization: {
      'en-US': 'Changes Requested',
      'es-ES': 'Cambios Solicitados',
      'fr-FR': 'Modifications Demandées',
      'de-DE': 'Änderungen Angefordert'
    }
  },
  escalated: {
    color: '#fd7e14',
    bgColor: '#ffe5cc',
    label: 'Escalated',
    icon: '🚨',
    level: 4,
    category: 'escalation',
    allowedTransitions: ['approved', 'rejected', 'changes-requested'],
    permissions: ['senior-approver', 'manager'],
    businessRules: ['financial-approval', 'risk-assessment', 'compliance-check'],
    slaHours: 48,
    escalationRequired: true,
    auditLevel: 'comprehensive',
    notificationRules: ['senior-management', 'stakeholders'],
    workflowStage: 'escalation',
    localization: {
      'en-US': 'Escalated',
      'es-ES': 'Escalado',
      'fr-FR': 'Escaladé',
      'de-DE': 'Eskaliert'
    }
  },
  approved: {
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'Approved',
    icon: '✓',
    level: 5,
    category: 'terminal-success',
    allowedTransitions: ['implementation', 'archived'],
    permissions: ['approver', 'senior-approver'],
    businessRules: ['final-validation', 'approval-authority'],
    slaHours: null,
    escalationRequired: false,
    auditLevel: 'comprehensive',
    notificationRules: ['all-stakeholders', 'implementation-team'],
    workflowStage: 'approved',
    localization: {
      'en-US': 'Approved',
      'es-ES': 'Aprobado',
      'fr-FR': 'Approuvé',
      'de-DE': 'Genehmigt'
    }
  },
  rejected: {
    color: '#dc3545',
    bgColor: '#f8d7da',
    label: 'Rejected',
    icon: '✗',
    level: 5,
    category: 'terminal-failure',
    allowedTransitions: ['draft', 'archived'],
    permissions: ['approver', 'senior-approver'],
    businessRules: ['rejection-reasoning'],
    slaHours: null,
    escalationRequired: false,
    auditLevel: 'comprehensive',
    notificationRules: ['author', 'stakeholders'],
    workflowStage: 'rejected',
    localization: {
      'en-US': 'Rejected',
      'es-ES': 'Rechazado',
      'fr-FR': 'Rejeté',
      'de-DE': 'Abgelehnt'
    }
  },
  implementation: {
    color: '#198754',
    bgColor: '#badbcc',
    label: 'Implementation',
    icon: '🚀',
    level: 6,
    category: 'active',
    allowedTransitions: ['completed', 'on-hold', 'issues-identified'],
    permissions: ['implementation-team', 'project-manager'],
    businessRules: ['implementation-tracking', 'milestone-validation'],
    slaHours: null,
    escalationRequired: false,
    auditLevel: 'standard',
    notificationRules: ['stakeholders', 'project-team'],
    workflowStage: 'execution',
    localization: {
      'en-US': 'Implementation',
      'es-ES': 'Implementación',
      'fr-FR': 'Mise en Œuvre',
      'de-DE': 'Umsetzung'
    }
  },
  completed: {
    color: '#20c997',
    bgColor: '#d3f9d8',
    label: 'Completed',
    icon: '🏁',
    level: 7,
    category: 'terminal-success',
    allowedTransitions: ['archived'],
    permissions: ['project-manager', 'stakeholder'],
    businessRules: ['completion-validation', 'success-metrics'],
    slaHours: null,
    escalationRequired: false,
    auditLevel: 'comprehensive',
    notificationRules: ['all-stakeholders'],
    workflowStage: 'completion',
    localization: {
      'en-US': 'Completed',
      'es-ES': 'Completado',
      'fr-FR': 'Terminé',
      'de-DE': 'Abgeschlossen'
    }
  },
  archived: {
    color: '#6c757d',
    bgColor: '#e9ecef',
    label: 'Archived',
    icon: '📦',
    level: 8,
    category: 'terminal-archived',
    allowedTransitions: [],
    permissions: ['archivist', 'admin'],
    businessRules: ['archival-compliance'],
    slaHours: null,
    escalationRequired: false,
    auditLevel: 'basic',
    notificationRules: [],
    workflowStage: 'archived',
    localization: {
      'en-US': 'Archived',
      'es-ES': 'Archivado',
      'fr-FR': 'Archivé',
      'de-DE': 'Archiviert'
    }
  },
  pending: {
    color: '#6c757d',
    bgColor: '#e9ecef',
    label: 'Pending',
    icon: '⏳',
    level: 0,
    category: 'waiting',
    allowedTransitions: ['submitted', 'draft', 'cancelled'],
    permissions: ['author', 'reviewer'],
    businessRules: ['prerequisite-check'],
    slaHours: 168, // 1 week
    escalationRequired: true,
    auditLevel: 'basic',
    notificationRules: ['author'],
    workflowStage: 'waiting',
    localization: {
      'en-US': 'Pending',
      'es-ES': 'Pendiente',
      'fr-FR': 'En Attente',
      'de-DE': 'Ausstehend'
    }
  }
};

// Enhanced Priority Configurations with Intelligence
const priorityConfig = {
  critical: {
    color: '#dc3545',
    bgColor: '#f8d7da',
    label: 'Critical',
    level: 4,
    icon: '🚨',
    slaMultiplier: 0.25, // 25% of normal SLA
    escalationThresholdHours: 2,
    requiredApprovalLevel: 'senior-management',
    notificationFrequency: 'immediate',
    businessImpact: 'severe',
    riskCategory: 'high',
    autoEscalate: true,
    weekendProcessing: true,
    afterHoursProcessing: true,
    complianceTracking: true,
    executiveVisibility: true,
    localization: {
      'en-US': 'Critical',
      'es-ES': 'Crítico',
      'fr-FR': 'Critique',
      'de-DE': 'Kritisch'
    }
  },
  high: {
    color: '#fd7e14',
    bgColor: '#ffe5cc',
    label: 'High',
    level: 3,
    icon: '⚠️',
    slaMultiplier: 0.5, // 50% of normal SLA
    escalationThresholdHours: 8,
    requiredApprovalLevel: 'management',
    notificationFrequency: 'hourly',
    businessImpact: 'significant',
    riskCategory: 'medium-high',
    autoEscalate: true,
    weekendProcessing: false,
    afterHoursProcessing: true,
    complianceTracking: true,
    executiveVisibility: false,
    localization: {
      'en-US': 'High',
      'es-ES': 'Alto',
      'fr-FR': 'Élevé',
      'de-DE': 'Hoch'
    }
  },
  medium: {
    color: '#ffc107',
    bgColor: '#fff3cd',
    label: 'Medium',
    level: 2,
    icon: '⚡',
    slaMultiplier: 1.0, // Normal SLA
    escalationThresholdHours: 24,
    requiredApprovalLevel: 'supervisor',
    notificationFrequency: 'daily',
    businessImpact: 'moderate',
    riskCategory: 'medium',
    autoEscalate: false,
    weekendProcessing: false,
    afterHoursProcessing: false,
    complianceTracking: false,
    executiveVisibility: false,
    localization: {
      'en-US': 'Medium',
      'es-ES': 'Medio',
      'fr-FR': 'Moyen',
      'de-DE': 'Mittel'
    }
  },
  low: {
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'Low',
    level: 1,
    icon: '✓',
    slaMultiplier: 2.0, // 200% of normal SLA
    escalationThresholdHours: 168, // 1 week
    requiredApprovalLevel: 'standard',
    notificationFrequency: 'weekly',
    businessImpact: 'minimal',
    riskCategory: 'low',
    autoEscalate: false,
    weekendProcessing: false,
    afterHoursProcessing: false,
    complianceTracking: false,
    executiveVisibility: false,
    localization: {
      'en-US': 'Low',
      'es-ES': 'Bajo',
      'fr-FR': 'Bas',
      'de-DE': 'Niedrig'
    }
  },
  urgent: {
    color: '#e83e8c',
    bgColor: '#f8d7e4',
    label: 'Urgent',
    level: 5,
    icon: '🔥',
    slaMultiplier: 0.1, // 10% of normal SLA
    escalationThresholdHours: 1,
    requiredApprovalLevel: 'executive',
    notificationFrequency: 'real-time',
    businessImpact: 'critical',
    riskCategory: 'extreme',
    autoEscalate: true,
    weekendProcessing: true,
    afterHoursProcessing: true,
    complianceTracking: true,
    executiveVisibility: true,
    localization: {
      'en-US': 'Urgent',
      'es-ES': 'Urgente',
      'fr-FR': 'Urgent',
      'de-DE': 'Dringend'
    }
  }
};

// Advanced Severity Configurations with Risk Management
const severityConfig = {
  critical: {
    color: '#dc3545',
    bgColor: '#f8d7da',
    label: 'Critical',
    level: 5,
    icon: '🚨',
    riskScore: 0.9,
    impactRadius: 'organization-wide',
    recoveryTime: '< 1 hour',
    notificationLevel: 'all-stakeholders',
    escalationRequired: true,
    auditRequired: true,
    businessContinuity: 'immediate-action',
    complianceImplication: 'high',
    financialImpact: 'severe',
    reputationalRisk: 'high',
    regulatoryRisk: 'high',
    localization: {
      'en-US': 'Critical',
      'es-ES': 'Crítico',
      'fr-FR': 'Critique',
      'de-DE': 'Kritisch'
    }
  },
  major: {
    color: '#fd7e14',
    bgColor: '#ffe5cc',
    label: 'Major',
    level: 4,
    icon: '⚠️',
    riskScore: 0.7,
    impactRadius: 'department-wide',
    recoveryTime: '< 4 hours',
    notificationLevel: 'management',
    escalationRequired: true,
    auditRequired: true,
    businessContinuity: 'urgent-response',
    complianceImplication: 'medium',
    financialImpact: 'significant',
    reputationalRisk: 'medium',
    regulatoryRisk: 'medium',
    localization: {
      'en-US': 'Major',
      'es-ES': 'Mayor',
      'fr-FR': 'Majeur',
      'de-DE': 'Schwerwiegend'
    }
  },
  warning: {
    color: '#ffc107',
    bgColor: '#fff3cd',
    label: 'Warning',
    level: 3,
    icon: '⚡',
    riskScore: 0.5,
    impactRadius: 'team-level',
    recoveryTime: '< 24 hours',
    notificationLevel: 'supervisors',
    escalationRequired: false,
    auditRequired: false,
    businessContinuity: 'scheduled-response',
    complianceImplication: 'low',
    financialImpact: 'moderate',
    reputationalRisk: 'low',
    regulatoryRisk: 'low',
    localization: {
      'en-US': 'Warning',
      'es-ES': 'Advertencia',
      'fr-FR': 'Avertissement',
      'de-DE': 'Warnung'
    }
  },
  info: {
    color: '#0dcaf0',
    bgColor: '#cff4fc',
    label: 'Info',
    level: 2,
    icon: 'ℹ️',
    riskScore: 0.2,
    impactRadius: 'individual',
    recoveryTime: 'none-required',
    notificationLevel: 'stakeholders',
    escalationRequired: false,
    auditRequired: false,
    businessContinuity: 'informational',
    complianceImplication: 'none',
    financialImpact: 'minimal',
    reputationalRisk: 'none',
    regulatoryRisk: 'none',
    localization: {
      'en-US': 'Info',
      'es-ES': 'Información',
      'fr-FR': 'Information',
      'de-DE': 'Information'
    }
  },
  minor: {
    color: '#6c757d',
    bgColor: '#e9ecef',
    label: 'Minor',
    level: 1,
    icon: '•',
    riskScore: 0.1,
    impactRadius: 'local',
    recoveryTime: 'none-required',
    notificationLevel: 'none',
    escalationRequired: false,
    auditRequired: false,
    businessContinuity: 'none-required',
    complianceImplication: 'none',
    financialImpact: 'none',
    reputationalRisk: 'none',
    regulatoryRisk: 'none',
    localization: {
      'en-US': 'Minor',
      'es-ES': 'Menor',
      'fr-FR': 'Mineur',
      'de-DE': 'Gering'
    }
  }
};

// Advanced Timeline Event Categories with Process Intelligence
const categoryConfig = {
  planning: {
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    label: 'Planning',
    icon: '📋',
    phase: 'pre-procurement',
    duration: 'weeks',
    dependencies: [],
    criticalPath: false,
    resourceIntensive: true,
    stakeholderInvolvement: 'high',
    riskLevel: 'medium',
    complianceRequired: true,
    approvalGates: ['requirements-approval'],
    deliverables: ['requirements-document', 'procurement-plan'],
    kpis: ['planning-completion-time', 'requirements-quality'],
    localization: {
      'en-US': 'Planning',
      'es-ES': 'Planificación',
      'fr-FR': 'Planification',
      'de-DE': 'Planung'
    }
  },
  template: {
    color: '#6f42c1',
    bgColor: '#e7d9f5',
    label: 'Template',
    icon: '📑',
    phase: 'preparation',
    duration: 'days',
    dependencies: ['planning'],
    criticalPath: false,
    resourceIntensive: false,
    stakeholderInvolvement: 'medium',
    riskLevel: 'low',
    complianceRequired: true,
    approvalGates: ['template-approval'],
    deliverables: ['rfq-template', 'evaluation-criteria'],
    kpis: ['template-completion-time', 'template-quality'],
    localization: {
      'en-US': 'Template',
      'es-ES': 'Plantilla',
      'fr-FR': 'Modèle',
      'de-DE': 'Vorlage'
    }
  },
  rfq: {
    color: '#20c997',
    bgColor: '#d3f9d8',
    label: 'RFQ',
    icon: '📨',
    phase: 'solicitation',
    duration: 'weeks',
    dependencies: ['template'],
    criticalPath: true,
    resourceIntensive: true,
    stakeholderInvolvement: 'high',
    riskLevel: 'medium',
    complianceRequired: true,
    approvalGates: ['rfq-approval', 'publication-approval'],
    deliverables: ['rfq-document', 'vendor-communications'],
    kpis: ['rfq-response-rate', 'clarification-volume'],
    localization: {
      'en-US': 'RFQ',
      'es-ES': 'SdC', // Solicitud de Cotización
      'fr-FR': 'DdP', // Demande de Prix
      'de-DE': 'Angebotsanfrage'
    }
  },
  clarification: {
    color: '#0dcaf0',
    bgColor: '#cff4fc',
    label: 'Clarification',
    icon: '💬',
    phase: 'solicitation',
    duration: 'days',
    dependencies: ['rfq'],
    criticalPath: false,
    resourceIntensive: true,
    stakeholderInvolvement: 'high',
    riskLevel: 'low',
    complianceRequired: true,
    approvalGates: ['clarification-approval'],
    deliverables: ['clarification-responses', 'amended-rfq'],
    kpis: ['clarification-response-time', 'vendor-satisfaction'],
    localization: {
      'en-US': 'Clarification',
      'es-ES': 'Aclaración',
      'fr-FR': 'Clarification',
      'de-DE': 'Klärung'
    }
  },
  submission: {
    color: '#fd7e14',
    bgColor: '#ffe5cc',
    label: 'Submission',
    icon: '📤',
    phase: 'response',
    duration: 'weeks',
    dependencies: ['rfq', 'clarification'],
    criticalPath: true,
    resourceIntensive: false,
    stakeholderInvolvement: 'low',
    riskLevel: 'high',
    complianceRequired: true,
    approvalGates: ['submission-verification'],
    deliverables: ['vendor-proposals', 'submission-log'],
    kpis: ['submission-rate', 'submission-completeness'],
    localization: {
      'en-US': 'Submission',
      'es-ES': 'Presentación',
      'fr-FR': 'Soumission',
      'de-DE': 'Einreichung'
    }
  },
  evaluation: {
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    label: 'Evaluation',
    icon: '📊',
    phase: 'evaluation',
    duration: 'weeks',
    dependencies: ['submission'],
    criticalPath: true,
    resourceIntensive: true,
    stakeholderInvolvement: 'high',
    riskLevel: 'high',
    complianceRequired: true,
    approvalGates: ['evaluation-methodology', 'evaluation-results'],
    deliverables: ['evaluation-report', 'scoring-matrix'],
    kpis: ['evaluation-accuracy', 'evaluation-time'],
    localization: {
      'en-US': 'Evaluation',
      'es-ES': 'Evaluación',
      'fr-FR': 'Évaluation',
      'de-DE': 'Bewertung'
    }
  },
  approval: {
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'Approval',
    icon: '✓',
    phase: 'approval',
    duration: 'days',
    dependencies: ['evaluation'],
    criticalPath: true,
    resourceIntensive: false,
    stakeholderInvolvement: 'high',
    riskLevel: 'medium',
    complianceRequired: true,
    approvalGates: ['final-approval'],
    deliverables: ['approval-decision', 'award-justification'],
    kpis: ['approval-time', 'decision-quality'],
    localization: {
      'en-US': 'Approval',
      'es-ES': 'Aprobación',
      'fr-FR': 'Approbation',
      'de-DE': 'Genehmigung'
    }
  },
  award: {
    color: '#198754',
    bgColor: '#badbcc',
    label: 'Award',
    icon: '🏆',
    phase: 'award',
    duration: 'days',
    dependencies: ['approval'],
    criticalPath: true,
    resourceIntensive: true,
    stakeholderInvolvement: 'high',
    riskLevel: 'low',
    complianceRequired: true,
    approvalGates: ['award-notification'],
    deliverables: ['award-letter', 'contract-initiation'],
    kpis: ['award-notification-time', 'vendor-satisfaction'],
    localization: {
      'en-US': 'Award',
      'es-ES': 'Adjudicación',
      'fr-FR': 'Attribution',
      'de-DE': 'Zuschlag'
    }
  }
};

// Enhanced Document Types with Metadata and Intelligence
const documentTypeConfig = {
  rfq: {
    label: 'Request for Quotation',
    icon: '📨',
    color: '#20c997',
    category: 'procurement-document',
    requiredFields: ['requirements', 'timeline', 'evaluation-criteria'],
    optionalFields: ['budget-range', 'preferred-vendors'],
    approvalRequired: true,
    versionControlled: true,
    auditTrail: true,
    templateAvailable: true,
    digitalSignature: true,
    complianceStandard: ['ISO-9001', 'procurement-policy'],
    retentionPeriod: '7-years',
    accessLevel: 'internal',
    localization: {
      'en-US': 'Request for Quotation',
      'es-ES': 'Solicitud de Cotización',
      'fr-FR': 'Demande de Prix',
      'de-DE': 'Angebotsanfrage'
    }
  },
  submission: {
    label: 'Supplier Submission',
    icon: '📤',
    color: '#fd7e14',
    category: 'vendor-document',
    requiredFields: ['proposal', 'pricing', 'company-info'],
    optionalFields: ['references', 'certifications', 'samples'],
    approvalRequired: false,
    versionControlled: true,
    auditTrail: true,
    templateAvailable: false,
    digitalSignature: true,
    complianceStandard: ['vendor-requirements'],
    retentionPeriod: '5-years',
    accessLevel: 'restricted',
    localization: {
      'en-US': 'Supplier Submission',
      'es-ES': 'Presentación de Proveedor',
      'fr-FR': 'Soumission Fournisseur',
      'de-DE': 'Lieferantenvorlage'
    }
  },
  evaluation: {
    label: 'Evaluation Report',
    icon: '📊',
    color: '#0d6efd',
    category: 'analysis-document',
    requiredFields: ['methodology', 'scoring', 'recommendations'],
    optionalFields: ['risk-assessment', 'cost-analysis'],
    approvalRequired: true,
    versionControlled: true,
    auditTrail: true,
    templateAvailable: true,
    digitalSignature: true,
    complianceStandard: ['evaluation-standards', 'ISO-9001'],
    retentionPeriod: '10-years',
    accessLevel: 'internal',
    localization: {
      'en-US': 'Evaluation Report',
      'es-ES': 'Informe de Evaluación',
      'fr-FR': 'Rapport d\'Évaluation',
      'de-DE': 'Bewertungsbericht'
    }
  },
  approval: {
    label: 'Approval Document',
    icon: '✓',
    color: '#28a745',
    category: 'governance-document',
    requiredFields: ['decision', 'justification', 'approver-signature'],
    optionalFields: ['conditions', 'escalation-notes'],
    approvalRequired: false,
    versionControlled: true,
    auditTrail: true,
    templateAvailable: true,
    digitalSignature: true,
    complianceStandard: ['SOX', 'governance-policy'],
    retentionPeriod: 'permanent',
    accessLevel: 'controlled',
    localization: {
      'en-US': 'Approval Document',
      'es-ES': 'Documento de Aprobación',
      'fr-FR': 'Document d\'Approbation',
      'de-DE': 'Genehmigungsdokument'
    }
  },
  contract: {
    label: 'Contract',
    icon: '📜',
    color: '#6f42c1',
    category: 'legal-document',
    requiredFields: ['terms', 'conditions', 'signatures', 'effective-date'],
    optionalFields: ['amendments', 'attachments'],
    approvalRequired: true,
    versionControlled: true,
    auditTrail: true,
    templateAvailable: true,
    digitalSignature: true,
    complianceStandard: ['contract-law', 'company-policy'],
    retentionPeriod: 'contract-term-plus-7-years',
    accessLevel: 'confidential',
    localization: {
      'en-US': 'Contract',
      'es-ES': 'Contrato',
      'fr-FR': 'Contrat',
      'de-DE': 'Vertrag'
    }
  },
  certificate: {
    label: 'Certificate',
    icon: '🏅',
    color: '#198754',
    category: 'compliance-document',
    requiredFields: ['certification-type', 'issuer', 'validity-period'],
    optionalFields: ['renewal-requirements', 'supporting-docs'],
    approvalRequired: false,
    versionControlled: true,
    auditTrail: true,
    templateAvailable: false,
    digitalSignature: false,
    complianceStandard: ['certification-authority'],
    retentionPeriod: 'validity-plus-2-years',
    accessLevel: 'public',
    localization: {
      'en-US': 'Certificate',
      'es-ES': 'Certificado',
      'fr-FR': 'Certificat',
      'de-DE': 'Zertifikat'
    }
  },
  po: {
    label: 'Purchase Order',
    icon: '📑',
    color: '#0dcaf0',
    category: 'financial-document',
    requiredFields: ['items', 'quantities', 'prices', 'delivery-terms'],
    optionalFields: ['special-instructions', 'payment-terms'],
    approvalRequired: true,
    versionControlled: true,
    auditTrail: true,
    templateAvailable: true,
    digitalSignature: true,
    complianceStandard: ['financial-controls', 'SOX'],
    retentionPeriod: '7-years',
    accessLevel: 'internal',
    localization: {
      'en-US': 'Purchase Order',
      'es-ES': 'Orden de Compra',
      'fr-FR': 'Bon de Commande',
      'de-DE': 'Bestellung'
    }
  },
  compliance: {
    label: 'Compliance Document',
    icon: '✅',
    color: '#28a745',
    category: 'regulatory-document',
    requiredFields: ['compliance-area', 'requirements', 'evidence'],
    optionalFields: ['remediation-plan', 'review-schedule'],
    approvalRequired: true,
    versionControlled: true,
    auditTrail: true,
    templateAvailable: true,
    digitalSignature: true,
    complianceStandard: ['regulatory-requirements'],
    retentionPeriod: 'regulatory-requirement',
    accessLevel: 'controlled',
    localization: {
      'en-US': 'Compliance Document',
      'es-ES': 'Documento de Cumplimiento',
      'fr-FR': 'Document de Conformité',
      'de-DE': 'Compliance-Dokument'
    }
  }
};

// Enhanced Scoring Criteria with Multi-Dimensional Analysis
const scoringCriteriaConfig = [
  {
    id: 'technical',
    label: 'Technical Capability',
    weight: 35,
    description: 'Ability to meet technical specifications and requirements',
    category: 'capability',
    subCriteria: [
      { id: 'tech-expertise', label: 'Technical Expertise', weight: 40 },
      { id: 'solution-quality', label: 'Solution Quality', weight: 35 },
      { id: 'innovation', label: 'Innovation Factor', weight: 25 }
    ],
    scoringMethod: 'weighted-average',
    validationRules: ['min-threshold-70'],
    benchmarkStandards: ['industry-best-practice'],
    riskFactors: ['technical-complexity', 'implementation-difficulty'],
    localization: {
      'en-US': 'Technical Capability',
      'es-ES': 'Capacidad Técnica',
      'fr-FR': 'Capacité Technique',
      'de-DE': 'Technische Fähigkeit'
    }
  },
  {
    id: 'price',
    label: 'Price Competitiveness',
    weight: 30,
    description: 'Total cost of ownership and value proposition',
    category: 'financial',
    subCriteria: [
      { id: 'initial-cost', label: 'Initial Cost', weight: 50 },
      { id: 'ongoing-costs', label: 'Ongoing Costs', weight: 30 },
      { id: 'value-added', label: 'Value-Added Services', weight: 20 }
    ],
    scoringMethod: 'cost-benefit-analysis',
    validationRules: ['budget-compliance'],
    benchmarkStandards: ['market-rates'],
    riskFactors: ['cost-escalation', 'hidden-costs'],
    localization: {
      'en-US': 'Price Competitiveness',
      'es-ES': 'Competitividad de Precio',
      'fr-FR': 'Compétitivité Prix',
      'de-DE': 'Preiswettbewerbsfähigkeit'
    }
  },
  {
    id: 'experience',
    label: 'Experience & Track Record',
    weight: 20,
    description: 'Previous experience and proven track record',
    category: 'credibility',
    subCriteria: [
      { id: 'relevant-experience', label: 'Relevant Experience', weight: 50 },
      { id: 'past-performance', label: 'Past Performance', weight: 30 },
      { id: 'references', label: 'Client References', weight: 20 }
    ],
    scoringMethod: 'performance-index',
    validationRules: ['reference-verification'],
    benchmarkStandards: ['industry-experience'],
    riskFactors: ['performance-history', 'client-satisfaction'],
    localization: {
      'en-US': 'Experience & Track Record',
      'es-ES': 'Experiencia y Historial',
      'fr-FR': 'Expérience et Références',
      'de-DE': 'Erfahrung & Erfolgsbilanz'
    }
  },
  {
    id: 'compliance',
    label: 'Compliance & Governance',
    weight: 15,
    description: 'Regulatory compliance and governance adherence',
    category: 'governance',
    subCriteria: [
      { id: 'regulatory-compliance', label: 'Regulatory Compliance', weight: 60 },
      { id: 'quality-certifications', label: 'Quality Certifications', weight: 25 },
      { id: 'governance-practices', label: 'Governance Practices', weight: 15 }
    ],
    scoringMethod: 'compliance-checklist',
    validationRules: ['mandatory-compliance'],
    benchmarkStandards: ['regulatory-requirements'],
    riskFactors: ['compliance-breach', 'regulatory-changes'],
    localization: {
      'en-US': 'Compliance & Governance',
      'es-ES': 'Cumplimiento y Gobernanza',
      'fr-FR': 'Conformité et Gouvernance',
      'de-DE': 'Compliance & Governance'
    }
  }
];

// Advanced Score Rating System with Predictive Analytics
const scoreRatingConfig = {
  95: { 
    label: 'Outstanding', 
    color: '#198754', 
    grade: 'A+',
    percentile: 99,
    riskLevel: 'very-low',
    confidenceLevel: 'very-high',
    benchmarkStatus: 'industry-leader',
    recommendationLevel: 'strongly-recommended'
  },
  90: { 
    label: 'Excellent', 
    color: '#28a745', 
    grade: 'A',
    percentile: 95,
    riskLevel: 'low',
    confidenceLevel: 'high',
    benchmarkStatus: 'above-industry',
    recommendationLevel: 'highly-recommended'
  },
  80: { 
    label: 'Very Good', 
    color: '#20c997', 
    grade: 'B+',
    percentile: 80,
    riskLevel: 'low',
    confidenceLevel: 'good',
    benchmarkStatus: 'industry-standard',
    recommendationLevel: 'recommended'
  },
  70: { 
    label: 'Good', 
    color: '#0dcaf0', 
    grade: 'B',
    percentile: 65,
    riskLevel: 'medium',
    confidenceLevel: 'acceptable',
    benchmarkStatus: 'meets-requirements',
    recommendationLevel: 'acceptable'
  },
  60: { 
    label: 'Fair', 
    color: '#ffc107', 
    grade: 'C',
    percentile: 40,
    riskLevel: 'medium-high',
    confidenceLevel: 'marginal',
    benchmarkStatus: 'below-industry',
    recommendationLevel: 'conditional'
  },
  50: { 
    label: 'Poor', 
    color: '#fd7e14', 
    grade: 'D',
    percentile: 20,
    riskLevel: 'high',
    confidenceLevel: 'low',
    benchmarkStatus: 'below-standard',
    recommendationLevel: 'not-recommended'
  },
  0: { 
    label: 'Very Poor', 
    color: '#dc3545', 
    grade: 'F',
    percentile: 5,
    riskLevel: 'very-high',
    confidenceLevel: 'very-low',
    benchmarkStatus: 'unacceptable',
    recommendationLevel: 'rejected'
  }
};

// Status Engine Helper Methods
statusEngine.validateSOXCompliance = (context) => {
  const soxRequirements = {
    financialControls: context.financialControls || false,
    auditTrail: context.auditTrail || false,
    segregationOfDuties: context.segregationOfDuties || false,
    managementApproval: context.managementApproval || false
  };
  
  const compliant = Object.values(soxRequirements).every(req => req === true);
  return { 
    compliant, 
    requirements: soxRequirements,
    missingControls: Object.entries(soxRequirements)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key)
  };
};

statusEngine.validateGDPRCompliance = (context) => {
  const gdprRequirements = {
    dataProcessingLegal: context.dataProcessingLegal || false,
    consentObtained: context.consentObtained || false,
    dataProtectionImpactAssessment: context.dataProtectionImpactAssessment || false,
    dataRetentionPolicy: context.dataRetentionPolicy || false
  };
  
  const compliant = Object.values(gdprRequirements).every(req => req === true);
  return { 
    compliant, 
    requirements: gdprRequirements,
    missingRequirements: Object.entries(gdprRequirements)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key)
  };
};

statusEngine.validateISOCompliance = (context) => {
  const isoRequirements = {
    qualityManagement: context.qualityManagement || false,
    documentControl: context.documentControl || false,
    processApproach: context.processApproach || false,
    continualImprovement: context.continualImprovement || false
  };
  
  const compliant = Object.values(isoRequirements).every(req => req === true);
  return { 
    compliant, 
    requirements: isoRequirements,
    improvementAreas: Object.entries(isoRequirements)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key)
  };
};

statusEngine.calculateOverallRisk = (factors) => {
  const riskWeights = {
    supplier: 0.3,
    financial: 0.25,
    technical: 0.25,
    compliance: 0.2
  };
  
  const riskValues = {
    low: 0.2,
    medium: 0.5,
    high: 0.8
  };
  
  let totalRisk = 0;
  for (const [factor, level] of Object.entries(factors)) {
    const weight = riskWeights[factor] || 0.25;
    const value = riskValues[level] || 0.5;
    totalRisk += weight * value;
  }
  
  return Math.min(1.0, Math.max(0.0, totalRisk));
};

statusEngine.updateMetrics = (operation, duration) => {
  this.metrics.transitionsCount++;
  
  // Update average transition time
  const currentAvg = this.metrics.averageTransitionTime || 0;
  const count = this.metrics.transitionsCount;
  this.metrics.averageTransitionTime = ((currentAvg * (count - 1)) + duration) / count;
  
  // Update error rate
  const totalOperations = this.metrics.transitionsCount + this.metrics.validationErrors;
  this.metrics.errorRate = (this.metrics.validationErrors / totalOperations) * 100;
  
  this.emit('metricsUpdated', {
    operation,
    duration,
    totalTransitions: count,
    errorRate: this.metrics.errorRate
  });
};

statusEngine.collectMetrics = () => {
  const now = Date.now();
  const timeSinceReset = now - this.metrics.lastResetTime;
  
  const metrics = {
    ...this.metrics,
    uptime: timeSinceReset,
    memoryUsage: process.memoryUsage(),
    cacheSize: this.cache.size,
    activeWorkflows: this.activeWorkflows.size,
    businessRulesCount: this.businessRules.size
  };
  
  this.emit('metricsCollected', metrics);
  return metrics;
};

statusEngine.getStatistics = () => {
  return {
    ...statusEngine.collectMetrics(),
    status: 'healthy',
    lastUpdated: new Date()
  };
};

statusEngine.getHealthStatus = () => {
  const metrics = statusEngine.collectMetrics();
  const isHealthy = metrics.errorRate < 5 && metrics.cacheSize < 10000;
  
  return {
    status: isHealthy ? 'healthy' : 'degraded',
    errorRate: metrics.errorRate,
    performance: {
      averageTransitionTime: metrics.averageTransitionTime,
      cacheHitRate: (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
    },
    resources: {
      memoryUsage: metrics.memoryUsage,
      cacheSize: metrics.cacheSize,
      activeWorkflows: metrics.activeWorkflows
    }
  };
};

/**
 * Enhanced Status Configuration Functions with Advanced Intelligence
 * Provides comprehensive status management with workflow validation and business rules
 */

/**
 * Get status configuration with enhanced validation
 * @param {string} status - Status key
 * @param {object} options - Additional options for enhanced features
 * @returns {object} Enhanced status config
 */
const getStatusConfig = (status, options = {}) => {
  const startTime = Date.now();
  const cacheKey = `status_${status}_${JSON.stringify(options)}`;
  
  try {
    // Check cache first
    if (statusEngine.options.enableCaching && statusEngine.cache.has(cacheKey)) {
      statusEngine.metrics.cacheHits++;
      return statusEngine.cache.get(cacheKey);
    }
    
    statusEngine.metrics.cacheMisses++;
    
    const baseConfig = statusConfig[status] || statusConfig.pending;
    const locale = options.locale || 'en-US';
    
    // Enhanced configuration with localization and business rules
    const enhancedConfig = {
      ...baseConfig,
      displayLabel: baseConfig.localization?.[locale] || baseConfig.label,
      isTerminal: baseConfig.category?.includes('terminal'),
      canTransition: (toStatus) => baseConfig.allowedTransitions?.includes(toStatus) || false,
      getSLAInfo: () => ({
        hours: baseConfig.slaHours,
        escalationThreshold: baseConfig.escalationRequired,
        businessHoursOnly: !baseConfig.afterHoursProcessing
      }),
      getBusinessRules: () => baseConfig.businessRules || [],
      getNotificationRules: () => baseConfig.notificationRules || [],
      metadata: {
        level: baseConfig.level,
        category: baseConfig.category,
        workflowStage: baseConfig.workflowStage,
        auditLevel: baseConfig.auditLevel,
        permissions: baseConfig.permissions || []
      }
    };
    
    // Cache the result
    if (statusEngine.options.enableCaching) {
      statusEngine.cache.set(cacheKey, enhancedConfig);
      setTimeout(() => statusEngine.cache.delete(cacheKey), statusEngine.options.cacheTimeout);
    }
    
    const duration = Date.now() - startTime;
    statusEngine.updateMetrics('getStatusConfig', duration);
    
    return enhancedConfig;
    
  } catch (error) {
    statusEngine.metrics.validationErrors++;
    statusEngine.emit('error', { type: 'getStatusConfig', error: error.message });
    return statusConfig.pending;
  }
};

/**
 * Validate status transition with business rules
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {object} context - Transition context
 * @returns {object} Validation result
 */
const validateStatusTransition = async (fromStatus, toStatus, context = {}) => {
  const startTime = Date.now();
  
  try {
    const fromConfig = statusConfig[fromStatus];
    const toConfig = statusConfig[toStatus];
    
    if (!fromConfig || !toConfig) {
      return {
        valid: false,
        error: 'Invalid status provided',
        code: 'INVALID_STATUS'
      };
    }
    
    // Check if transition is allowed
    if (!fromConfig.allowedTransitions?.includes(toStatus)) {
      return {
        valid: false,
        error: `Transition from ${fromStatus} to ${toStatus} not allowed`,
        code: 'INVALID_TRANSITION',
        allowedTransitions: fromConfig.allowedTransitions
      };
    }
    
    // Evaluate business rules
    const businessRuleResults = statusEngine.evaluateBusinessRules(context);
    
    // Check permissions
    const hasPermission = context.userPermissions?.some(permission => 
      toConfig.permissions?.includes(permission)
    );
    
    if (!hasPermission) {
      return {
        valid: false,
        error: 'Insufficient permissions for status transition',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: toConfig.permissions
      };
    }
    
    // Record transition in history
    const transitionRecord = {
      id: crypto.randomUUID(),
      fromStatus,
      toStatus,
      timestamp: new Date(),
      context: { ...context, businessRules: businessRuleResults },
      duration: Date.now() - startTime
    };
    
    statusEngine.transitionHistory.unshift(transitionRecord);
    if (statusEngine.transitionHistory.length > statusEngine.options.maxTransitionHistory) {
      statusEngine.transitionHistory.pop();
    }
    
    statusEngine.emit('statusTransition', transitionRecord);
    
    return {
      valid: true,
      transitionId: transitionRecord.id,
      businessRules: businessRuleResults,
      slaInfo: toConfig.getSLAInfo?.(),
      notificationRules: toConfig.getNotificationRules?.()
    };
    
  } catch (error) {
    statusEngine.metrics.validationErrors++;
    statusEngine.emit('error', { type: 'validateStatusTransition', error: error.message });
    
    return {
      valid: false,
      error: error.message,
      code: 'VALIDATION_ERROR'
    };
  }
};

/**
 * Get priority configuration with enhanced risk assessment
 * @param {string} priority - Priority key
 * @param {object} options - Enhancement options
 * @returns {object} Enhanced priority config
 */
const getPriorityConfig = (priority, options = {}) => {
  const baseConfig = priorityConfig[priority] || priorityConfig.low;
  const locale = options.locale || 'en-US';
  
  return {
    ...baseConfig,
    displayLabel: baseConfig.localization?.[locale] || baseConfig.label,
    getSLAMultiplier: () => baseConfig.slaMultiplier,
    getEscalationThreshold: () => baseConfig.escalationThresholdHours,
    requiresExecutiveAttention: () => baseConfig.executiveVisibility,
    calculateSLA: (baseSLAHours) => Math.floor(baseSLAHours * baseConfig.slaMultiplier),
    getProcessingRequirements: () => ({
      afterHours: baseConfig.afterHoursProcessing,
      weekends: baseConfig.weekendProcessing,
      autoEscalate: baseConfig.autoEscalate
    }),
    metadata: {
      level: baseConfig.level,
      businessImpact: baseConfig.businessImpact,
      riskCategory: baseConfig.riskCategory,
      notificationFrequency: baseConfig.notificationFrequency
    }
  };
};

/**
 * Get severity configuration with risk metrics
 * @param {string} severity - Severity key
 * @param {object} options - Enhancement options
 * @returns {object} Enhanced severity config
 */
const getSeverityConfig = (severity, options = {}) => {
  const baseConfig = severityConfig[severity] || severityConfig.info;
  const locale = options.locale || 'en-US';
  
  return {
    ...baseConfig,
    displayLabel: baseConfig.localization?.[locale] || baseConfig.label,
    getRiskScore: () => baseConfig.riskScore,
    getImpactAssessment: () => ({
      radius: baseConfig.impactRadius,
      recoveryTime: baseConfig.recoveryTime,
      businessContinuity: baseConfig.businessContinuity
    }),
    getComplianceImplications: () => ({
      level: baseConfig.complianceImplication,
      auditRequired: baseConfig.auditRequired,
      escalationRequired: baseConfig.escalationRequired
    }),
    getRiskMetrics: () => ({
      financial: baseConfig.financialImpact,
      reputational: baseConfig.reputationalRisk,
      regulatory: baseConfig.regulatoryRisk
    }),
    metadata: {
      level: baseConfig.level,
      notificationLevel: baseConfig.notificationLevel
    }
  };
};

/**
 * Get category configuration with process intelligence
 * @param {string} category - Category key
 * @param {object} options - Enhancement options
 * @returns {object} Enhanced category config
 */
const getCategoryConfig = (category, options = {}) => {
  const baseConfig = categoryConfig[category] || categoryConfig.planning;
  const locale = options.locale || 'en-US';
  
  return {
    ...baseConfig,
    displayLabel: baseConfig.localization?.[locale] || baseConfig.label,
    getPhaseInfo: () => ({
      phase: baseConfig.phase,
      duration: baseConfig.duration,
      dependencies: baseConfig.dependencies
    }),
    getResourceRequirements: () => ({
      intensive: baseConfig.resourceIntensive,
      stakeholderInvolvement: baseConfig.stakeholderInvolvement
    }),
    getRiskAssessment: () => ({
      level: baseConfig.riskLevel,
      criticalPath: baseConfig.criticalPath
    }),
    getDeliverables: () => baseConfig.deliverables || [],
    getKPIs: () => baseConfig.kpis || [],
    getApprovalGates: () => baseConfig.approvalGates || [],
    metadata: {
      complianceRequired: baseConfig.complianceRequired
    }
  };
};

/**
 * Get document type configuration with metadata
 * @param {string} type - Document type key
 * @param {object} options - Enhancement options
 * @returns {object} Enhanced document type config
 */
const getDocumentTypeConfig = (type, options = {}) => {
  const baseConfig = documentTypeConfig[type] || documentTypeConfig.submission;
  const locale = options.locale || 'en-US';
  
  return {
    ...baseConfig,
    displayLabel: baseConfig.localization?.[locale] || baseConfig.label,
    getFieldRequirements: () => ({
      required: baseConfig.requiredFields || [],
      optional: baseConfig.optionalFields || []
    }),
    getProcessingRequirements: () => ({
      approvalRequired: baseConfig.approvalRequired,
      versionControlled: baseConfig.versionControlled,
      auditTrail: baseConfig.auditTrail,
      digitalSignature: baseConfig.digitalSignature
    }),
    getComplianceInfo: () => ({
      standards: baseConfig.complianceStandard || [],
      retentionPeriod: baseConfig.retentionPeriod,
      accessLevel: baseConfig.accessLevel
    }),
    hasTemplate: () => baseConfig.templateAvailable,
    metadata: {
      category: baseConfig.category
    }
  };
};

/**
 * Get enhanced score rating with predictive analytics
 * @param {number} score - Score value (0-100)
 * @param {object} options - Enhancement options
 * @returns {object} Enhanced rating config
 */
const getScoreRating = (score, options = {}) => {
  let ratingKey;
  if (score >= 95) ratingKey = 95;
  else if (score >= 90) ratingKey = 90;
  else if (score >= 80) ratingKey = 80;
  else if (score >= 70) ratingKey = 70;
  else if (score >= 60) ratingKey = 60;
  else if (score >= 50) ratingKey = 50;
  else ratingKey = 0;
  
  const baseRating = scoreRatingConfig[ratingKey];
  
  return {
    ...baseRating,
    score: score,
    ratingKey: ratingKey,
    getPerformanceMetrics: () => ({
      percentile: baseRating.percentile,
      benchmarkStatus: baseRating.benchmarkStatus,
      confidenceLevel: baseRating.confidenceLevel
    }),
    getRiskAssessment: () => ({
      level: baseRating.riskLevel,
      recommendation: baseRating.recommendationLevel
    }),
    isAcceptable: () => score >= 60,
    isExcellent: () => score >= 90,
    requiresImprovement: () => score < 70,
    metadata: {
      grade: baseRating.grade
    }
  };
};

/**
 * Get all status options with enhanced metadata
 * @param {object} options - Filter and enhancement options
 * @returns {array} Array of enhanced status options
 */
const getAllStatusOptions = (options = {}) => {
  const { category, locale = 'en-US', includeMetadata = false } = options;
  
  return Object.entries(statusConfig)
    .filter(([_, config]) => !category || config.category === category)
    .map(([key, config]) => ({
      value: key,
      label: config.localization?.[locale] || config.label,
      color: config.color,
      icon: config.icon,
      level: config.level,
      ...(includeMetadata && {
        metadata: {
          category: config.category,
          workflowStage: config.workflowStage,
          allowedTransitions: config.allowedTransitions,
          slaHours: config.slaHours,
          escalationRequired: config.escalationRequired
        }
      })
    }))
    .sort((a, b) => a.level - b.level);
};

/**
 * Get all priority options with enhanced features
 * @param {object} options - Enhancement options
 * @returns {array} Array of enhanced priority options
 */
const getAllPriorityOptions = (options = {}) => {
  const { locale = 'en-US', includeMetadata = false } = options;
  
  return Object.entries(priorityConfig).map(([key, config]) => ({
    value: key,
    label: config.localization?.[locale] || config.label,
    level: config.level,
    color: config.color,
    icon: config.icon,
    ...(includeMetadata && {
      metadata: {
        slaMultiplier: config.slaMultiplier,
        businessImpact: config.businessImpact,
        autoEscalate: config.autoEscalate,
        executiveVisibility: config.executiveVisibility
      }
    })
  }))
  .sort((a, b) => b.level - a.level);
};

/**
 * Get all severity options with risk metrics
 * @param {object} options - Enhancement options
 * @returns {array} Array of enhanced severity options
 */
const getAllSeverityOptions = (options = {}) => {
  const { locale = 'en-US', includeMetadata = false } = options;
  
  return Object.entries(severityConfig).map(([key, config]) => ({
    value: key,
    label: config.localization?.[locale] || config.label,
    level: config.level,
    color: config.color,
    icon: config.icon,
    ...(includeMetadata && {
      metadata: {
        riskScore: config.riskScore,
        impactRadius: config.impactRadius,
        recoveryTime: config.recoveryTime,
        escalationRequired: config.escalationRequired
      }
    })
  }))
  .sort((a, b) => b.level - a.level);
};

/**
 * Get all category options with process metadata
 * @param {object} options - Enhancement options
 * @returns {array} Array of enhanced category options
 */
const getAllCategoryOptions = (options = {}) => {
  const { phase, locale = 'en-US', includeMetadata = false } = options;
  
  return Object.entries(categoryConfig)
    .filter(([_, config]) => !phase || config.phase === phase)
    .map(([key, config]) => ({
      value: key,
      label: config.localization?.[locale] || config.label,
      color: config.color,
      icon: config.icon,
      ...(includeMetadata && {
        metadata: {
          phase: config.phase,
          duration: config.duration,
          dependencies: config.dependencies,
          criticalPath: config.criticalPath,
          riskLevel: config.riskLevel
        }
      })
    }));
};

/**
 * Get workflow analysis for status progression
 * @param {array} statusHistory - Array of status changes
 * @returns {object} Workflow analysis
 */
const analyzeWorkflow = (statusHistory) => {
  if (!Array.isArray(statusHistory) || statusHistory.length === 0) {
    return { error: 'Invalid or empty status history' };
  }
  
  const analysis = {
    totalSteps: statusHistory.length,
    duration: {
      total: 0,
      byStatus: {},
      average: 0
    },
    transitions: [],
    bottlenecks: [],
    efficiency: 0,
    riskFactors: []
  };
  
  // Analyze transitions and durations
  for (let i = 1; i < statusHistory.length; i++) {
    const prev = statusHistory[i - 1];
    const current = statusHistory[i];
    const duration = new Date(current.timestamp) - new Date(prev.timestamp);
    
    analysis.transitions.push({
      from: prev.status,
      to: current.status,
      duration,
      timestamp: current.timestamp
    });
    
    analysis.duration.byStatus[prev.status] = 
      (analysis.duration.byStatus[prev.status] || 0) + duration;
  }
  
  // Calculate totals and identify bottlenecks
  analysis.duration.total = Object.values(analysis.duration.byStatus)
    .reduce((sum, duration) => sum + duration, 0);
  analysis.duration.average = analysis.duration.total / statusHistory.length;
  
  // Identify bottlenecks (statuses taking longer than 2x average)
  const avgDuration = analysis.duration.average;
  analysis.bottlenecks = Object.entries(analysis.duration.byStatus)
    .filter(([_, duration]) => duration > avgDuration * 2)
    .map(([status, duration]) => ({ status, duration, excessTime: duration - avgDuration }));
  
  // Calculate efficiency score
  const expectedDuration = statusHistory.length * 24 * 60 * 60 * 1000; // 1 day per status
  analysis.efficiency = Math.max(0, Math.min(100, 
    100 - ((analysis.duration.total - expectedDuration) / expectedDuration * 100)
  ));
  
  return analysis;
};

/**
 * Generate workflow recommendations based on analysis
 * @param {object} workflowAnalysis - Analysis from analyzeWorkflow
 * @returns {array} Array of recommendations
 */
const generateWorkflowRecommendations = (workflowAnalysis) => {
  const recommendations = [];
  
  if (workflowAnalysis.bottlenecks?.length > 0) {
    recommendations.push({
      type: 'bottleneck',
      priority: 'high',
      message: `Identified ${workflowAnalysis.bottlenecks.length} bottleneck(s) in workflow`,
      actions: workflowAnalysis.bottlenecks.map(b => 
        `Optimize ${b.status} processing (currently ${Math.round(b.excessTime / 3600000)}h above average)`
      )
    });
  }
  
  if (workflowAnalysis.efficiency < 70) {
    recommendations.push({
      type: 'efficiency',
      priority: 'medium',
      message: `Workflow efficiency is ${Math.round(workflowAnalysis.efficiency)}% - below target`,
      actions: [
        'Review approval processes for optimization opportunities',
        'Consider parallel processing where appropriate',
        'Implement automated validation steps'
      ]
    });
  }
  
  return recommendations;
};

module.exports = {
  // Core configurations
  statusConfig,
  priorityConfig,
  severityConfig,
  categoryConfig,
  documentTypeConfig,
  scoringCriteriaConfig,
  scoreRatingConfig,
  
  // Enhanced getter functions
  getStatusConfig,
  getPriorityConfig,
  getSeverityConfig,
  getCategoryConfig,
  getDocumentTypeConfig,
  getScoreRating,
  
  // Enhanced option getters
  getAllStatusOptions,
  getAllPriorityOptions,
  getAllSeverityOptions,
  getAllCategoryOptions,
  
  // Advanced workflow functions
  validateStatusTransition,
  analyzeWorkflow,
  generateWorkflowRecommendations,
  
  // Engine and utilities
  statusEngine,
  
  // Utility functions for external access
  getEngineStatistics: () => statusEngine.getStatistics(),
  getEngineHealth: () => statusEngine.getHealthStatus(),
  clearCache: () => statusEngine.cache.clear(),
  addBusinessRule: (name, rule) => statusEngine.addBusinessRule(name, rule),
  evaluateBusinessRules: (context) => statusEngine.evaluateBusinessRules(context)
};
